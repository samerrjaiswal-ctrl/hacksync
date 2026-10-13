import * as React from 'react';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { WorkspaceHeader } from './WorkspaceHeader';
import { UploadZone } from './UploadZone';
import { FileToolbar } from './FileToolbar';
import { FileGrid } from './FileGrid';
import type { FileData, MemberData } from '../types';
import { supabase } from '../lib/supabase';
import { Loader2, Info, AlertCircle, Menu } from 'lucide-react';
import { useWebRTC } from '../hooks/useWebRTC';
import { WorkspaceSidebar, type WorkspaceTab } from './WorkspaceSidebar';
import { DemoVideoLibrary } from './DemoVideoLibrary';

interface TeamWorkspaceProps {
  teamId: string;
  teamName: string;
  onLeave: (kickMessage?: string) => void;
}

const getFileType = (fileName: string): FileData['type'] => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'zip':
    case 'tar':
    case 'gz':
    case 'rar':
      return 'archive';
    case 'pdf':
    case 'doc':
    case 'docx':
    case 'txt':
    case 'pptx':
      return 'doc';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return 'media';
    case 'json':
    case 'sql':
    case 'md':
    case 'js':
    case 'ts':
    case 'tsx':
    case 'jsx':
    case 'html':
    case 'css':
      return 'code';
    case 'xls':
    case 'xlsx':
    case 'csv':
      return 'sheet';
    default:
      return 'unknown';
  }
};

