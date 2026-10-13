import * as React from 'react';
import { useState, useEffect, useMemo, useRef } from 'react';
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
  RefreshCw,
  Plus
} from 'lucide-react';
import type { MemberData, DemoVideoData, GoogleDriveStatus } from '../types';
import { 
  getGoogleDriveStatus, 
  getGoogleAuthUrl, 
  disconnectGoogleDrive, 
  fetchTeamVideos, 
  uploadDemoVideo, 
  deleteDemoVideo,
  completeOAuthCallback
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

  const loadVideos = async () => {
    setIsLoadingVideos(true);
    try {
      const list = await fetchTeamVideos(teamId);
      setVideos(list);
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
    if (!confirm('Are you sure you want to disconnect Google Drive for this team? Existing uploaded video links will remain, but new uploads will be paused until reconnected.')) {
      return;
    }

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
        (pct) => setUploadProgress(pct)
      );

      setUploadSuccess(true);
      setVideos(prev => [newVideo, ...prev]);
      setToastMessage(`"${newVideo.title}" uploaded to Google Drive successfully!`);

      // Reset form after short delay
      setTimeout(() => {
        setIsUploadOpen(false);
        setSelectedFile(null);
        setVideoTitle('');
        setVideoDescription('');
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
      setToastMessage(`Deleted "${video.title}"`);
    } catch (err: any) {
      setToastMessage(`Failed to delete video: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

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
    <div className="w-full flex flex-col gap-6 animate-fade-in pb-16">
      
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
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Demo Video Library</span>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold">
                  GOOGLE DRIVE
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Share your team's demo videos using Google Drive.
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
            onClick={loadVideos}
            className="p-1.5 text-secondary hover:text-primary rounded-lg hover:bg-surface-container transition-colors"
            title="Refresh videos"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Videos Grid / State Rendering */}
      {isLoadingVideos ? (
        <div className="flex flex-col items-center justify-center p-16 text-secondary gap-3 bg-surface-container-lowest rounded-xl border border-outline-variant/60 shadow-2xs">
          <Loader2 size={32} className="animate-spin text-primary" />
          <span className="text-xs font-medium">Loading demo videos...</span>
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
                className="group relative bg-surface-container-lowest hover:bg-surface-container-low border border-outline-variant/60 hover:border-primary/40 rounded-xl p-4 shadow-2xs transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Header: Badge & Actions */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono-code font-semibold uppercase bg-cyan-50 text-cyan-800 border border-cyan-200">
                      {video.mimeType.split('/').pop() || 'VIDEO'}
                    </span>

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
                    <div className="w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 group-hover/thumb:scale-110 transition-transform shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                      <Play size={20} className="ml-0.5 fill-cyan-400" />
                    </div>
                    <span className="absolute bottom-2 right-2 text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-black/70 text-slate-300">
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

                  {/* Action Buttons: Real Google Drive Link Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    {/* 1. Copy Drive Link */}
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

                    {/* 2. Open in Google Drive */}
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
              <div className="flex items-center gap-2">
                <Video size={20} className="text-primary" />
                <h3 className="font-semibold text-base text-on-surface">Upload Demo Video</h3>
              </div>
              <button 
                onClick={() => {
                  if (!isUploading) setIsUploadOpen(false);
                }}
                disabled={isUploading}
                className="p-1 text-secondary hover:text-on-surface rounded-lg hover:bg-surface-container"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleStartUpload} className="flex flex-col gap-4">
              
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
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                  selectedFile 
                    ? 'border-emerald-500 bg-emerald-50/20' 
                    : 'border-outline-variant hover:border-primary/60 bg-surface-container-low hover:bg-surface-container'
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
                  <div className="flex flex-col items-center gap-1.5">
                    <Check size={32} className="text-emerald-500 mb-1" />
                    <span className="font-semibold text-xs text-on-surface truncate max-w-xs">{selectedFile.name}</span>
                    <span className="text-[11px] text-secondary font-mono-metadata">{formatFileSize(selectedFile.size)}</span>
                    <span className="text-[10px] text-primary hover:underline mt-1">Click to choose another file</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <UploadCloud size={36} className="text-primary/70 mb-1" />
                    <span className="text-xs font-semibold text-on-surface">Drag & drop video file here, or</span>
                    <button 
                      type="button"
                      className="px-3 py-1.5 rounded-lg bg-surface-container-highest text-primary font-semibold text-xs border border-outline-variant hover:bg-surface-container"
                    >
                      Browse Videos
                    </button>
                    <span className="text-[10px] text-secondary mt-1">Supports MP4, WebM, MOV (Max standard Drive quota)</span>
                  </div>
                )}
              </div>

              {/* Video Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface">
                  Video Title <span className="text-error">*</span>
                </label>
                <input 
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="e.g. Sprint 24 Final Demo & Pitch"
                  required
                  disabled={isUploading}
                  className="w-full px-3 py-2 bg-surface text-on-surface text-xs rounded-lg border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                />
              </div>

              {/* Optional Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface">
                  Description <span className="text-secondary font-normal">(Optional)</span>
                </label>
                <textarea 
                  value={videoDescription}
                  onChange={(e) => setVideoDescription(e.target.value)}
                  placeholder="Key highlights, timestamp markers, or submission notes..."
                  rows={2}
                  disabled={isUploading}
                  className="w-full px-3 py-2 bg-surface text-on-surface text-xs rounded-lg border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs resize-none"
                />
              </div>

              {/* Progress Bar & Error Display */}
              {isUploading && (
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-surface-container-low border border-outline-variant/60">
                  <div className="flex items-center justify-between text-xs font-semibold text-on-surface">
                    <span className="flex items-center gap-1.5">
                      <Loader2 size={14} className="animate-spin text-primary" />
                      <span>Uploading to Google Drive...</span>
                    </span>
                    <span className="font-mono-code text-primary">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-200 rounded-full" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="p-3 rounded-lg bg-error-container text-on-error-container text-xs flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span>{uploadError}</span>
                    <button
                      type="button"
                      onClick={handleStartUpload}
                      className="text-xs font-bold underline mt-1 text-left"
                    >
                      Retry Upload
                    </button>
                  </div>
                </div>
              )}

              {uploadSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center gap-2">
                  <Check size={16} className="text-emerald-600" />
                  <span>Video uploaded successfully to Google Drive!</span>
                </div>
              )}

              {/* Bottom Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-outline-variant/50">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  disabled={isUploading}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-secondary hover:bg-surface-container disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile || !videoTitle.trim()}
                  className="px-5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold shadow-sm transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isUploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-3xl bg-[#090D16] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
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

            <div className="p-4 bg-[#0A0F1D] border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span>Google Drive File ID: <code className="font-mono-code text-slate-300">{previewVideo.googleFileId}</code></span>
              <button
                onClick={() => handleCopyLink(previewVideo)}
                className="text-cyan-400 hover:underline flex items-center gap-1"
              >
                <Copy size={12} />
                <span>Copy Share Link</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          OAUTH CONFIGURATION SETUP GUIDE MODAL
          ======================================================== */}
      {isSetupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-xl bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
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

    </div>
  );
};
