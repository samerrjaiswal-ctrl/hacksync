import * as React from 'react';
import { FolderSync, Video, Signal, X } from 'lucide-react';

export type WorkspaceTab = 'files' | 'video';

interface WorkspaceSidebarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  filesCount: number;
  peersCount: number;
  teamName: string;
  isOpenOnMobile?: boolean;
  onCloseMobile?: () => void;
}

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  activeTab,
  onSelectTab,
  filesCount,
  peersCount,
  teamName,
  isOpenOnMobile = false,
  onCloseMobile,
}) => {
  const handleSelectTab = (tab: WorkspaceTab) => {
    onSelectTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenOnMobile && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 max-w-[80vw] bg-[#0A0F1D] border-r border-[#192238] flex flex-col justify-between h-screen select-none shadow-2xl transition-transform duration-300 ease-in-out
        ${isOpenOnMobile ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:w-64 md:shrink-0 md:sticky md:top-0 md:z-40
      `}>
        {/* Top Header with Logo & Mobile Close */}
        <div className="flex flex-col">
          <div className="h-16 px-5 flex items-center justify-between border-b border-[#192238]/80 bg-[#080C18]/90">
            <div className="relative flex items-center">
              <img 
                src="/logo.png" 
                alt="HackSync Logo" 
                className="h-8 w-auto drop-shadow-[0_0_12px_rgba(0,196,255,0.4)]" 
              />
            </div>
            {onCloseMobile && (
              <button 
                type="button"
                onClick={onCloseMobile}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 md:hidden transition-colors"
                aria-label="Close navigation"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Navigation Section */}
          <div className="p-4 flex flex-col gap-3">
            <div className="px-2 pt-2 pb-1 text-[11px] font-mono-metadata tracking-wider uppercase text-slate-400 font-semibold flex items-center justify-between">
              <span>Workspaces</span>
              <span className="text-[10px] text-cyan-400 font-mono-code">v2.4</span>
            </div>

            {/* BOX 1: File Share */}
            <button
              id="sidebar-nav-files"
              onClick={() => handleSelectTab('files')}
              className={`group relative text-left w-full p-3.5 rounded-xl transition-all cursor-pointer flex flex-col gap-2 ${
                activeTab === 'files'
                  ? 'bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-[#0F172A] border border-cyan-400/60 shadow-[0_0_25px_rgba(6,182,212,0.2)] text-white'
                  : 'bg-[#0E1528]/50 hover:bg-[#131C35] border border-slate-800/80 hover:border-slate-700/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              {/* Active Glow Pill */}
              {activeTab === 'files' && (
                <span className="absolute left-0 top-3 bottom-3 w-1 bg-cyan-400 rounded-r-full shadow-[0_0_8px_#22d3ee]"></span>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    activeTab === 'files'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/40 shadow-inner'
                    : 'bg-slate-800/70 text-slate-400 group-hover:text-cyan-300'
                }`}>
                  <FolderSync size={18} />
                </div>
                <div>
                  <div className={`font-semibold text-sm tracking-tight ${activeTab === 'files' ? 'text-white' : 'text-slate-200'}`}>
                    File Share
                  </div>
                  <div className="text-[11px] text-slate-400 font-normal">
                    P2P local sync
                  </div>
                </div>
              </div>

              <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono-code font-semibold ${
                activeTab === 'files'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'bg-slate-800/80 text-slate-400'
              }`}>
                {filesCount}
              </span>
            </div>
          </button>

          {/* BOX 2: Video Link */}
          <button
            id="sidebar-nav-video"
            onClick={() => handleSelectTab('video')}
            className={`group relative text-left w-full p-3.5 rounded-xl transition-all cursor-pointer flex flex-col gap-2 ${
              activeTab === 'video'
                ? 'bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-[#0F172A] border border-cyan-400/60 shadow-[0_0_25px_rgba(6,182,212,0.2)] text-white'
                : 'bg-[#0E1528]/50 hover:bg-[#131C35] border border-slate-800/80 hover:border-slate-700/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            {/* Active Glow Pill */}
            {activeTab === 'video' && (
              <span className="absolute left-0 top-3 bottom-3 w-1 bg-cyan-400 rounded-r-full shadow-[0_0_8px_#22d3ee]"></span>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                  activeTab === 'video'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/40 shadow-inner'
                    : 'bg-slate-800/70 text-slate-400 group-hover:text-cyan-300'
                }`}>
                  <Video size={18} />
                </div>
                <div>
                  <div className={`font-semibold text-sm tracking-tight ${activeTab === 'video' ? 'text-white' : 'text-slate-200'}`}>
                    Video Link
                  </div>
                  <div className="text-[11px] text-slate-400 font-normal">
                    Demo Library
                  </div>
                </div>
              </div>

              <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono-code font-semibold flex items-center gap-1 ${
                activeTab === 'video'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'bg-slate-800/80 text-slate-400'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                <span>DRIVE</span>
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Network Status Panel */}
      <div className="p-4 border-t border-[#192238]/80 bg-[#080C18]/90 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-300 font-medium truncate max-w-[140px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
            <span className="truncate">{teamName || 'Workspace'}</span>
          </div>
          <span className="text-[10px] font-mono-metadata px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400">
            ONLINE
          </span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-lg bg-[#0C1222] border border-[#192238] text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Signal size={13} className="text-cyan-400" />
            <span>P2P Peers</span>
          </div>
          <strong className="text-white font-mono-code">{peersCount} Active</strong>
        </div>
      </div>
    </aside>
    </>
  );
};
