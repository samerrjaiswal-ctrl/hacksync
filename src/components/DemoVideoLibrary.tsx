import * as React from 'react';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Video, 
  UploadCloud, 
  Search, 
  Check, 
  Copy, 
  ExternalLink, 
  Trash2, 
  Loader2, 
  AlertCircle, 
  Info, 
  Play, 
  X, 
  Clock, 
  User, 
  HardDrive, 
  Lock, 
  Globe, 
  Share2, 
  RefreshCw, 
  Plus
} from 'lucide-react';
import type { 
  MemberData, 
  DemoVideoData, 
  GoogleDriveStatus, 
  VideoSharingAccess,
  VideoProcessingState
} from '../types';

// Persistence helpers for upload timestamps and verification states
const getPersistedUploadTime = (videoId: string): number | null => {
  try {
    const val = localStorage.getItem(`hacksync_upload_ts_${videoId}`);
    return val ? parseInt(val, 10) : null;
  } catch {
    return null;
  }
};

const setPersistedUploadTime = (videoId: string, ts: number) => {
  try {
    localStorage.setItem(`hacksync_upload_ts_${videoId}`, String(ts));
  } catch {}
};

const getPersistedVerification = (videoId: string): number | null => {
  try {
    const val = localStorage.getItem(`hacksync_verified_${videoId}`);
    return val ? parseInt(val, 10) : null;
  } catch {
    return null;
  }
};

const setPersistedVerification = (videoId: string, ts: number) => {
  try {
    localStorage.setItem(`hacksync_verified_${videoId}`, String(ts));
  } catch {}
};

const formatElapsed = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

import { 
  getGoogleDriveStatus, 
  getGoogleAuthUrl, 
  disconnectGoogleDrive, 
  fetchTeamVideos, 
  uploadDemoVideo, 
  deleteDemoVideo,
  updateVideoSharing,
  completeOAuthCallback,
  checkVideoProcessing
} from '../lib/googleDrive';

interface DemoVideoLibraryProps {
  teamId: string;
  teamName: string;
  members: MemberData[];
  currentUserId: string | null;
  isLeader: boolean;
}