export const TeamWorkspace: React.FC<TeamWorkspaceProps> = ({ teamId, teamName, onLeave }) => {
  const [members, setMembers] = useState<MemberData[]>([]);
  const [files, setFiles] = useState<FileData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [localKeys, setLocalKeys] = useState<Set<string>>(new Set());
  const [actualTeamName, setActualTeamName] = useState<string>(teamName);
  const [joinCode, setJoinCode] = useState<string>('');
  const [isLeaving, setIsLeaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [uploaderFilter, setUploaderFilter] = useState('all');
  const [sortOption, setSortOption] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('files');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState('');

  // Local storage of hosted files (for P2P transfer)
  const hostedFilesRef = useRef<Map<string, File>>(new Map());
  const getFileForTransfer = async (fileId: string) => {
    const inMem = hostedFilesRef.current.get(fileId);
    if (inMem) return inMem;
    try {
      const { getFile } = await import('../lib/indexedDB');
      return await getFile(fileId);
    } catch (e) {
      console.error('Failed to get file from DB', e);
      return undefined;
    }
  };

  const handleFileReceived = useCallback((fileId: string, file: File) => {
    hostedFilesRef.current.set(fileId, file);
    setLocalKeys(prev => {
      const next = new Set(prev);
      next.add(fileId);
      return next;
    });
  }, []);

  const leaderId = members.find(m => m.role === 'owner')?.id || null;
  const isLeader = Boolean(currentUserId && leaderId && currentUserId === leaderId);

  const {
    peers,
    transfers,
    isLeaderOffline,
    requestFile,
    cancelTransfer: _cancelTransfer
  } = useWebRTC(teamId, currentUserId, isLeader, leaderId, getFileForTransfer, handleFileReceived);

  // Keep latest onLeave in a ref so effects don't need to re-subscribe
  const onLeaveRef = useRef(onLeave);
  useEffect(() => { onLeaveRef.current = onLeave; }, [onLeave]);
  const eventsChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const kickedRef = useRef(false);

  const handleKicked = useCallback(() => {
    if (kickedRef.current) return;
    kickedRef.current = true;
    onLeaveRef.current('You have been removed from this team by the leader.');
  }, []);

  const fetchWorkspaceData = useCallback(async () => {
    try {
      const [sessionRes, membersRes, filesRes, teamRes] = await Promise.all([
        supabase.auth.getSession(),
        supabase
          .from('team_members')
          .select('role, user_id, profiles(display_name)')
          .eq('team_id', teamId),
        supabase
          .from('shared_files')
          .select('id, original_filename, size_bytes, created_at, uploader_id, profiles(display_name)')
          .eq('team_id', teamId),
        supabase
          .from('teams')
          .select('name, join_code')
          .eq('id', teamId)
          .single()
      ]);

      if (sessionRes.data.session) {
        setCurrentUserId(sessionRes.data.session.user.id);
      }
      if (teamRes.data) {
        setActualTeamName(teamRes.data.name);
        setJoinCode(teamRes.data.join_code);
      }
      if (membersRes.data) {
        const getSlotColor = (name: string, role: string) => {
          if (role === 'owner') return 'bg-primary text-on-primary';
          const match = name.match(/\(Member (\d)\)/);
          const slot = match ? match[1] : '';
          switch (slot) {
            case '2': return 'bg-cyan-600 text-white';
            case '3': return 'bg-indigo-600 text-white';
            case '4': return 'bg-emerald-600 text-white';
            case '5': return 'bg-amber-600 text-white';
            case '6': return 'bg-purple-600 text-white';
            default: return 'bg-surface-variant text-on-surface';
          }
        };

        const getMemberBadge = (name: string, role?: string) => {
          if (role === 'owner') return (name || 'L').substring(0, 2).toUpperCase();
          const match = name.match(/\(Member (\d)\)/);
          if (match) return `M${match[1]}`;
          return (name || 'U').substring(0, 2).toUpperCase();
        };

        const seenIds = new Set<string>();
        const mappedMembers: MemberData[] = [];
        
        for (const m of membersRes.data as any[]) {
          if (!m.user_id || seenIds.has(m.user_id)) continue;
          seenIds.add(m.user_id);
          const displayName = m.profiles?.display_name || 'Unknown';
          mappedMembers.push({
            id: m.user_id,
            name: displayName,
            initials: getMemberBadge(displayName, m.role),
            colorClass: getSlotColor(displayName, m.role),
            role: m.role === 'owner' ? 'owner' : 'member'
          });
        }

        // Leader first, then the rest
        mappedMembers.sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : 0));
        setMembers(mappedMembers);

        // If we are no longer part of the team, we were removed
        const myId = sessionRes.data.session?.user.id;
        if (myId && !membersRes.error && !mappedMembers.some(m => m.id === myId)) {
          handleKicked();
          return;
        }
      }

      if (filesRes.data) {
        const mappedFiles = filesRes.data.map((f: any) => ({
          id: f.id,
          name: f.original_filename,
          size: f.size_bytes,
          type: getFileType(f.original_filename),
          // Profiles of users who left are hidden by RLS — label them clearly
          uploader: f.profiles?.display_name || 'Former member',
          uploaderId: f.uploader_id,
          uploadedAt: new Date(f.created_at)
        }));
        setFiles(mappedFiles);
      }
    } catch (err) {
      console.error('Failed to fetch workspace data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [teamId, handleKicked]);

  const removeMember = useCallback(async (memberId: string) => {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', memberId);

    if (error) {
      alert(`Failed to remove member: ${error.message}`);
      return false;
    }

    setMembers(prev => prev.filter(m => m.id !== memberId));
    eventsChannelRef.current?.send({ type: 'broadcast', event: 'kick', payload: { userId: memberId } });
    
    return true;
  }, [teamId, members]);

  const handleLeave = async () => {
    setIsLeaving(true);
    if (isLeader) {
      if (confirm('Are you sure you want to end this session? This will completely delete the project and all files.')) {
        await supabase.from('teams').delete().eq('id', teamId);
        
        try {
          const { clearAllDB } = await import('../lib/indexedDB');
          await clearAllDB();
        } catch (e) {
          console.error('Failed to clear local files', e);
        }
        
        eventsChannelRef.current?.send({ type: 'broadcast', event: 'team_deleted', payload: {} });
        
        // Wait 3 seconds as requested before redirect
        await new Promise(r => setTimeout(r, 3000));
      } else {
        setIsLeaving(false);
        return; // Cancelled
      }
    } else if (currentUserId) {
      await supabase.from('team_members').delete().eq('user_id', currentUserId);
      eventsChannelRef.current?.send({ type: 'broadcast', event: 'leave', payload: { userId: currentUserId } });
      // Wait 3 seconds as requested before redirect
      await new Promise(r => setTimeout(r, 3000));
    }
    
    onLeaveRef.current();
  };

  const handleSkipSession = () => {
    // Leader steps out of the workspace to create or join another team without deleting this project
    localStorage.removeItem('hacksync_workspace');
    eventsChannelRef.current?.send({ 
      type: 'broadcast', 
      event: 'leave', 
      payload: { userId: currentUserId } 
    });
    onLeaveRef.current();
  };

  const handleRegenerateCode = async () => {
    if (!isLeader) return;
    const newCode = Math.random().toString(36).substring(2, 10);
    const { data, error } = await supabase
      .from('teams')
      .update({ join_code: newCode })
      .eq('id', teamId)
      .select();
      
    if (error || !data || data.length === 0) {
      alert('Failed to regenerate code. Make sure you are the team leader.');
    } else {
      setJoinCode(newCode);
      // Broadcast to other members so they see it instantly
      eventsChannelRef.current?.send({ 
        type: 'broadcast', 
        event: 'code_regenerated', 
        payload: { newCode } 
      });
    }
  };

  useEffect(() => {
    let mounted = true;

    const fetchLocalKeys = async () => {
      try {
        const { getAllKeysDB } = await import('../lib/indexedDB');
        const keys = await getAllKeysDB();
        if (mounted) setLocalKeys(new Set(keys));
      } catch (e) {
        console.error('Failed to fetch local keys:', e);
      }
    };

    fetchWorkspaceData();
    fetchLocalKeys();

    const eventsChannel = supabase
      .channel(`workspace-${teamId}-events`)
      .on('broadcast', { event: 'kick' }, async ({ payload }) => {
        const { data } = await supabase.auth.getSession();
        if (payload?.userId && payload.userId === data.session?.user.id) {
          handleKicked();
        } else if (payload?.userId) {
          setMembers(prev => prev.filter(m => m.id !== payload.userId));
        }
      })
      .on('broadcast', { event: 'leave' }, ({ payload }) => {
        if (payload?.userId) {
          setMembers(prev => prev.filter(m => m.id !== payload.userId));
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'teams', filter: `id=eq.${teamId}` }, (payload: any) => {
        if (payload.new && payload.new.join_code) {
          setJoinCode(payload.new.join_code);
        }
      })
      .on('broadcast', { event: 'code_regenerated' }, ({ payload }) => {
        if (payload?.newCode) {
          setJoinCode(payload.newCode);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members', filter: `team_id=eq.${teamId}` }, (payload: any) => {
        if (payload.eventType === 'DELETE') {
          setMembers(prev => prev.filter(m => m.id !== payload.old.user_id));
        } else {
          setTimeout(fetchWorkspaceData, 500);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_files', filter: `team_id=eq.${teamId}` }, (payload: any) => {
        if (payload.eventType === 'DELETE') {
          setFiles(prev => prev.filter(f => f.id !== payload.old.id));
        } else {
          setTimeout(fetchWorkspaceData, 500);
        }
      })
      .on('broadcast', { event: 'refresh' }, () => {
        fetchWorkspaceData();
      })
      .on('broadcast', { event: 'team_deleted' }, () => {
        alert('Project deleted by leader.');
        onLeaveRef.current();
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          eventsChannel.send({ type: 'broadcast', event: 'refresh', payload: {} });
        }
      });
    eventsChannelRef.current = eventsChannel;

    return () => {
      mounted = false;
      eventsChannel.unsubscribe();
      eventsChannelRef.current = null;
    };
  }, [teamId, handleKicked, fetchWorkspaceData]);



  const uploaders = useMemo(() => {
    const uniqueUploaders = new Set(files.map(f => f.uploader));
    return Array.from(uniqueUploaders);
  }, [files]);

  const filteredAndSortedFiles = useMemo(() => {
    let result = files.filter(f => {
      const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || f.type === typeFilter;
      const matchesUploader = uploaderFilter === 'all' || f.uploader === uploaderFilter;
      return matchesSearch && matchesType && matchesUploader;
    });

    result.sort((a, b) => {
      switch (sortOption) {
        case 'newest': return b.uploadedAt.getTime() - a.uploadedAt.getTime();
        case 'oldest': return a.uploadedAt.getTime() - b.uploadedAt.getTime();
        case 'size': return b.size - a.size;
        case 'name': return a.name.localeCompare(b.name);
        default: return 0;
      }
    });

    return result;
  }, [files, searchQuery, typeFilter, uploaderFilter, sortOption]);

  const [showP2PNotice, setShowP2PNotice] = useState(false);

  const handleUpload = async (newFiles: File[]) => {
    if (newFiles.length === 0 || !currentUserId) return;
    
    setIsUploading(true);

    try {
      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        setUploadFileName(file.name);
        setUploadProgress(50); // Fake progress for metadata insertion
        
        const fileId = window.crypto.randomUUID();

        // Store the file locally in memory and IndexedDB FIRST
        try {
          // If file is very large (> 50MB), only store in memory Map to avoid freezing the browser with IndexedDB cloning
          if (file.size < 50 * 1024 * 1024) {
            const { storeFile } = await import('../lib/indexedDB');
            await storeFile(fileId, file);
          } else {
            console.warn(`File ${file.name} is larger than 50MB, keeping only in memory to prevent browser freeze.`);
          }
          
          hostedFilesRef.current.set(fileId, file);
          setLocalKeys(prev => { const n = new Set(prev); n.add(fileId); return n; });
        } catch (e) {
          console.error('IndexedDB storage failed', e);
          throw new Error('Failed to persist file locally.');
        }

        // Insert metadata into shared_files
        const { error: dbError } = await supabase
          .from('shared_files')
          .insert({
            id: fileId,
            team_id: teamId,
            uploader_id: currentUserId,
            original_filename: file.name,
            size_bytes: file.size,
            mime_type: file.type || 'application/octet-stream',
            storage_ref: null // Explicitly null, no cloud storage used
          });

        if (dbError) {
          // Rollback local storage
          const { deleteFileDB } = await import('../lib/indexedDB');
          await deleteFileDB(fileId);
          hostedFilesRef.current.delete(fileId);
          setLocalKeys(prev => { const n = new Set(prev); n.delete(fileId); return n; });
          throw new Error(`Database error: ${dbError.message}`);
        }

        setUploadProgress(100);
      }
      
      await fetchWorkspaceData();
      eventsChannelRef.current?.send({ type: 'broadcast', event: 'refresh', payload: {} });
      
      setShowP2PNotice(true);
      setTimeout(() => setShowP2PNotice(false), 5000);
    } catch (err: any) {
      console.error('Failed to announce file:', err);
      alert(err.message || 'Failed to announce file');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadFileName('');
    }
  };

  const cancelUpload = () => {
    setIsUploading(false);
    setUploadProgress(0);
    setUploadFileName('');
  };

  const handleDeleteFile = async (fileId: string) => {
    // Delete from Supabase
    const { error } = await supabase.from('shared_files').delete().eq('id', fileId);
    if (error) {
      alert(`Failed to delete file: ${error.message}`);
      return;
    }

    // Delete locally
    try {
      const { deleteFileDB } = await import('../lib/indexedDB');
      await deleteFileDB(fileId);
      hostedFilesRef.current.delete(fileId);
      setLocalKeys(prev => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
    } catch (err) {
      console.error('Failed to delete file locally', err);
    }
    
    // Always refresh and notify peers regardless of local DB success
    await fetchWorkspaceData();
    eventsChannelRef.current?.send({ type: 'broadcast', event: 'refresh', payload: {} });
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-surface flex flex-col items-center justify-center text-secondary gap-3">
        <Loader2 size={32} className="animate-spin text-primary" />
        <span className="font-label-md">Syncing workspace manifest...</span>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-surface flex">
      {/* Left Menu Bar with HackSync Brand Color & Logo */}
      <WorkspaceSidebar 
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        filesCount={files.length}
        peersCount={peers.length}
        teamName={actualTeamName}
        isOpenOnMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Right Content Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 h-14 bg-surface-container-lowest border-b border-outline-variant">
          <div className="w-full h-14 px-4 sm:px-gutter-desktop flex items-center justify-between gap-space-md">
            <div className="flex items-center gap-2 sm:gap-space-md">
              <button
                id="mobile-nav-toggle"
                type="button"
                onClick={() => setIsMobileSidebarOpen(prev => !prev)}
                className="p-1.5 text-on-surface-variant hover:text-primary rounded-lg hover:bg-surface-container md:hidden transition-colors cursor-pointer"
                aria-label="Toggle navigation menu"
              >
                <Menu size={20} />
              </button>
              <div className="flex items-center gap-space-xs font-mono-metadata text-mono-metadata text-on-surface-variant">
                <span className="px-space-xs py-0.5 bg-surface-container rounded text-on-surface font-mono-code text-mono-code font-semibold">SPRINT-24</span>
                <span className="text-outline">/</span>
                <span className="font-semibold text-primary">{activeTab === 'files' ? 'file-share' : 'demo-video-library'}</span>
              </div>
            </div>
            <div className="flex items-center gap-space-lg">
               <div className="hidden sm:flex items-center gap-1.5 font-mono-metadata text-mono-metadata bg-surface-container-low px-space-sm py-1 rounded border border-outline-variant text-on-surface-variant">
                 <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
                 <span>{members.length}/6 LIVE</span>
               </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="w-full px-gutter-desktop py-6 min-h-[calc(100vh-3.5rem)] max-w-7xl mx-auto flex-1 flex flex-col">
          {isLeaderOffline && !isLeader && (
            <div className="mb-4 bg-error-container text-on-error-container px-4 py-3 rounded-xl flex items-center gap-3 font-medium animate-fade-in shadow-sm border border-error/20">
              <AlertCircle size={20} className="shrink-0 text-error" />
              <span>⚠️ Team Leader is offline. Peer-to-peer transfers are paused until they return.</span>
            </div>
          )}

          <WorkspaceHeader 
            teamName={actualTeamName}
            joinCode={joinCode}
            members={members}
            currentUserId={currentUserId}
            onLeave={handleLeave} 
            onSkipSession={handleSkipSession}
            onRemoveMember={removeMember}
            onRegenerateCode={handleRegenerateCode}
            isLeaving={isLeaving}
          />

          {/* SCREEN 1: File Share */}
          {activeTab === 'files' ? (
            <div className="flex flex-col gap-1 animate-fade-in">
              <UploadZone 
                onUpload={handleUpload}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
                uploadFileName={uploadFileName}
                cancelUpload={cancelUpload}
              />

              {showP2PNotice && (
                <div className="mb-4 bg-primary-container text-on-primary-container p-3 rounded flex items-center gap-2 text-label-sm animate-fade-in">
                  <Info size={16} />
                  <span>File announced to the network. You must keep this tab open for others to download it.</span>
                </div>
              )}

              <FileToolbar 
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                typeFilter={typeFilter}
                setTypeFilter={setTypeFilter}
                uploaderFilter={uploaderFilter}
                setUploaderFilter={setUploaderFilter}
                sortOption={sortOption}
                setSortOption={setSortOption}
                viewMode={viewMode}
                setViewMode={setViewMode}
                uploaders={uploaders}
              />

              <div className="relative min-h-[460px]">
                <FileGrid 
                  files={filteredAndSortedFiles} 
                  viewMode={viewMode} 
                  currentUserId={currentUserId}
                  peers={peers}
                  transfers={transfers}
                  onRequestFile={requestFile}
                  localKeys={localKeys}
                  onDeleteFile={handleDeleteFile}
                  isLeader={isLeader}
                />
              </div>
            </div>
          ) : (
            /* SCREEN 2: Google Drive Demo Video Library */
            <DemoVideoLibrary 
              teamId={teamId}
              teamName={actualTeamName}
              members={members}
              currentUserId={currentUserId}
              isLeader={isLeader}
            />
          )}
        </main>
      </div>
    </div>
  );
};





