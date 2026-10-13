import * as React from 'react';
import { Copy, Users, LogOut, Check, User, Crown, UserMinus, X, Loader2 } from 'lucide-react';
import type { MemberData } from '../types';

interface WorkspaceHeaderProps {
  teamName: string;
  joinCode?: string;
  members: MemberData[];
  currentUserId: string | null;
  onLeave: () => void;
  onSkipSession?: () => void;
  onRemoveMember: (memberId: string) => Promise<boolean>;
  onRegenerateCode?: () => Promise<void>;
  isLeaving?: boolean;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({ teamName, joinCode, members, currentUserId, onLeave, onSkipSession, onRemoveMember, onRegenerateCode, isLeaving }) => {
  const [copied, setCopied] = React.useState(false);
  const [rosterOpen, setRosterOpen] = React.useState(false);
  const [confirmId, setConfirmId] = React.useState<string | null>(null);
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const rosterRef = React.useRef<HTMLDivElement>(null);

  const copyJoinCode = () => {
    if (!joinCode) return;
    navigator.clipboard.writeText(joinCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const currentUser = members.find(m => m.id === currentUserId);
  const isLeader = currentUser?.role === 'owner';

  // Close roster on outside click / Escape
  React.useEffect(() => {
    if (!rosterOpen) return;
    const onClick = (e: MouseEvent) => {
      if (rosterRef.current && !rosterRef.current.contains(e.target as Node)) {
        setRosterOpen(false);
        setConfirmId(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setRosterOpen(false); setConfirmId(null); }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [rosterOpen]);

  const handleRemove = async (memberId: string) => {
    setRemovingId(memberId);
    await onRemoveMember(memberId);
    // Keep the loading spinner for 3 seconds as requested
    await new Promise(resolve => setTimeout(resolve, 3000));
    setRemovingId(null);
    setConfirmId(null);
  };

  const handleRegenerate = async () => {
    if (!onRegenerateCode) return;
    setIsRegenerating(true);
    try {
      await onRegenerateCode();
      await new Promise(resolve => setTimeout(resolve, 800)); // small delay for visual feedback
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="w-full bg-surface-container-lowest border border-outline-variant/60 shadow-xs rounded-xl px-space-md py-2.5 mb-space-sm flex flex-col md:flex-row md:items-center md:justify-between gap-space-sm">
      <div className="flex items-center gap-3">
        <h1 className="font-headline-sm text-headline-sm text-on-surface uppercase tracking-wider font-semibold">
          {teamName}
        </h1>
        {joinCode && (
          <div className="flex items-center gap-1">
            <div 
              onClick={copyJoinCode}
              className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary font-mono-code text-mono-code rounded cursor-pointer transition-colors"
              title="Copy Join Code"
            >
              <span>{joinCode}</span>
              {copied ? <Check size={14} /> : <Copy size={14} className="opacity-70" />}
            </div>
            {isLeader && onRegenerateCode && (
              <button 
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="p-1.5 text-secondary hover:text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-50"
                title="Regenerate Team Code"
              >
                {isRegenerating ? (
                  <Loader2 size={14} className="animate-spin text-primary" />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between md:justify-end gap-space-sm flex-wrap">
        
        {currentUser && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container-low border border-outline-variant/60 rounded-lg">
            {isLeader ? <Crown size={14} className="text-primary" /> : <User size={14} className="text-primary" />}
            <span className="font-label-sm text-label-sm text-on-surface font-medium">{currentUser.name}</span>
          </div>
        )}

        <div className="h-4 w-px bg-outline-variant"></div>

        <div className="relative" ref={rosterRef}>
          <button
            id="team-roster-toggle"
            onClick={() => { setRosterOpen(o => !o); setConfirmId(null); }}
            className={`flex items-center gap-1.5 px-2.5 py-1 border rounded-lg transition-colors cursor-pointer group ${rosterOpen ? 'bg-primary/10 border-primary/40' : 'bg-surface-container-low hover:bg-surface-container border-outline-variant/60'}`}
            title="Open team membership roster"
            aria-expanded={rosterOpen}
          >
            <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
            <span className="font-label-sm text-label-sm text-on-surface font-medium group-hover:text-primary transition-colors">{members.length}/6 members</span>
            <div className="flex items-center -space-x-1 ml-1 overflow-hidden">
              {members.map(member => (
                <span key={member.id} className={`w-5 h-5 rounded-full ${member.colorClass} font-mono-metadata text-[9px] flex items-center justify-center font-bold ring-1 ring-surface-container-lowest`} title={member.name}>
                  {member.initials}
                </span>
              ))}
            </div>
            <Users className="text-outline group-hover:text-primary ml-0.5" size={15} />
          </button>

          {rosterOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 z-40 bg-surface-container-lowest border border-outline-variant/70 rounded-xl shadow-lg overflow-hidden animate-fade-in">
              <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/60 bg-surface-container-low">
                <div>
                  <div className="font-label-md text-on-surface font-semibold">Team Members</div>
                  <div className="text-xs text-secondary">{members.length} of 6 slots filled</div>
                </div>
                <button
                  onClick={() => { setRosterOpen(false); setConfirmId(null); }}
                  className="p-1 rounded hover:bg-surface-container text-secondary hover:text-on-surface transition-colors"
                  aria-label="Close roster"
                >
                  <X size={16} />
                </button>
              </div>

              <ul className="max-h-80 overflow-y-auto py-1">
                {members.map(member => {
                  const isSelf = member.id === currentUserId;
                  const isOwner = member.role === 'owner';
                  const canRemove = isLeader && !isSelf && !isOwner;
                  const confirming = confirmId === member.id;
                  const removing = removingId === member.id;

                  return (
                    <li key={member.id} className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${confirming ? 'bg-error-container/20' : 'hover:bg-surface-container-low'}`}>
                      <span className={`w-8 h-8 shrink-0 rounded-full ${member.colorClass} font-mono-metadata text-[11px] flex items-center justify-center font-bold`}>
                        {member.initials}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-on-surface truncate">{member.name}</span>
                          {isSelf && <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-secondary font-medium">You</span>}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-secondary">
                          {isOwner ? (<><Crown size={11} className="text-primary" /><span className="text-primary font-medium">Leader</span></>) : <span>Member</span>}
                        </div>
                      </div>

                      {canRemove && (
                        confirming ? (
                          <div className="flex items-center gap-1">
                            <button
                              id={`confirm-remove-${member.id}`}
                              onClick={() => handleRemove(member.id)}
                              disabled={removing}
                              className="px-2 py-1 text-xs font-medium rounded bg-error text-on-error hover:opacity-90 disabled:opacity-60 flex items-center gap-1"
                            >
                              {removing ? <Loader2 size={12} className="animate-spin" /> : null}
                              Remove
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              disabled={removing}
                              className="px-2 py-1 text-xs font-medium rounded text-secondary hover:bg-surface-container"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            id={`remove-member-${member.id}`}
                            onClick={() => setConfirmId(member.id)}
                            className="p-1.5 rounded text-secondary hover:text-error hover:bg-error-container/30 transition-colors"
                            title={`Remove ${member.name}`}
                          >
                            <UserMinus size={16} />
                          </button>
                        )
                      )}
                    </li>
                  );
                })}
              </ul>

              {!isLeader && (
                <div className="px-4 py-2 border-t border-outline-variant/60 text-[11px] text-secondary bg-surface-container-low">
                  Only the team leader can remove members.
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="h-4 w-px bg-outline-variant"></div>
        
        {isLeader && onSkipSession ? (
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={onSkipSession}
              disabled={isLeaving}
              className="font-label-sm text-[11px] leading-tight text-secondary hover:text-primary hover:bg-primary/10 border border-outline-variant/80 hover:border-primary/40 px-2 py-0.5 rounded transition-all flex items-center gap-1 font-medium cursor-pointer shadow-2xs"
              title="Skip session and go offline (workspace remains saved)"
            >
              <LogOut size={12} className="text-primary rotate-180" />
              <span>Skip Session</span>
            </button>
            <button 
              onClick={onLeave}
              disabled={isLeaving}
              className="font-label-sm text-[11px] leading-tight text-error/90 hover:text-error hover:bg-error-container/20 px-2 py-0.5 rounded transition-colors flex items-center gap-1 font-medium disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer" 
              title="End session (deletes project and all files)"
            >
              {isLeaving ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />}
              <span>{isLeaving ? 'Ending...' : 'End Session'}</span>
            </button>
          </div>
        ) : (
          <button 
            onClick={onLeave}
            disabled={isLeaving}
            className="font-label-sm text-label-sm text-error/90 hover:text-error hover:bg-error-container/20 px-2 py-1 rounded transition-colors flex items-center gap-1 font-medium disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer" 
            title="Leave workspace"
          >
            {isLeaving ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
            <span>{isLeaving ? 'Leaving...' : 'Leave'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