export const DemoVideoLibrary: React.FC<DemoVideoLibraryProps> = ({
  teamId,
  teamName,
  currentUserId,
  isLeader
}) => {
  const [driveStatus, setDriveStatus] = useState<GoogleDriveStatus>({
    isConnected: false,
    googleEmail: null,
    isConfigured: false,
    isLeader
  });
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [videos, setVideos] = useState<DemoVideoData[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);

  // Search & Filter & Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'newest' | 'oldest'>('newest');

  // Upload Modal & State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadSharingAccess, setUploadSharingAccess] = useState<VideoSharingAccess>('restricted');
  const [updatingSharingId, setUpdatingSharingId] = useState<string | null>(null);
  const [confirmSharingChange, setConfirmSharingChange] = useState<{
    video: DemoVideoData;
    targetAccess: VideoSharingAccess;
  } | null>(null);

  // Video processing & playback readiness monitoring
  const [processingStates, setProcessingStates] = useState<Record<string, VideoProcessingState>>({});
  const inFlightChecksRef = useRef<Set<string>>(new Set());
  const processingStatesRef = useRef<Record<string, VideoProcessingState>>({});
  processingStatesRef.current = processingStates;
  const videosRef = useRef<DemoVideoData[]>([]);
  videosRef.current = videos;

  // Test Submission Link Modal
  const [testSubmissionVideo, setTestSubmissionVideo] = useState<DemoVideoData | null>(null);

  // Copy toast state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Preview Modal
  const [previewVideo, setPreviewVideo] = useState<DemoVideoData | null>(null);

  // OAuth Setup Modal (if unconfigured)
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Deleting state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Check for OAuth callback code in URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code && state) {
      // Clean query params from URL without refreshing
      window.history.replaceState({}, document.title, window.location.pathname);

      setIsConnecting(true);
      completeOAuthCallback(teamId, code, state)
        .then((res) => {
          if (res.success) {
            setToastMessage(`Google Drive connected successfully (${res.googleEmail || 'Active'})!`);
            loadStatus();
          } else {
            setToastMessage(`Google Drive connection failed: ${res.error || 'Unknown error'}`);
          }
        })
        .catch((err) => {
          setToastMessage(`Error finishing Google Drive connection: ${err.message}`);
        })
        .finally(() => {
          setIsConnecting(false);
        });
    }
  }, [teamId]);

  // 2. Load Status & Videos
  const loadStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const status = await getGoogleDriveStatus(teamId, isLeader);
      setDriveStatus(status);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const loadVideos = async (silent = false) => {
    if (!silent && videos.length === 0) {
      setIsLoadingVideos(true);
    }
    try {
      const list = await fetchTeamVideos(teamId);
      setVideos(list);

      // Initialize processing states from storage and video creation time
      const initialMap: Record<string, VideoProcessingState> = {};
      for (const v of list) {
        const verifiedAt = getPersistedVerification(v.id);
        const persistedUploadTs = getPersistedUploadTime(v.id);
        const uploadTs = persistedUploadTs || v.createdAt.getTime();
        const elapsed = Math.max(0, Math.floor((Date.now() - uploadTs) / 1000));

        if (verifiedAt) {
          initialMap[v.id] = {
            phase: 'playback_verified',
            isProcessing: false,
            isChecking: false,
            uploadFinishedAt: uploadTs,
            elapsedSeconds: elapsed,
            verifiedAt,
            message: 'Playback verified'
          };
        } else {
          // Video is unverified: start in processing state and automatically check Google Drive
          initialMap[v.id] = {
            phase: 'processing',
            isProcessing: true,
            isChecking: false,
            uploadFinishedAt: uploadTs,
            elapsedSeconds: elapsed,
            message: 'Processing video'
          };
        }
      }
      setProcessingStates(prev => ({ ...initialMap, ...prev }));
    } finally {
      setIsLoadingVideos(false);
    }
  };

  useEffect(() => {
    loadStatus();
    loadVideos();
  }, [teamId]);

  // Toast auto-hide
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Handle Google Drive Connect
  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const { authUrl, error, message } = await getGoogleAuthUrl(teamId);

      if (error === 'GOOGLE_OAUTH_NOT_CONFIGURED' || !authUrl) {
        if (message) {
          console.warn('Google Drive OAuth Notice:', message);
        }
        setIsSetupModalOpen(true);
        return;
      }

      // Redirect to official Google OAuth 2.0 flow
      window.location.href = authUrl;
    } catch (err: any) {
      setToastMessage(err.message || 'Failed to initiate Google OAuth');
      setIsSetupModalOpen(true);
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle Google Drive Disconnect
  const handleDisconnect = async () => {

    setIsDisconnecting(true);
    try {
      const res = await disconnectGoogleDrive(teamId);
      if (res.success) {
        setToastMessage('Google Drive disconnected.');
        await loadStatus();
      } else {
        setToastMessage(res.error || 'Failed to disconnect Google Drive');
      }
    } catch (err: any) {
      setToastMessage(err.message || 'Failed to disconnect');
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Handle Video File Drop / Selection
  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|mov|avi|mkv|webm)$/i)) {
      setUploadError('Please select a valid video file (.mp4, .webm, .mov, etc.)');
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
    if (!videoTitle) {
      // Auto-populate title from clean filename
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setVideoTitle(cleanName);
    }
  };

  // Execute Upload to Google Drive
  const handleStartUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !videoTitle.trim()) {
      setUploadError('Please select a video file and provide a title.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const newVideo = await uploadDemoVideo(
        teamId,
        selectedFile,
        videoTitle.trim(),
        videoDescription.trim(),
        (pct) => setUploadProgress(pct),
        isLeader ? uploadSharingAccess : 'restricted'
      );

      setUploadSuccess(true);
      const uploadTs = Date.now();
      setPersistedUploadTime(newVideo.id, uploadTs);
      setProcessingStates(prev => ({
        ...prev,
        [newVideo.id]: {
          phase: 'processing',
          isProcessing: true,
          isChecking: false,
          uploadFinishedAt: uploadTs,
          elapsedSeconds: 0,
          message: 'Processing video · 00:00 elapsed',
          error: null
        }
      }));
      setVideos(prev => [newVideo, ...prev]);
      setToastMessage(
        newVideo.sharingAccess === 'anyone_with_link'
          ? `"${newVideo.title}" uploaded with Public Submission link! Monitoring playback readiness...`
          : `"${newVideo.title}" uploaded to Google Drive! Monitoring playback readiness...`
      );

      // Reset form after short delay
      setTimeout(() => {
        setIsUploadOpen(false);
        setSelectedFile(null);
        setVideoTitle('');
        setVideoDescription('');
        setUploadSharingAccess('restricted');
        setUploadProgress(0);
        setUploadSuccess(false);
      }, 1200);

    } catch (err: any) {
      console.error('Demo video upload failed:', err);
      setUploadError(err.message || 'Upload failed. Please verify connection and retry.');
    } finally {
      setIsUploading(false);
    }
  };

  // Trigger sharing change (with explicit leader confirmation)
  const handleTriggerSharingChange = (video: DemoVideoData, targetAccess: VideoSharingAccess) => {
    if (!isLeader) {
      setToastMessage('Only the Team Leader can configure Google Drive video submission permissions.');
      return;
    }
    if (video.sharingAccess === targetAccess) return;
    setConfirmSharingChange({ video, targetAccess });
  };

  // Confirm and execute Google Drive permission update via Edge Function
  const handleConfirmSharingChange = async () => {
    if (!confirmSharingChange) return;
    const { video, targetAccess } = confirmSharingChange;
    setConfirmSharingChange(null);
    setUpdatingSharingId(video.id);

    try {
      const res = await updateVideoSharing(teamId, video.id, targetAccess);
      setVideos(prev => prev.map(v => 
        v.id === video.id 
          ? { ...v, sharingAccess: res.sharingAccess, webViewLink: res.webViewLink || v.webViewLink } 
          : v
      ));

      if (res.sharingAccess === 'anyone_with_link') {
        setToastMessage(`Public access enabled for "${video.title}". Judges can now view without HackSync login!`);
      } else {
        setToastMessage(`Access reverted to Restricted for "${video.title}".`);
      }
    } catch (err: any) {
      console.error('Failed to update Google Drive sharing permissions:', err);
      setToastMessage(`Permission update failed: ${err.message || 'Google Drive error'}`);
    } finally {
      setUpdatingSharingId(null);
    }
  };

  // Handle Copy Real Drive Link
  const handleCopyLink = async (video: DemoVideoData) => {
    try {
      if (!video.webViewLink) {
        throw new Error('Google Drive link is unavailable');
      }

      await navigator.clipboard.writeText(video.webViewLink);
      setCopiedId(video.id);
      setToastMessage('Google Drive link copied to clipboard!');
      setTimeout(() => setCopiedId(null), 2500);
    } catch (err: any) {
      console.error('Failed to copy link:', err);
      setToastMessage('Could not copy link to clipboard');
    }
  };

  // Handle Delete Video
  const handleDeleteVideo = async (video: DemoVideoData) => {
    if (!confirm(`Are you sure you want to delete "${video.title}"? This will remove the video record and delete it from Google Drive.`)) {
      return;
    }

    setDeletingId(video.id);
    try {
      await deleteDemoVideo(teamId, video.id);
      setVideos(prev => prev.filter(v => v.id !== video.id));
      try {
        localStorage.removeItem(`hacksync_upload_ts_${video.id}`);
        localStorage.removeItem(`hacksync_verified_${video.id}`);
      } catch {}
      setProcessingStates(prev => {
        const next = { ...prev };
        delete next[video.id];
        return next;
      });
      setToastMessage(`Deleted "${video.title}"`);
    } catch (err: any) {
      setToastMessage(`Failed to delete video: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Perform status check for a video via authenticated Edge Function
  const performVideoStatusCheck = useCallback(async (video: DemoVideoData) => {
    if (inFlightChecksRef.current.has(video.id)) return;
    inFlightChecksRef.current.add(video.id);

    setProcessingStates(prev => ({
      ...prev,
      [video.id]: {
        ...(prev[video.id] || {
          phase: 'processing',
          isProcessing: true,
          elapsedSeconds: 0,
        }),
        isChecking: true,
      }
    }));

    try {
      const res = await checkVideoProcessing(teamId, video.googleFileId);

      setProcessingStates(prev => {
        const current = prev[video.id];
        const uploadTs = current?.uploadFinishedAt || getPersistedUploadTime(video.id) || video.createdAt.getTime();
        const isVerified = Boolean(getPersistedVerification(video.id));
        const elapsed = Math.max(0, Math.floor((Date.now() - uploadTs) / 1000));

        if (res.error) {
          return {
            ...prev,
            [video.id]: {
              ...(current || { elapsedSeconds: elapsed }),
              phase: isVerified ? 'playback_verified' : 'error',
              isProcessing: false,
              isChecking: false,
              lastCheckedAt: Date.now(),
              error: res.error,
              message: `Check failed: ${res.error}`
            }
          };
        }

        if (res.isProcessing) {
          // Still processing in Google Drive
          return {
            ...prev,
            [video.id]: {
              ...(current || {}),
              phase: 'processing',
              isProcessing: true,
              isChecking: false,
              lastCheckedAt: Date.now(),
              uploadFinishedAt: uploadTs,
              elapsedSeconds: elapsed,
              thumbnailLink: res.thumbnailLink,
              videoMediaMetadata: res.videoMediaMetadata,
              error: null,
              message: 'Google Drive is transcoding video formats.'
            }
          };
        }

        // Google Drive has completed transcoding!
        if (isVerified) {
          return {
            ...prev,
            [video.id]: {
              ...(current || {}),
              phase: 'playback_verified',
              isProcessing: false,
              isChecking: false,
              lastCheckedAt: Date.now(),
              uploadFinishedAt: uploadTs,
              elapsedSeconds: elapsed,
              thumbnailLink: res.thumbnailLink,
              videoMediaMetadata: res.videoMediaMetadata,
              verifiedAt: getPersistedVerification(video.id),
              error: null,
              message: 'Playback verified for online viewing'
            }
          };
        }

        // Upload and transcode complete, but user needs to test playback
        return {
          ...prev,
          [video.id]: {
            ...(current || {}),
            phase: 'ready_to_test',
            isProcessing: false,
            isChecking: false,
            lastCheckedAt: Date.now(),
            uploadFinishedAt: uploadTs,
            elapsedSeconds: elapsed,
            thumbnailLink: res.thumbnailLink,
            videoMediaMetadata: res.videoMediaMetadata,
            error: null,
            message: 'Upload complete — playback readiness needs verification'
          }
        };
      });

      if (!res.isProcessing && !res.error) {
        setToastMessage(`"${video.title}" transcode complete! Playable online.`);
      }
    } catch (err: any) {
      setProcessingStates(prev => ({
        ...prev,
        [video.id]: {
          ...(prev[video.id] || { phase: 'error', isProcessing: false, elapsedSeconds: 0 }),
          isChecking: false,
          error: err.message || 'Check failed',
          message: 'Verification check failed'
        }
      }));
    } finally {
      inFlightChecksRef.current.delete(video.id);
    }
  }, [teamId]);

  // Mark a video as confirmed playable online
  const handleVerifyPlayback = (video: DemoVideoData) => {
    const now = Date.now();
    setPersistedVerification(video.id, now);
    setProcessingStates(prev => ({
      ...prev,
      [video.id]: {
        ...(prev[video.id] || { isProcessing: false, isChecking: false, elapsedSeconds: 0 }),
        phase: 'playback_verified',
        isProcessing: false,
        isChecking: false,
        verifiedAt: now,
        error: null,
        message: 'Playback verified'
      }
    }));
    setToastMessage(`"${video.title}" marked Playback Verified!`);
  };

  // 1-second ticker for elapsed seconds on processing videos
  useEffect(() => {
    const ticker = setInterval(() => {
      setProcessingStates(prev => {
        let changed = false;
        const next = { ...prev };
        for (const [id, state] of Object.entries(next)) {
          if (state.phase === 'processing' && state.uploadFinishedAt) {
            const elapsed = Math.max(0, Math.floor((Date.now() - state.uploadFinishedAt) / 1000));
            if (elapsed !== state.elapsedSeconds) {
              next[id] = { ...state, elapsedSeconds: elapsed };
              changed = true;
            }
          }
        }
        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(ticker);
  }, []);

  // Automatic 8-second polling for active processing videos (stable interval, no cancellation on ticker)
  useEffect(() => {
    const checkActiveVideos = () => {
      const activeVideos = (videosRef.current || []).filter(v => {
        const state = processingStatesRef.current[v.id];
        if (!state || state.phase === 'processing') return true;
        // Automatically re-check error states after 15 seconds
        if (state.phase === 'error' && (!state.lastCheckedAt || Date.now() - state.lastCheckedAt > 15000)) return true;
        return false;
      });

      for (const v of activeVideos) {
        if (!inFlightChecksRef.current.has(v.id)) {
          performVideoStatusCheck(v);
        }
      }
    };

    // Run immediate check on mount / team change
    checkActiveVideos();

    const pollInterval = setInterval(() => {
      checkActiveVideos();
    }, 8000);

    return () => clearInterval(pollInterval);
  }, [teamId, performVideoStatusCheck]);

  // Immediately verify newly loaded unverified or error videos without waiting for interval
  useEffect(() => {
    if (videos.length === 0) return;
    const pendingVideos = videos.filter(v => {
      const state = processingStatesRef.current[v.id];
      return !state || state.phase === 'processing' || state.phase === 'error';
    });
    for (const v of pendingVideos) {
      if (!inFlightChecksRef.current.has(v.id)) {
        performVideoStatusCheck(v);
      }
    }
  }, [videos, performVideoStatusCheck]);

  // Filtered and Sorted Videos
  const filteredVideos = useMemo(() => {
    let list = videos.filter(v => {
      const q = searchQuery.toLowerCase();
      return (
        v.title.toLowerCase().includes(q) ||
        (v.description && v.description.toLowerCase().includes(q)) ||
        v.uploaderName.toLowerCase().includes(q)
      );
    });

    list.sort((a, b) => {
      if (sortOption === 'newest') {
        return b.createdAt.getTime() - a.createdAt.getTime();
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return list;
  }, [videos, searchQuery, sortOption]);

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  return (
    <div className="w-full flex flex-col gap-6 pb-16">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#0A0F1D] text-white border border-cyan-500/40 shadow-2xl animate-fade-in">
          <Info size={16} className="text-cyan-400 shrink-0" />
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0A0F1D] via-[#0F172A] to-[#0A0F1D] border border-cyan-500/20 shadow-xl p-6 text-white">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              <Video size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2 flex-wrap">
                <span>Demo Video Library</span>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold">
                  GOOGLE DRIVE
                </span>
                <span className="text-[11px] font-mono-code px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium flex items-center gap-1">
                  <Clock size={11} className="text-amber-400 shrink-0" />
                  <span>takes atleast 5 min</span>
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Share your team's demo videos using Google Drive. <span className="text-slate-500">(Google Drive transcode takes at least 5 min)</span>
              </p>
            </div>
          </div>

          {/* Action: Upload Demo Video Button */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                if (!driveStatus.isConnected) {
                  setToastMessage("Connect the team leader's Google Drive first before uploading.");
                  return;
                }
                setIsUploadOpen(true);
                setUploadError(null);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-semibold text-xs tracking-wide shadow-md transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Upload Demo Video</span>
            </button>
          </div>
        </div>
      </div>

      {/* Google Drive Connection Status Card */}
      <div className="w-full rounded-xl bg-surface-container-lowest border border-outline-variant/60 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-secondary shrink-0">
            <HardDrive size={20} className={driveStatus.isConnected ? "text-emerald-600" : "text-slate-400"} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-on-surface">Google Drive Integration</span>
              {isLoadingStatus ? (
                <span className="flex items-center gap-1 text-[11px] text-secondary">
                  <Loader2 size={12} className="animate-spin" /> checking...
                </span>
              ) : driveStatus.isConnected ? (
                <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Disconnected
                </span>
              )}
            </div>
            <div className="text-xs text-secondary mt-0.5">
              {driveStatus.isConnected ? (
                <span>
                  Connected Account: <strong className="text-on-surface font-mono-code">{driveStatus.googleEmail || 'Authorized Account'}</strong>
                </span>
              ) : (
                <span>Connect the team leader's Google Drive to start sharing demo videos.</span>
              )}
            </div>
          </div>
        </div>

        {/* Connection Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {driveStatus.isConnected ? (
            isLeader && (
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="px-3 py-1.5 rounded-lg border border-error/30 hover:bg-error-container/20 text-error text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                title="Disconnect Google Drive"
              >
                {isDisconnecting ? <Loader2 size={13} className="animate-spin" /> : null}
                <span>Disconnect Google Drive</span>
              </button>
            )
          ) : (
            isLeader ? (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="px-4 py-2 rounded-lg bg-[#0A0F1D] hover:bg-[#131C35] text-cyan-400 border border-cyan-500/40 text-xs font-semibold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isConnecting ? <Loader2 size={14} className="animate-spin" /> : <HardDrive size={14} />}
                <span>Connect Google Drive</span>
              </button>
            ) : (
              <span className="text-xs text-slate-500 italic">
                Only the team leader can connect Google Drive
              </span>
            )
          )}
        </div>
      </div>

      {/* Access and Permissions Strategy Note */}
      <div className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/50 text-[11px] text-secondary flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Lock size={14} className="text-primary shrink-0" />
          <span>
            <strong>Access Strategy:</strong> Uploaded videos are kept secure in Google Drive. Viewers with the Google Drive link must have permission in Google Drive to watch.
          </span>
        </div>
        <span className="font-mono-metadata text-[10px] text-slate-500 shrink-0">
          FOLDER: HackSync Demo Videos / {teamName}
        </span>
      </div>

      {/* Toolbar: Search & Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/60 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search demo videos by title or uploader..."
            className="w-full pl-9 pr-3 py-1.5 bg-surface text-on-surface text-xs rounded-lg border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-secondary font-medium">Sort:</span>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as any)}
            className="px-2.5 py-1.5 bg-surface text-on-surface text-xs rounded-lg border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-2xs"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>

          <button
            onClick={() => loadVideos()}
            className="p-1.5 text-secondary hover:text-primary rounded-lg hover:bg-surface-container transition-colors"
            title="Refresh videos"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Videos Grid / State Rendering */}
      {isLoadingVideos && videos.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div 
              key={n}
              className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-5 shadow-2xs animate-pulse flex flex-col justify-between min-h-[220px]"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-16 bg-surface-container rounded-md" />
                  <div className="h-5 w-24 bg-surface-container rounded-md" />
                </div>
                <div className="h-6 w-3/4 bg-surface-container rounded-md mt-2" />
                <div className="h-4 w-1/2 bg-surface-container rounded-md" />
              </div>
              <div className="pt-4 border-t border-outline-variant/40 flex items-center justify-between mt-6">
                <div className="h-4 w-20 bg-surface-container rounded-md" />
                <div className="h-8 w-28 bg-surface-container rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredVideos.length === 0 ? (
        /* Empty / Disconnected State */
        <div className="flex flex-col items-center justify-center p-16 text-center text-secondary bg-surface-container-lowest rounded-xl border border-outline-variant/60 shadow-2xs">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center text-cyan-500 mb-4 shadow-sm">
            <Video size={32} />
          </div>
          <h3 className="font-semibold text-base text-on-surface mb-1">
            {!driveStatus.isConnected ? "Google Drive Disconnected" : "No demo videos yet"}
          </h3>
          <p className="text-xs text-secondary max-w-md mb-6 leading-relaxed">
            {!driveStatus.isConnected 
              ? "Connect the team leader's Google Drive to start sharing demo videos." 
              : "Upload your team's first demo video. Videos are saved directly to the connected Google Drive folder."
            }
          </p>

          {!driveStatus.isConnected ? (
            isLeader && (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="px-5 py-2.5 rounded-xl bg-[#0A0F1D] hover:bg-[#131C35] text-cyan-400 border border-cyan-500/40 text-xs font-semibold shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                {isConnecting ? <Loader2 size={15} className="animate-spin" /> : <HardDrive size={15} />}
                <span>Connect Google Drive</span>
              </button>
            )
          ) : (
            <button
              onClick={() => setIsUploadOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} />
              <span>Upload Demo Video</span>
            </button>
          )}
        </div>
      ) : (
        /* Video Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVideos.map((video) => {
            const isUploader = video.uploaderId === currentUserId;
            const canDelete = isUploader || isLeader;
            const isCopied = copiedId === video.id;
            const isDeleting = deletingId === video.id;

            return (
              <div 
                key={video.id}
                className="group relative bg-surface-container-lowest/80 dark:bg-[#0A0F1D]/80 backdrop-blur-md hover:bg-surface-container-low/90 border border-outline-variant/60 hover:border-primary/40 rounded-xl p-3.5 sm:p-4 shadow-2xs transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Header: Badges & Actions */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono-code font-semibold uppercase bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                        {video.mimeType.split('/').pop() || 'VIDEO'}
                      </span>
                      {video.sharingAccess === 'anyone_with_link' ? (
                        <span 
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono-code font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                          title="Anyone with the link can view without login"
                        >
                          <Globe size={11} className="shrink-0 text-emerald-500" />
                          <span>Anyone with link (Viewer)</span>
                        </span>
                      ) : (
                        <span 
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono-code font-medium bg-surface-container-high text-secondary border border-outline-variant/60"
                          title="Restricted: Only permitted Google users"
                        >
                          <Lock size={11} className="shrink-0" />
                          <span>Restricted</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteVideo(video)}
                          disabled={isDeleting}
                          className="p-1 rounded text-slate-400 hover:text-error hover:bg-error-container/20 transition-colors"
                          title="Delete Video"
                        >
                          {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Thumbnail / Video Preview Placeholder Box */}
                  <div 
                    onClick={() => setPreviewVideo(video)}
                    className="relative aspect-video rounded-lg bg-[#090D16] border border-slate-800 overflow-hidden flex items-center justify-center cursor-pointer group/thumb mb-3"
                  >
                    <img 
                      src={`https://drive.google.com/thumbnail?id=${video.googleFileId}&sz=w800`}
                      alt={video.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                      onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20 pointer-events-none" />
                    <div className="relative z-10 w-12 h-12 rounded-full bg-cyan-500/20 backdrop-blur-xs border border-cyan-400/40 flex items-center justify-center text-cyan-400 group-hover/thumb:scale-110 transition-transform shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                      <Play size={20} className="ml-0.5 fill-cyan-400" />
                    </div>
                    <span className="relative z-10 absolute bottom-2 right-2 text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-black/75 text-slate-300 border border-white/10">
                      {formatFileSize(video.sizeBytes)}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h4 className="font-semibold text-sm text-on-surface truncate" title={video.title}>
                    {video.title}
                  </h4>
                  {video.description && (
                    <p className="text-xs text-secondary line-clamp-2 mt-1 leading-relaxed">
                      {video.description}
                    </p>
                  )}
                </div>

                {/* Metadata & Working Drive Actions */}
                <div className="mt-4 pt-3 border-t border-outline-variant/40 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-[11px] text-secondary font-mono-metadata">
                    <span className="flex items-center gap-1 truncate max-w-[120px]" title={video.uploaderName}>
                      <User size={12} className="text-outline" /> {video.uploaderName}
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      <Clock size={12} className="text-outline" /> {video.createdAt.toLocaleDateString()}
                    </span>
                  </div>

                  {/* Real Google Drive Link Box */}
                  <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/60 flex flex-col gap-1.5 text-[11px]">
                    <div className="flex items-center justify-between text-secondary">
                      <span className="font-semibold text-on-surface flex items-center gap-1">
                        <Share2 size={11} className="text-primary" /> Google Drive Link
                      </span>
                      <span className="text-[10px] font-mono-code font-medium">
                        {video.sharingAccess === 'anyone_with_link' ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">🌐 Public for Judges</span>
                        ) : (
                          <span className="text-secondary">🔒 Restricted</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={video.webViewLink}
                        className="flex-1 bg-surface-container px-2 py-1 rounded text-[11px] font-mono-code text-primary border border-outline-variant/50 focus:outline-none select-all truncate"
                        title={video.webViewLink}
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyLink(video)}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-colors cursor-pointer ${
                          isCopied 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-primary text-on-primary hover:bg-primary/90'
                        }`}
                        title="Copy Google Drive link"
                      >
                        {isCopied ? <Check size={12} /> : <Copy size={12} />}
                        <span>{isCopied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="text-[10px] text-secondary leading-tight flex flex-col gap-1">
                      <p>
                        {video.sharingAccess === 'anyone_with_link'
                          ? '✓ Hackathon judges & organizers can open this link directly without joining the team.'
                          : '🔒 Only authorized Google accounts can open. Leader can switch to "Anyone with link" below.'}
                      </p>
                      <p className="text-[9px] text-slate-400 italic">
                        Note: Public permission allows access without login; playback readiness ensures Google Drive web streaming is transcoded.
                      </p>
                    </div>
                  </div>

                  {/* Leader Sharing Controls */}
                  {isLeader ? (
                    <div className="pt-1 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-secondary">Submission Sharing:</span>
                        {updatingSharingId === video.id && (
                          <span className="flex items-center gap-1 text-[10px] text-primary">
                            <Loader2 size={11} className="animate-spin" /> Updating Drive...
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-surface-container-low border border-outline-variant/60">
                        <button
                          type="button"
                          disabled={updatingSharingId === video.id || video.sharingAccess === 'restricted'}
                          onClick={() => handleTriggerSharingChange(video, 'restricted')}
                          className={`py-1 px-2 rounded-md text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:cursor-default ${
                            video.sharingAccess === 'restricted'
                              ? 'bg-surface-container-highest text-on-surface font-semibold shadow-2xs'
                              : 'text-secondary hover:text-on-surface hover:bg-surface-container'
                          }`}
                        >
                          <Lock size={11} />
                          <span>Restricted</span>
                        </button>
                        <button
                          type="button"
                          disabled={updatingSharingId === video.id || video.sharingAccess === 'anyone_with_link'}
                          onClick={() => handleTriggerSharingChange(video, 'anyone_with_link')}
                          className={`py-1 px-2 rounded-md text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:cursor-default ${
                            video.sharingAccess === 'anyone_with_link'
                              ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                              : 'text-secondary hover:text-emerald-500 hover:bg-emerald-500/10'
                          }`}
                        >
                          <Globe size={11} />
                          <span>Anyone with link</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-secondary/80 flex items-center gap-1">
                      <Info size={11} className="shrink-0" />
                      <span>Team Leader can toggle public link for submissions.</span>
                    </div>
                  )}

                  {/* Playback Processing Status & Readiness Monitor */}
                  {(() => {
                    const status = processingStates[video.id] || {
                      phase: 'ready_to_test',
                      isProcessing: false,
                      isChecking: false,
                      elapsedSeconds: 0,
                      message: 'Upload complete — playback readiness needs verification'
                    };

                    if (status.phase === 'processing') {
                      const totalTimerSec = 300; // 5 min estimated transcode
                      const pct = Math.min(95, Math.max(6, Math.round((status.elapsedSeconds / totalTimerSec) * 92)));

                      return (
                        <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                              <Clock size={13} className="animate-pulse text-amber-500 shrink-0" />
                              <span>Processing video · {formatElapsed(status.elapsedSeconds)} / 05:00</span>
                            </span>
                            <span className="text-[10px] font-mono-code text-amber-700/80 dark:text-amber-300/80 shrink-0 font-medium">
                              Est: ~5m timer
                            </span>
                          </div>

                          {/* Progress bar with 5-minute timer progress */}
                          <div className="w-full h-1.5 rounded-full bg-amber-500/20 overflow-hidden relative">
                            <div 
                              className="h-full bg-amber-500 rounded-full transition-all duration-1000 ease-linear"
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px]">
                            {status.elapsedSeconds >= totalTimerSec ? (
                              <span className="text-amber-700 dark:text-amber-300 font-medium animate-pulse flex items-center gap-1">
                                ⏳ Taking longer than 5m — checking automatically...
                              </span>
                            ) : (
                              <span className="text-secondary flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block shrink-0" />
                                <span>Auto-checking Google Drive every 8s · Transcode in progress</span>
                              </span>
                            )}
                            {status.isChecking && (
                              <span className="text-primary flex items-center gap-1 text-[10px] font-mono-code shrink-0">
                                <Loader2 size={10} className="animate-spin text-primary" />
                                <span>Auto-checking...</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }

                    if (status.phase === 'ready_to_test') {
                      return (
                        <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1.5">
                              <Info size={13} className="text-blue-500 shrink-0" />
                              <span>Transcode complete — ready to test playback</span>
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                              <Check size={11} /> Complete
                            </span>
                          </div>
                          <p className="text-[10px] text-secondary leading-tight">
                            Google Drive video transcode is complete. Test playback below to verify smooth online streaming for judges.
                          </p>
                          <div className="flex items-center gap-2 pt-0.5">
                            <button
                              type="button"
                              onClick={() => setPreviewVideo(video)}
                              className="flex-1 py-1 px-2.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer"
                              title="Test playback in embedded player"
                            >
                              <Play size={11} className="fill-white" />
                              <span>Test Playback</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVerifyPlayback(video)}
                              className="py-1 px-2.5 rounded-md bg-surface-container hover:bg-surface-container-high text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              title="Mark as confirmed playable"
                            >
                              <Check size={11} />
                              <span>Confirm Playable</span>
                            </button>
                          </div>
                        </div>
                      );
                    }

                    if (status.phase === 'playback_verified') {
                      return (
                        <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                              <Check size={13} className="text-emerald-500 shrink-0" />
                              <span>Playback verified</span>
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono-code font-bold uppercase bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                              STREAMING READY
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-secondary">
                            <span>Verified playable online via Google Drive web streaming.</span>
                            <button
                              type="button"
                              onClick={() => setPreviewVideo(video)}
                              className="text-primary hover:underline flex items-center gap-1 shrink-0 ml-1.5 cursor-pointer"
                              title="Re-open video preview player"
                            >
                              <span>Test again</span>
                            </button>
                          </div>
                        </div>
                      );
                    }

                    // Phase: error
                    return (
                      <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-error-container/25 border border-error/30 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-error font-semibold flex items-center gap-1.5">
                            <AlertCircle size={13} className="text-error shrink-0" />
                            <span>Readiness check notice</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => performVideoStatusCheck(video)}
                            disabled={status.isChecking}
                            className="text-[10px] text-primary hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            title="Retry status check"
                          >
                            <RefreshCw size={10} className={status.isChecking ? 'animate-spin' : ''} />
                            <span>{status.isChecking ? 'Checking...' : 'Retry Check'}</span>
                          </button>
                        </div>
                        <span className="text-[10px] text-secondary">
                          {status.error || 'Direct streaming check in progress. You can test or verify playback directly below.'}
                        </span>
                        <div className="flex items-center gap-2 pt-1 border-t border-error/20">
                          <button
                            type="button"
                            onClick={() => setPreviewVideo(video)}
                            className="flex-1 py-1 px-2 rounded-md bg-primary text-on-primary hover:bg-primary/90 font-semibold text-[11px] flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            title="Test playback in embedded player"
                          >
                            <Play size={11} className="fill-white" />
                            <span>Test Playback</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVerifyPlayback(video)}
                            className="py-1 px-2.5 rounded-md bg-surface-container hover:bg-surface-container-high text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            title="Mark as confirmed playable"
                          >
                            <Check size={11} />
                            <span>Confirm Playable</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Quick Action Buttons */}
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyLink(video)}
                        className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isCopied 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/60'
                        }`}
                        title="Copy Google Drive share link"
                      >
                        {isCopied ? <Check size={13} /> : <Copy size={13} />}
                        <span>{isCopied ? 'Copied' : 'Copy Drive Link'}</span>
                      </button>

                      <a
                        href={video.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition-colors flex items-center justify-center cursor-pointer"
                        title="Open in Google Drive"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>

                    <button
                      type="button"
                      onClick={() => setTestSubmissionVideo(video)}
                      className="w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer shadow-2xs"
                      title="Test public link for hackathon submissions"
                    >
                      <ExternalLink size={13} />
                      <span>Test Submission Link (Judges View)</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================
          UPLOAD DEMO VIDEO MODAL
          ======================================================== */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-md flex items-start justify-center p-3 pt-3 sm:pt-6 overflow-y-auto animate-fade-in">
          <div className="w-full max-w-[460px] bg-surface-container-lowest/85 dark:bg-[#0A0F1D]/85 backdrop-blur-2xl border border-outline-variant/60 rounded-2xl p-3.5 sm:p-4 shadow-2xl flex flex-col gap-2.5 my-1 sm:my-2">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/50">
              <div className="flex items-center gap-2">
                <Video size={18} className="text-primary" />
                <h3 className="font-semibold text-sm text-on-surface">Upload Demo Video</h3>
              </div>
              <button 
                onClick={() => {
                  if (!isUploading) setIsUploadOpen(false);
                }}
                disabled={isUploading}
                className="p-1 text-secondary hover:text-on-surface rounded-lg hover:bg-surface-container"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleStartUpload} className="flex flex-col gap-2.5">
              
              {/* Drag-and-drop or Browse Area */}
              <div 
                onClick={() => !isUploading && fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!isUploading && e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                className={`border-2 border-dashed rounded-xl p-3.5 sm:p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                  selectedFile 
                    ? 'border-emerald-500 bg-emerald-50/20' 
                    : 'border-outline-variant hover:border-primary/60 bg-surface-container-low/60 dark:bg-slate-900/40 hover:bg-surface-container/70'
                }`}
              >
                <input 
                  type="file"
                  ref={fileInputRef}
                  accept="video/*,.mp4,.mov,.webm,.mkv,.avi"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                {selectedFile ? (
                  <div className="flex flex-col items-center gap-1">
                    <Check size={26} className="text-emerald-500 mb-0.5" />
                    <span className="font-semibold text-xs text-on-surface truncate max-w-xs">{selectedFile.name}</span>
                    <span className="text-[10px] text-secondary font-mono-metadata">{formatFileSize(selectedFile.size)}</span>
                    <span className="text-[9.5px] text-primary hover:underline mt-0.5">Click to choose another file</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5">
                    <UploadCloud size={28} className="text-primary/70 mb-0.5" />
                    <span className="text-[11px] font-semibold text-on-surface">Drag & drop video file here, or</span>
                    <button 
                      type="button"
                      className="px-2.5 py-1 rounded-md bg-surface-container-highest/80 text-primary font-semibold text-[11px] border border-outline-variant hover:bg-surface-container"
                    >
                      Browse Videos
                    </button>
                    <span className="text-[9.5px] text-secondary mt-0.5">Supports MP4, WebM, MOV (Max standard Drive quota)</span>
                  </div>
                )}
              </div>

              {/* Video Title */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-on-surface">
                  Video Title <span className="text-error">*</span>
                </label>
                <input 
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="e.g. Sprint 24 Final Demo & Pitch"
                  required
                  disabled={isUploading}
                  className="w-full px-2.5 py-1.5 bg-surface/75 dark:bg-slate-900/60 backdrop-blur-xs text-on-surface text-xs rounded-lg border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                />
              </div>

              {/* Optional Description */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-on-surface">
                  Description <span className="text-secondary font-normal">(Optional)</span>
                </label>
                <textarea 
                  value={videoDescription}
                  onChange={(e) => setVideoDescription(e.target.value)}
                  placeholder="Key highlights, timestamp markers, or submission notes..."
                  rows={1}
                  disabled={isUploading}
                  className="w-full px-2.5 py-1.5 bg-surface/75 dark:bg-slate-900/60 backdrop-blur-xs text-on-surface text-xs rounded-lg border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs resize-none"
                />
              </div>

              {/* Hackathon Submission Sharing Option */}
              <div className="flex flex-col gap-1.5 p-2 sm:p-2.5 rounded-xl bg-surface-container-low/70 dark:bg-slate-900/40 backdrop-blur-xs border border-outline-variant/60">
                <div className="flex items-center justify-between text-[11px] font-semibold text-on-surface">
                  <span className="flex items-center gap-1.5">
                    <Share2 size={12} className="text-primary" />
                    <span>Submission Sharing Option</span>
                  </span>
                  {isLeader ? (
                    <span className="text-[9.5px] font-normal text-secondary">(Leader setting)</span>
                  ) : (
                    <span className="text-[9.5px] font-normal text-secondary">(Member upload)</span>
                  )}
                </div>

                {isLeader ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => setUploadSharingAccess('restricted')}
                      className={`p-2 rounded-lg border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                        uploadSharingAccess === 'restricted'
                          ? 'border-primary bg-primary/10 text-on-surface'
                          : 'border-outline-variant/60 hover:border-outline bg-surface-container/60 dark:bg-slate-800/40 text-secondary'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-on-surface">
                        <Lock size={11} className="text-slate-400" />
                        <span>Restricted (Default)</span>
                      </div>
                      <p className="text-[9.5px] text-secondary leading-tight">
                        Only Google accounts with permissions can view.
                      </p>
                    </button>

                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => setUploadSharingAccess('anyone_with_link')}
                      className={`p-2 rounded-lg border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                        uploadSharingAccess === 'anyone_with_link'
                          ? 'border-emerald-500 bg-emerald-500/10 text-on-surface'
                          : 'border-outline-variant/60 hover:border-outline bg-surface-container/60 dark:bg-slate-800/40 text-secondary'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-on-surface">
                        <Globe size={11} className="text-emerald-500" />
                        <span>Anyone with the link — Viewer</span>
                      </div>
                      <p className="text-[9.5px] text-secondary leading-tight">
                        Judges & organizers can open directly without login.
                      </p>
                    </button>
                  </div>
                ) : (
                  <div className="p-1.5 rounded-lg bg-surface-container text-[10px] text-secondary flex items-start gap-1.5 leading-normal">
                    <Info size={12} className="shrink-0 text-primary mt-0.5" />
                    <span>Uploaded videos start as <strong>Restricted</strong> by default. The Team Leader can enable <strong>Anyone with link (Viewer)</strong> for hackathon evaluation after upload.</span>
                  </div>
                )}
              </div>

              {/* Progress Bar & Error Display */}
              {isUploading && (
                <div className="flex flex-col gap-1 p-2 rounded-xl bg-surface-container-low border border-outline-variant/60">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-on-surface">
                    <span className="flex items-center gap-1.5">
                      <Loader2 size={13} className="animate-spin text-primary" />
                      <span>Uploading to Google Drive...</span>
                    </span>
                    <span className="font-mono-code text-primary">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-200 rounded-full" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="p-2.5 rounded-lg bg-error-container text-on-error-container text-[11px] flex items-start gap-2">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1 w-full">
                    <span>{uploadError}</span>
                    <div className="flex items-center gap-3 mt-0.5">
                      {uploadError.toLowerCase().includes('reconnect') ? (
                        <button
                          type="button"
                          onClick={handleConnect}
                          className="px-2.5 py-0.5 rounded bg-primary text-on-primary font-semibold text-[11px] shadow-xs hover:opacity-90 cursor-pointer"
                        >
                          Reconnect Google Drive
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleStartUpload}
                          className="text-[11px] font-bold underline text-left cursor-pointer"
                        >
                          Retry Upload
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {uploadSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] flex items-center gap-2">
                  <Check size={15} className="text-emerald-600" />
                  <span>Video uploaded successfully to Google Drive!</span>
                </div>
              )}

              {/* Bottom Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-outline-variant/40">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  disabled={isUploading}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-secondary hover:bg-surface-container disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile || !videoTitle.trim()}
                  className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isUploading ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                  <span>{isUploading ? 'Uploading...' : 'Start Upload'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          VIDEO PREVIEW MODAL
          ======================================================== */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-start justify-center p-3 pt-3 sm:pt-6 overflow-y-auto animate-fade-in">
          <div className="w-full max-w-3xl bg-[#090D16]/90 backdrop-blur-2xl border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col my-1 sm:my-2">
            <div className="flex items-center justify-between p-4 bg-[#0A0F1D] border-b border-slate-800 text-white">
              <div className="flex items-center gap-2 truncate max-w-lg">
                <Video size={18} className="text-cyan-400 shrink-0" />
                <span className="font-semibold text-sm truncate">{previewVideo.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewVideo.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
                >
                  <ExternalLink size={14} />
                  <span>Open Drive</span>
                </a>
                <button 
                  onClick={() => setPreviewVideo(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Embedded Google Drive Preview Player */}
            <div className="relative aspect-video w-full bg-black flex items-center justify-center">
              <iframe
                src={`https://drive.google.com/file/d/${previewVideo.googleFileId}/preview`}
                className="w-full h-full border-0"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title={previewVideo.title}
              />
            </div>

            <div className="p-4 bg-[#0A0F1D] border-t border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span>Google Drive File ID: <code className="font-mono-code text-slate-300">{previewVideo.googleFileId}</code></span>
                {processingStates[previewVideo.id]?.phase === 'playback_verified' ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono-code font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <Check size={11} /> Playback Verified
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleVerifyPlayback(previewVideo)}
                    className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                  >
                    <Check size={12} />
                    <span>Confirm Video Streams (Mark Verified)</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => handleCopyLink(previewVideo)}
                className="text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Copy size={12} />
                <span>Copy Share Link</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          CONFIRM SHARING PERMISSION CHANGE MODAL
          ======================================================== */}
      {confirmSharingChange && (
        <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-md flex items-start justify-center p-3 pt-4 sm:pt-8 overflow-y-auto animate-fade-in">
          <div className="w-full max-w-md bg-surface-container-lowest/85 dark:bg-[#0A0F1D]/85 backdrop-blur-2xl border border-outline-variant/60 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col gap-3 my-1 sm:my-2">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                confirmSharingChange.targetAccess === 'anyone_with_link'
                  ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                  : 'bg-surface-container text-secondary border border-outline-variant'
              }`}>
                {confirmSharingChange.targetAccess === 'anyone_with_link' ? <Globe size={20} /> : <Lock size={20} />}
              </div>
              <div>
                <h3 className="font-semibold text-sm text-on-surface">
                  {confirmSharingChange.targetAccess === 'anyone_with_link'
                    ? 'Enable Public Submission Access?'
                    : 'Revert Video to Restricted Access?'}
                </h3>
                <span className="text-[11px] text-secondary truncate block max-w-xs">
                  {confirmSharingChange.video.title}
                </span>
              </div>
            </div>

            <div className="text-xs text-secondary leading-relaxed flex flex-col gap-2 p-3 rounded-xl bg-surface-container-low border border-outline-variant/60">
              {confirmSharingChange.targetAccess === 'anyone_with_link' ? (
                <>
                  <p>
                    This will configure the Google Drive file permission to <strong>type="anyone", role="reader"</strong>.
                  </p>
                  <p className="text-emerald-700 dark:text-emerald-300 font-medium">
                    ✓ Hackathon judges, organizers, and evaluators will be able to view and play this demo video directly from the link without joining the HackSync team or logging in.
                  </p>
                  <p className="text-[11px] text-secondary/80">
                    Note: This permission applies strictly to this single demo video file. Your team Google Drive folder and all other files remain private.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    This will remove the public reader permission on Google Drive.
                  </p>
                  <p>
                    Only users explicitly granted access to your Google Drive will be able to open this video. External judges without direct access will no longer be able to view it.
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/50">
              <button
                type="button"
                onClick={() => setConfirmSharingChange(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-secondary hover:bg-surface-container cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSharingChange}
                className={`px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-sm transition-all cursor-pointer ${
                  confirmSharingChange.targetAccess === 'anyone_with_link'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-primary hover:bg-primary/90'
                }`}
              >
                {confirmSharingChange.targetAccess === 'anyone_with_link'
                  ? 'Confirm & Make Public for Judges'
                  : 'Confirm & Revert to Restricted'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          OAUTH CONFIGURATION SETUP GUIDE MODAL
          ======================================================== */}
      {isSetupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-md flex items-start justify-center p-3 pt-4 sm:pt-8 overflow-y-auto animate-fade-in">
          <div className="w-full max-w-xl bg-surface-container-lowest/85 dark:bg-[#0A0F1D]/85 backdrop-blur-2xl border border-outline-variant/60 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col gap-3 my-1 sm:my-2">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
              <div className="flex items-center gap-2">
                <HardDrive size={20} className="text-primary" />
                <h3 className="font-semibold text-base text-on-surface">Google Cloud Setup Required</h3>
              </div>
              <button 
                onClick={() => setIsSetupModalOpen(false)}
                className="p-1 text-secondary hover:text-on-surface rounded-lg hover:bg-surface-container"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-xs text-secondary leading-relaxed flex flex-col gap-3">
              <p>
                To enable official Google Drive OAuth 2.0 authorization, configure the Google Cloud Console credentials in your Supabase project:
              </p>

              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60 font-mono-code text-[11px] text-on-surface flex flex-col gap-1.5">
                <div>1. In <strong>Google Cloud Console</strong> &gt; APIs &amp; Services &gt; Credentials:</div>
                <div className="pl-3 text-secondary">• Create OAuth 2.0 Client ID (Web Application)</div>
                <div className="pl-3 text-secondary">• Add Authorized Redirect URI:</div>
                <div className="pl-3 font-semibold text-primary break-all">
                  {`${window.location.origin}/`}
                </div>
                <div>2. Set Secrets in <strong>Supabase Secrets</strong>:</div>
                <div className="pl-3 text-secondary">• <code className="text-on-surface">GOOGLE_CLIENT_ID</code></div>
                <div className="pl-3 text-secondary">• <code className="text-on-surface">GOOGLE_CLIENT_SECRET</code></div>
                <div className="pl-3 text-secondary">• <code className="text-on-surface">GOOGLE_REDIRECT_URI = {window.location.origin}/</code></div>
              </div>

              <div className="p-2.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800 text-cyan-800 dark:text-cyan-300 text-[11px]">
                <strong>Scope configured:</strong> <code>https://www.googleapis.com/auth/drive.file</code> (only grants access to demo videos created by HackSync in the leader's Google Drive).
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-outline-variant/50">
              <button
                onClick={() => setIsSetupModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary/90"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TEST SUBMISSION LINK MODAL
          ======================================================== */}
      {testSubmissionVideo && (
        <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-md flex items-start justify-center p-3 pt-3 sm:pt-6 overflow-y-auto animate-fade-in">
          <div className="w-full max-w-lg bg-surface-container-lowest/85 dark:bg-[#0A0F1D]/85 backdrop-blur-2xl border border-outline-variant/60 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col gap-3 my-1 sm:my-2">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/50">
              <div className="flex items-center gap-2">
                <Globe className="text-emerald-500" size={20} />
                <h3 className="font-semibold text-sm text-on-surface">Test Hackathon Submission Link</h3>
              </div>
              <button 
                onClick={() => setTestSubmissionVideo(null)} 
                className="p-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-semibold text-on-surface">{testSubmissionVideo.title}</span>
              
              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-secondary font-medium">Access Status:</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    testSubmissionVideo.sharingAccess === 'anyone_with_link' 
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  }`}>
                    {testSubmissionVideo.sharingAccess === 'anyone_with_link' ? '🌐 Anyone with the link — Viewer' : '🔒 Restricted (Not public yet)'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-outline-variant/40">
                  <span className="text-secondary font-medium">Playback Readiness:</span>
                  <div className="flex items-center gap-2">
                    {processingStates[testSubmissionVideo.id]?.phase === 'playback_verified' ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <Check size={11} /> Playback Verified
                      </span>
                    ) : processingStates[testSubmissionVideo.id]?.phase === 'processing' ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                        <Clock size={11} className="animate-pulse" /> Processing in Drive
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1">
                        <Info size={11} /> Needs Verification
                      </span>
                    )}
                    {processingStates[testSubmissionVideo.id]?.phase !== 'playback_verified' && (
                      <button
                        type="button"
                        onClick={() => handleVerifyPlayback(testSubmissionVideo)}
                        className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                      >
                        Mark Verified
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-secondary font-medium">Online Video Stream View Link (webViewLink):</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={testSubmissionVideo.webViewLink}
                      className="flex-1 bg-surface px-2.5 py-1.5 rounded-lg text-xs font-mono-code text-primary border border-outline-variant select-all"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyLink(testSubmissionVideo)}
                      className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary/90 flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Copy size={13} />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs flex flex-col gap-2 leading-relaxed">
                <div className="font-semibold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                  <Info size={15} className="shrink-0" />
                  <span>How to verify public access like a hackathon judge:</span>
                </div>
                <p className="text-secondary">
                  Hackathon judges and evaluators are not members of your team and will test this link in external, unauthenticated browsers.
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-[11px] text-secondary">
                  <li>Click <strong>Copy &amp; Open in New Window</strong> below.</li>
                  <li>In your browser, open an <strong>Incognito / Private Window</strong> (where you are not logged into Google).</li>
                  <li>Paste the copied URL in the incognito window.</li>
                  <li>Verify that Google Drive opens the online video player and streams your demo video without requesting login.</li>
                </ol>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/50">
              <button
                type="button"
                onClick={() => setTestSubmissionVideo(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-secondary hover:bg-surface-container cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(testSubmissionVideo.webViewLink);
                  window.open(testSubmissionVideo.webViewLink, '_blank', 'noopener,noreferrer');
                  setToastMessage('Link copied! Paste into an Incognito window to verify public viewer.');
                }}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <ExternalLink size={14} />
                <span>Copy &amp; Open in New Window</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
