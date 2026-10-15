import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import type { 
  MemberData, 
  GitRepositoryData, 
  GitMemberProfile, 
  ContributorInviteResult 
} from '../types';
import { 
  validateGitHubRepoUrl, 
  validateGitHubUsername,
  fetchGitHubRepoInfo, 
  getTeamGitRepository, 
  saveTeamGitRepository, 
  disconnectTeamGitRepository, 
  getTeamGitMemberProfiles, 
  saveMemberGitProfile, 
  connectAllTeamContributors
} from '../lib/gitConnect';
import { 
  GitBranch, 
  ExternalLink, 
  Check, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  Crown, 
  User, 
  Lock, 
  Info, 
  X, 
  ShieldCheck, 
  UserCheck, 
  UserPlus, 
  Send,
  Loader2,
  CheckCircle2,
  Sparkles,
  Copy
} from 'lucide-react';

// Crisp GitHub Octocat SVG Icon matching existing UI style
const GithubIcon: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 20 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    aria-hidden="true"
  >
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

interface GitConnectDashboardProps {
  teamId: string;
  teamName: string;
  members: MemberData[];
  currentUserId: string | null;
  isLeader: boolean;
}

export const GitConnectDashboard: React.FC<GitConnectDashboardProps> = ({
  teamId,
  teamName,
  members,
  currentUserId,
  isLeader
}) => {
  // Repository Connection State
  const [repository, setRepository] = useState<GitRepositoryData | null>(null);
  const [stagedRepoData, setStagedRepoData] = useState<GitRepositoryData | null>(null);
  const [repoUrlInput, setRepoUrlInput] = useState('');
  const [leaderUsernameInput, setLeaderUsernameInput] = useState('');
  const [inlineUsernameInput, setInlineUsernameInput] = useState('');
  const [isValidatingRepo, setIsValidatingRepo] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [isEditingRepoUrl, setIsEditingRepoUrl] = useState(false);

  // Members' GitHub Profiles
  const [profiles, setProfiles] = useState<Record<string, GitMemberProfile>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selection for Leader Contributor Invites
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [inviteResults, setInviteResults] = useState<ContributorInviteResult[] | null>(null);

  // Edit My GitHub Profile Modal
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [myUsernameInput, setMyUsernameInput] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);

  // Setup Guide Modal
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);

  // 1. Initial Load of Team Repository and Member Profiles
  const loadGitData = () => {
    const savedRepo = getTeamGitRepository(teamId);
    setRepository(savedRepo);
    if (savedRepo) {
      setRepoUrlInput(savedRepo.repoUrl);
    }

    const savedProfiles = getTeamGitMemberProfiles(teamId);
    setProfiles(savedProfiles);

    if (currentUserId && savedProfiles[currentUserId]?.githubUsername) {
      if (isLeader) {
        setLeaderUsernameInput(savedProfiles[currentUserId].githubUsername);
      }
    }
  };

  const handleRefreshStatus = () => {
    setIsRefreshingStatus(true);
    loadGitData();
    setTimeout(() => {
      setIsRefreshingStatus(false);
      setToastMessage('Contributor invitation statuses refreshed.');
    }, 450);
  };

  useEffect(() => {
    loadGitData();
  }, [teamId]);

  // Toast Auto-Hide
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Handle Connect Repository (Leader only) - Opens Permission Prompt Modal to add all as contributors
  const handleConnectRepository = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLeader) {
      setRepoError('Only the team leader can connect or modify the repository.');
      return;
    }

    const validation = validateGitHubRepoUrl(repoUrlInput);
    if (!validation.valid || !validation.owner || !validation.name) {
      setRepoError(validation.error || 'Invalid GitHub repository URL.');
      return;
    }

    // If leader entered their own GitHub username, validate and stage it
    if (leaderUsernameInput.trim() && currentUserId) {
      const leaderVal = saveMemberGitProfile(teamId, currentUserId, leaderUsernameInput.trim());
      if (!leaderVal.success) {
        setRepoError(leaderVal.error || 'Invalid leader GitHub username.');
        return;
      }
      setProfiles(prev => ({
        ...prev,
        [currentUserId]: leaderVal.profile!
      }));
    }

    setIsValidatingRepo(true);
    setRepoError(null);

    try {
      const repoInfo = await fetchGitHubRepoInfo(validation.owner, validation.name);

      const leaderMember = members.find(m => m.id === currentUserId);
      const newRepoData: GitRepositoryData = {
        teamId,
        repoUrl: validation.cleanUrl!,
        owner: validation.owner,
        name: validation.name,
        defaultBranch: repoInfo.defaultBranch,
        visibility: repoInfo.visibility,
        connectedBy: leaderMember?.name || 'Team Leader',
        connectedAt: new Date(),
        description: repoInfo.description,
        openIssuesCount: repoInfo.openIssuesCount,
        starsCount: repoInfo.starsCount
      };

      setStagedRepoData(newRepoData);

      // Pre-select all eligible members who have linked usernames
      const activeProfiles = getTeamGitMemberProfiles(teamId);
      const readyMemberIds = new Set<string>();
      for (const m of members) {
        const prof = activeProfiles[m.id] || (m.id === currentUserId && leaderUsernameInput.trim() ? { githubUsername: leaderUsernameInput.trim() } : null);
        if (prof?.githubUsername) {
          readyMemberIds.add(m.id);
        }
      }
      setSelectedUserIds(readyMemberIds);

      // Open the Permission Modal asking: "Connect all as contributor?"
      setIsConfirmModalOpen(true);
    } catch (err: any) {
      setRepoError(err.message || 'Failed to connect repository.');
    } finally {
      setIsValidatingRepo(false);
    }
  };

  // Handle Disconnect Repository
  const handleDisconnectRepository = () => {
    if (!isLeader) return;
    disconnectTeamGitRepository(teamId);
    setRepository(null);
    setStagedRepoData(null);
    setRepoUrlInput('');
    setIsEditingRepoUrl(false);
    setSelectedUserIds(new Set());
    setToastMessage('Repository disconnected from team.');
  };

  // Open Update Profile Modal for current user
  const handleOpenEditMyProfile = () => {
    if (!currentUserId) return;
    const currentProfile = profiles[currentUserId];
    setMyUsernameInput(currentProfile?.githubUsername || '');
    setProfileError(null);
    setIsEditProfileModalOpen(true);
  };

  // Save My GitHub Profile
  const handleSaveMyProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) return;

    const res = saveMemberGitProfile(teamId, currentUserId, myUsernameInput);
    if (!res.success || !res.profile) {
      setProfileError(res.error || 'Failed to save GitHub profile.');
      return;
    }

    // If repository is already connected, automatically connect this member as contributor!
    if (repository) {
      connectAllTeamContributors(
        teamId,
        repository,
        [{
          userId: currentUserId,
          name: members.find(m => m.id === currentUserId)?.name || 'Member',
          username: res.profile.githubUsername,
          isOwner: isLeader
        }],
        true
      );
    }

    const updated = getTeamGitMemberProfiles(teamId);
    setProfiles(updated);

    setIsEditProfileModalOpen(false);
    setToastMessage(`GitHub identity @${res.profile.githubUsername} linked!`);
  };

  // Save inline profile for current user
  const handleSaveInlineProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !inlineUsernameInput.trim()) return;

    const validation = validateGitHubUsername(inlineUsernameInput);
    if (!validation.valid) {
      setToastMessage(validation.error || 'Invalid GitHub username.');
      return;
    }

    const res = saveMemberGitProfile(teamId, currentUserId, inlineUsernameInput);
    if (!res.success || !res.profile) {
      setToastMessage(res.error || 'Failed to save GitHub profile.');
      return;
    }

    // If repository is already connected, automatically connect this member as contributor!
    if (repository) {
      connectAllTeamContributors(
        teamId,
        repository,
        [{
          userId: currentUserId,
          name: members.find(m => m.id === currentUserId)?.name || 'Member',
          username: res.profile.githubUsername,
          isOwner: isLeader
        }],
        true
      );
    }

    const updated = getTeamGitMemberProfiles(teamId);
    setProfiles(updated);
    setInlineUsernameInput('');
    setToastMessage(`GitHub identity @${res.profile.githubUsername} linked and contributor status updated!`);
  };

  // Members list with their linked GitHub profiles
  const teamMembersWithGit = useMemo(() => {
    return members.map(m => {
      const profile = profiles[m.id];
      const hasUsername = Boolean(profile?.githubUsername);
      const isAlreadyCollaborator = profile?.invitationStatus === 'already_collaborator';
      const isEligible = hasUsername && !isAlreadyCollaborator;

      return {
        member: m,
        profile,
        hasUsername,
        isAlreadyCollaborator,
        isEligible
      };
    });
  }, [members, profiles]);

  // Eligible members for leader invites
  const eligibleMembers = useMemo(() => {
    return teamMembersWithGit.filter(item => item.isEligible);
  }, [teamMembersWithGit]);

  // Handle toggle select member
  const handleToggleSelectMember = (userId: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // Handle select all eligible
  const handleSelectAllEligible = () => {
    if (selectedUserIds.size === eligibleMembers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(eligibleMembers.map(item => item.member.id)));
    }
  };

  // Trigger Contributor Invitation Review Modal
  const handleOpenInviteConfirmation = () => {
    if (!isLeader) {
      setToastMessage('Only the team leader can send contributor invitations.');
      return;
    }

    if (!repository) {
      setToastMessage('Please connect a GitHub repository first.');
      return;
    }

    if (selectedUserIds.size === 0) {
      setToastMessage('Please select at least one eligible member to invite.');
      return;
    }

    setIsConfirmModalOpen(true);
  };

  // Execute Confirmed Invitations - Connects all eligible members as contributors
  const handleExecuteInvitations = async () => {
    const targetRepo = stagedRepoData || repository;
    if (!targetRepo || !isLeader) return;

    setIsInviting(true);
    try {
      // 1. Commit repository connection
      saveTeamGitRepository(teamId, targetRepo);
      setRepository(targetRepo);
      setIsEditingRepoUrl(false);

      // 2. Identify all eligible members to connect
      const currentSavedProfiles = getTeamGitMemberProfiles(teamId);
      const membersToConnect = members
        .filter(m => selectedUserIds.size === 0 || selectedUserIds.has(m.id))
        .map(m => {
          const prof = currentSavedProfiles[m.id];
          return {
            userId: m.id,
            name: m.name,
            username: prof?.githubUsername || '',
            isOwner: m.role === 'owner'
          };
        })
        .filter(m => Boolean(m.username));

      // 3. Connect all as contributors with Write / Push access
      const result = await connectAllTeamContributors(
        teamId,
        targetRepo,
        membersToConnect,
        isLeader
      );

      // 4. Refresh local profiles state
      const updatedProfiles = getTeamGitMemberProfiles(teamId);
      setProfiles(updatedProfiles);

      setInviteResults(result.results);
      setIsConfirmModalOpen(false);
      setStagedRepoData(null);
      setToastMessage(result.message);
    } catch (err: any) {
      setToastMessage(err.message || 'Failed to connect contributors.');
    } finally {
      setIsInviting(false);
    }
  };

  // Copy all member usernames to clipboard
  const handleCopyUsernames = () => {
    const usernames = teamMembersWithGit
      .filter(item => item.hasUsername)
      .map(item => item.profile?.githubUsername)
      .filter(Boolean)
      .join(', ');

    if (usernames) {
      navigator.clipboard.writeText(usernames);
      setToastMessage(`Copied usernames to clipboard: ${usernames}`);
    } else {
      setToastMessage('No GitHub usernames linked yet.');
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in text-on-surface">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/90 text-white border border-cyan-500/40 shadow-xl text-xs font-medium backdrop-blur-md animate-fade-in">
          <Sparkles size={14} className="text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
          <button 
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Header Banner - Matching Video Link Aesthetics */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0A0F1D] via-[#0F172A] to-[#0A0F1D] border border-cyan-500/20 shadow-xl p-6 text-white">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              <GitBranch size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2 flex-wrap">
                <span>Git Connect</span>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold flex items-center gap-1">
                  <GithubIcon size={12} />
                  <span>GITHUB</span>
                </span>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
                  COLLABORATORS
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Connect {teamName}'s GitHub repository and contributors.
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2.5">
            {repository && (
              <a
                href={repository.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                title="Open connected repository on GitHub"
              >
                <ExternalLink size={13} />
                <span>Open Repository</span>
              </a>
            )}
            <button
              onClick={() => setIsSetupModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-colors cursor-pointer"
              title="View GitHub OAuth setup documentation"
            >
              <ShieldCheck size={14} />
              <span>OAuth Setup</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          CARD 1: REPOSITORY CONNECTION CARD
          ======================================================== */}
      <div className="w-full rounded-2xl bg-surface-container-lowest/85 dark:bg-[#0A0F1D]/85 backdrop-blur-2xl border border-outline-variant/60 p-5 shadow-2xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-white shrink-0 shadow-sm">
              <GithubIcon size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-on-surface">Repository Connection</h3>
                {repository ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-code font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Connected</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-code font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    <span>Not Connected</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-secondary mt-0.5">
                {repository 
                  ? `Connected to ${repository.owner}/${repository.name} (${repository.visibility})`
                  : 'Link the team GitHub repository and invite members as contributors.'}
              </p>
            </div>
          </div>

          {/* Action buttons on right */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {repository && isLeader && !isEditingRepoUrl && (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditingRepoUrl(true)}
                  className="px-3 py-1.5 rounded-lg border border-outline-variant hover:bg-surface-container text-xs text-secondary hover:text-on-surface font-medium transition-colors cursor-pointer"
                >
                  Change Repository
                </button>
                <button
                  type="button"
                  onClick={handleDisconnectRepository}
                  className="px-3 py-1.5 rounded-lg border border-error/30 hover:bg-error-container/20 text-xs text-error font-medium transition-colors cursor-pointer"
                  title="Disconnect repository from team"
                >
                  Disconnect
                </button>
              </>
            )}
            {repository && (
              <a
                href={repository.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
              >
                <ExternalLink size={13} />
                <span>Open Repository</span>
              </a>
            )}
          </div>
        </div>

        {/* Repository URL & Leader GitHub Input Form (Leader Only) */}
        {(!repository || isEditingRepoUrl) && (
          isLeader ? (
            <form onSubmit={handleConnectRepository} className="flex flex-col gap-3.5 p-4 rounded-xl bg-surface-container-low/70 dark:bg-slate-900/40 backdrop-blur-xs border border-outline-variant/60">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                  <GitBranch size={14} className="text-cyan-500" />
                  <span>Connect Team GitHub Repository &amp; Contributors</span>
                </label>
                <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-mono-code font-semibold">1-Click Team Setup</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. Repository URL Input */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-secondary">
                    GitHub Repository URL <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <GitBranch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                    <input
                      type="text"
                      value={repoUrlInput}
                      onChange={(e) => {
                        setRepoUrlInput(e.target.value);
                        if (repoError) setRepoError(null);
                      }}
                      placeholder="https://github.com/owner/repository"
                      required
                      disabled={isValidatingRepo}
                      className="w-full pl-9 pr-3 py-2 bg-surface text-on-surface text-xs font-mono-code rounded-lg border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                    />
                  </div>
                  <span className="text-[10px] text-secondary">e.g. https://github.com/owner/repository</span>
                </div>

                {/* 2. Leader's GitHub Username / Profile Input */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-secondary flex items-center justify-between">
                    <span>Your Leader GitHub Profile</span>
                    <span className="text-[10px] font-mono-code text-cyan-600 dark:text-cyan-400 font-semibold">Leader Identity</span>
                  </label>
                  <div className="relative">
                    <GithubIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                    <input
                      type="text"
                      value={leaderUsernameInput}
                      onChange={(e) => {
                        setLeaderUsernameInput(e.target.value);
                        if (repoError) setRepoError(null);
                      }}
                      placeholder="e.g. torvalds or https://github.com/torvalds"
                      disabled={isValidatingRepo}
                      className="w-full pl-9 pr-3 py-2 bg-surface text-on-surface text-xs font-mono-code rounded-lg border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                    />
                  </div>
                  <span className="text-[10px] text-secondary">Your personal GitHub username or profile link</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-outline-variant/40">
                <div className="flex items-center gap-1.5 text-xs text-secondary">
                  <Sparkles size={14} className="text-cyan-500 shrink-0" />
                  <span>Clicking Connect will ask permission to add all eligible team members as contributors.</span>
                </div>

                <div className="flex items-center gap-2">
                  {isEditingRepoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingRepoUrl(false);
                        setRepoError(null);
                      }}
                      className="px-3.5 py-2 rounded-lg text-xs font-medium text-secondary hover:bg-surface-container"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isValidatingRepo || !repoUrlInput.trim()}
                    className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {isValidatingRepo ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                    <span>{isValidatingRepo ? 'Validating...' : 'Connect Repository'}</span>
                  </button>
                </div>
              </div>

              {repoError && (
                <div className="p-2.5 rounded-lg bg-error-container text-on-error-container text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{repoError}</span>
                </div>
              )}
            </form>
          ) : (
            <div className="p-4 rounded-xl bg-surface-container-low text-xs text-secondary flex items-start gap-2.5">
              <Info size={16} className="text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-on-surface block mb-0.5">Awaiting Repository Setup</span>
                <span>The HackSync team leader has not connected a GitHub repository yet. Once connected, you can view the repository and receive collaborator invitations.</span>
              </div>
            </div>
          )
        )}

        {/* Connected Repository Metadata Grid */}
        {repository && !isEditingRepoUrl && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-surface-container-low/70 dark:bg-slate-900/40 backdrop-blur-xs border border-outline-variant/60 text-xs">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase font-mono-metadata text-secondary">Owner / Org</span>
              <span className="font-semibold text-on-surface truncate">{repository.owner}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase font-mono-metadata text-secondary">Repository</span>
              <span className="font-semibold text-on-surface truncate">{repository.name}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase font-mono-metadata text-secondary">Default Branch</span>
              <span className="font-mono-code text-cyan-600 dark:text-cyan-400 flex items-center gap-1 font-semibold">
                <GitBranch size={12} />
                <span>{repository.defaultBranch}</span>
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase font-mono-metadata text-secondary">Connected At</span>
              <span className="font-mono-metadata text-secondary">
                {repository.connectedAt.toLocaleDateString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          CARD 2: TEAM GITHUB CONTRIBUTORS
          ======================================================== */}
      <div className="w-full rounded-2xl bg-surface-container-lowest/85 dark:bg-[#0A0F1D]/85 backdrop-blur-2xl border border-outline-variant/60 p-5 shadow-2xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/50">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-on-surface">Team GitHub Contributors</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-code font-semibold bg-surface-container-high text-secondary border border-outline-variant/60">
                {teamMembersWithGit.filter(t => t.hasUsername).length}/{members.length} Linked
              </span>
            </div>
            <p className="text-xs text-secondary mt-0.5">
              HackSync members and their linked GitHub identities for repository collaboration.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyUsernames}
              className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface border border-outline-variant/60 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copy all linked GitHub usernames to clipboard"
            >
              <Copy size={13} className="text-secondary" />
              <span>Copy Usernames</span>
            </button>
            <button
              onClick={handleOpenEditMyProfile}
              className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface border border-outline-variant/60 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <UserPlus size={13} className="text-primary" />
              <span>Link / Update My GitHub</span>
            </button>
            <button
              onClick={handleRefreshStatus}
              disabled={isRefreshingStatus}
              className="p-1.5 text-secondary hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
              title="Refresh contributor list"
            >
              <RefreshCw size={15} className={isRefreshingStatus ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Quick Link Input for Current User if not linked yet */}
        {currentUserId && !profiles[currentUserId]?.githubUsername && (
          <form 
            onSubmit={handleSaveInlineProfile}
            className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                <GithubIcon size={16} />
              </div>
              <div>
                <span className="text-xs font-semibold text-on-surface block">
                  Link Your GitHub Profile
                </span>
                <span className="text-[11px] text-secondary">
                  Enter your username to connect as a repository contributor with Write / Push access.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inlineUsernameInput}
                onChange={(e) => setInlineUsernameInput(e.target.value)}
                placeholder="e.g. torvalds or @username"
                className="px-3 py-1.5 text-xs font-mono-code rounded-lg bg-surface border border-outline-variant text-on-surface focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs w-48"
              />
              <button
                type="submit"
                disabled={!inlineUsernameInput.trim()}
                className="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold shadow-xs hover:bg-primary/90 disabled:opacity-50 cursor-pointer shrink-0"
              >
                Save &amp; Connect
              </button>
            </div>
          </form>
        )}

        {/* Member Contributor Rows */}
        <div className="flex flex-col divide-y divide-outline-variant/40">
          {teamMembersWithGit.map(({ member, profile, hasUsername, isEligible }) => {
            const isCurrentUser = member.id === currentUserId;
            const isMemberLeader = member.role === 'owner';
            const isSelected = selectedUserIds.has(member.id);

            return (
              <div 
                key={member.id} 
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-container-lowest/50 rounded-lg px-2 transition-colors"
              >
                {/* Left: Member Identity & Checkbox for Leader */}
                <div className="flex items-center gap-3">
                  {isLeader && isEligible && repository && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectMember(member.id)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant cursor-pointer"
                      title={`Select ${member.name} for invitation`}
                    />
                  )}

                  <div className={`w-9 h-9 rounded-full ${member.colorClass} text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0`}>
                    {member.initials}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-xs text-on-surface">
                        {member.name}
                      </span>
                      {isCurrentUser && (
                        <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-surface-container-high text-secondary">
                          You
                        </span>
                      )}
                      {isMemberLeader ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center gap-0.5">
                          <Crown size={10} />
                          <span>Leader</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-surface-container text-secondary flex items-center gap-0.5">
                          <User size={10} />
                          <span>Member</span>
                        </span>
                      )}
                    </div>

                    {/* GitHub identity display */}
                    <div className="flex items-center gap-2 mt-0.5 text-xs">
                      {hasUsername ? (
                        <a
                          href={profile!.githubProfileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono-code text-primary hover:underline flex items-center gap-1 text-[11px]"
                        >
                          <GithubIcon size={12} />
                          <span>@{profile!.githubUsername}</span>
                          <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span className="text-[11px] text-secondary italic">
                          GitHub profile not linked yet
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Invitation Status & Individual Actions */}
                <div className="flex items-center gap-2 self-start sm:self-auto ml-12 sm:ml-0">
                  {/* Status Badge */}
                  {hasUsername ? (
                    profile?.invitationStatus === 'already_collaborator' ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono-code font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <Check size={11} />
                        <span>Contributor</span>
                      </span>
                    ) : profile?.invitationStatus === 'invitation_sent' ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono-code font-semibold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                        <Send size={11} />
                        <span>Invitation Sent</span>
                      </span>
                    ) : profile?.invitationStatus === 'pending_invitation' ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono-code font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                        <Clock size={11} />
                        <span>Pending Connect</span>
                      </span>
                    ) : profile?.invitationStatus === 'permission_denied' ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono-code font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1" title={profile.invitationStatusDetail}>
                        <Lock size={11} />
                        <span>Requires Setup</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono-code font-medium bg-slate-100 dark:bg-slate-800 text-secondary border border-outline-variant flex items-center gap-1">
                        <span>Profile Linked</span>
                      </span>
                    )
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono-code text-secondary border border-outline-variant/60">
                      Not Linked
                    </span>
                  )}

                  {/* Member action: Link / Edit Profile */}
                  {isCurrentUser && (
                    <button
                      onClick={handleOpenEditMyProfile}
                      className="px-2.5 py-1 rounded-md text-xs font-medium text-secondary hover:text-on-surface hover:bg-surface-container border border-outline-variant/50 cursor-pointer"
                    >
                      {hasUsername ? 'Edit' : 'Link'}
                    </button>
                  )}

                  {/* Member action: Accept Invitation Link if invited */}
                  {repository && hasUsername && (
                    <a
                      href={`https://github.com/${repository.owner}/${repository.name}/invitations`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1 shadow-xs"
                      title="Open GitHub invitations page to accept collaborator access"
                    >
                      <ExternalLink size={12} />
                      <span>Accept on GitHub</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================
          CARD 3: LEADER INVITATION CONTROLS (Leader Only)
          ======================================================== */}
      {isLeader && (
        <div className="w-full rounded-2xl bg-surface-container-lowest/85 dark:bg-[#0A0F1D]/85 backdrop-blur-2xl border border-outline-variant/60 p-5 shadow-2xs flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-outline-variant/50">
            <div className="flex items-center gap-2.5">
              <UserCheck size={18} className="text-primary" />
              <div>
                <h3 className="font-semibold text-sm text-on-surface">Leader Controls</h3>
                <p className="text-[11px] text-secondary">Manage team repository collaborator permissions and invitations.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {repository && (
                <a
                  href={`https://github.com/${repository.owner}/${repository.name}/settings/access`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
                  title="Open GitHub collaborator settings"
                >
                  <ExternalLink size={13} />
                  <span>GitHub Collaborators Settings</span>
                </a>
              )}

              <button
                type="button"
                onClick={handleRefreshStatus}
                disabled={isRefreshingStatus}
                className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/60 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Refresh contributor invitation status across all members"
              >
                <RefreshCw size={13} className={isRefreshingStatus ? 'animate-spin' : ''} />
                <span>Refresh Invitation Status</span>
              </button>

              <button
                type="button"
                onClick={handleOpenInviteConfirmation}
                disabled={selectedUserIds.size === 0 || !repository || isInviting}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title="Review member details before dispatching invitations"
              >
                <ShieldCheck size={13} />
                <span>Review Contributor Requests ({selectedUserIds.size})</span>
              </button>
            </div>
          </div>

          <div className="text-xs text-secondary leading-relaxed p-3 rounded-xl bg-surface-container-low/70 dark:bg-slate-900/40 backdrop-blur-xs border border-outline-variant/50 flex items-start gap-2">
            <Lock size={15} className="text-primary shrink-0 mt-0.5" />
            <span>
              Select eligible team members who have linked their GitHub usernames. When you confirm, the workflow will prepare repository invitations granting <strong>Write / Push access only</strong> (least privilege).
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSelectAllEligible}
                disabled={eligibleMembers.length === 0}
                className="text-xs font-semibold text-primary hover:underline disabled:opacity-50 cursor-pointer"
              >
                {selectedUserIds.size === eligibleMembers.length && eligibleMembers.length > 0
                  ? 'Deselect All'
                  : `Select Eligible Members (${eligibleMembers.length})`}
              </button>
              <span className="text-xs text-secondary">
                {selectedUserIds.size} of {eligibleMembers.length} eligible member(s) selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenInviteConfirmation}
                disabled={selectedUserIds.size === 0 || !repository || isInviting}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold shadow-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Send size={13} />
                <span>Add Selected as Contributors</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedUserIds(new Set(eligibleMembers.map(item => item.member.id)));
                  if (eligibleMembers.length > 0 && repository) {
                    setIsConfirmModalOpen(true);
                  }
                }}
                disabled={eligibleMembers.length === 0 || !repository || isInviting}
                className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/60 text-xs font-semibold flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <UserCheck size={13} />
                <span>Add All Eligible as Contributors</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 1: EDIT MY GITHUB PROFILE
          ======================================================== */}
      {isEditProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-md flex items-start justify-center p-3 pt-6 sm:pt-10 overflow-y-auto animate-fade-in">
          <div className="w-full max-w-md bg-surface-container-lowest/85 dark:bg-[#0A0F1D]/85 backdrop-blur-2xl border border-outline-variant/60 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col gap-3 my-2">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/50">
              <div className="flex items-center gap-2">
                <GithubIcon size={18} className="text-on-surface" />
                <h3 className="font-semibold text-sm text-on-surface">Link GitHub Identity</h3>
              </div>
              <button
                onClick={() => setIsEditProfileModalOpen(false)}
                className="p-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveMyProfile} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-on-surface">
                  GitHub Username or Profile URL <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={myUsernameInput}
                  onChange={(e) => {
                    setMyUsernameInput(e.target.value);
                    if (profileError) setProfileError(null);
                  }}
                  placeholder="e.g. torvalds or https://github.com/torvalds"
                  required
                  className="w-full px-2.5 py-1.5 bg-surface/75 dark:bg-slate-900/60 backdrop-blur-xs text-on-surface text-xs font-mono-code rounded-lg border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                />
              </div>

              {/* Live Preview */}
              {myUsernameInput.trim() && (
                <div className="p-2.5 rounded-xl bg-surface-container-low/70 dark:bg-slate-900/40 backdrop-blur-xs border border-outline-variant/60 flex items-center gap-2.5">
                  <img
                    src={`https://github.com/${myUsernameInput.trim().replace(/^@/, '').replace(/^https?:\/\/github\.com\//, '')}.png`}
                    alt="GitHub Avatar Preview"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                    className="w-8 h-8 rounded-full border border-outline-variant bg-slate-800 shrink-0"
                  />
                  <div className="flex flex-col min-w-0 text-xs">
                    <span className="font-semibold text-on-surface truncate">
                      @{myUsernameInput.trim().replace(/^@/, '').replace(/^https?:\/\/github\.com\//, '')}
                    </span>
                    <span className="text-[10px] text-secondary font-mono-code truncate">
                      github.com/{myUsernameInput.trim().replace(/^@/, '').replace(/^https?:\/\/github\.com\//, '')}
                    </span>
                  </div>
                </div>
              )}

              {profileError && (
                <div className="p-2 rounded-lg bg-error-container text-on-error-container text-[11px] flex items-center gap-1.5">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              <p className="text-[10px] text-secondary leading-tight">
                Your GitHub username is shared with the team leader so you can be added as a collaborator to the project repository.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/40">
                <button
                  type="button"
                  onClick={() => setIsEditProfileModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-secondary hover:bg-surface-container cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!myUsernameInput.trim()}
                  className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: CONFIRM CONTRIBUTOR INVITATIONS (Leader Only)
          Permission Dialog: Connect all team members as contributors
          ======================================================== */}
      {isConfirmModalOpen && (repository || stagedRepoData) && (
        <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-md flex items-start justify-center p-3 pt-6 sm:pt-10 overflow-y-auto animate-fade-in">
          <div className="w-full max-w-lg bg-surface-container-lowest/85 dark:bg-[#0A0F1D]/85 backdrop-blur-2xl border border-outline-variant/60 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col gap-3.5 my-2">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/50">
              <div className="flex items-center gap-2">
                <Send size={18} className="text-primary" />
                <h3 className="font-semibold text-sm text-on-surface">
                  Connect Repository &amp; Add All as Contributors?
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsConfirmModalOpen(false);
                  setStagedRepoData(null);
                }}
                className="p-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="text-xs text-secondary leading-relaxed flex flex-col gap-2">
              <p>
                Do you want to connect this repository and grant <strong>Write / Push contributor access</strong> to your team members?
              </p>
              <div className="p-2.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800 text-cyan-800 dark:text-cyan-300 font-mono-code font-semibold flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <GitBranch size={14} />
                  <span>{(stagedRepoData || repository)?.owner}/{(stagedRepoData || repository)?.name}</span>
                </div>
                <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 font-bold">
                  Write / Push access only
                </span>
              </div>
            </div>

            {/* Team Members List to be Added */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-on-surface">Team Contributors to be Added:</span>
              <div className="max-h-52 overflow-y-auto flex flex-col gap-1.5 p-2 rounded-xl bg-surface-container-low/70 dark:bg-slate-900/40 backdrop-blur-xs border border-outline-variant/60">
                {members.map(member => {
                  const prof = profiles[member.id];
                  const hasUser = Boolean(prof?.githubUsername);
                  return (
                    <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-container text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full ${member.colorClass} text-white flex items-center justify-center font-bold text-[10px]`}>
                          {member.initials}
                        </div>
                        <span className="font-semibold text-on-surface">{member.name}</span>
                        {member.role === 'owner' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30">
                            LEADER
                          </span>
                        )}
                      </div>
                      {hasUser ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-mono-code font-semibold">
                          <CheckCircle2 size={13} />
                          <span>@{prof!.githubUsername}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-secondary italic">
                          Will connect once username is entered
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-surface-container text-[11px] text-secondary flex items-start gap-1.5 leading-normal">
              <ShieldCheck size={14} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Review Contributor Invitations:</strong> Invitations grant <strong>Write / Push access only</strong>. Members can immediately accept invitations at <code className="text-cyan-500 font-mono-code">github.com/{(stagedRepoData || repository)?.owner}/{(stagedRepoData || repository)?.name}/invitations</code>.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/40">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmModalOpen(false);
                  setStagedRepoData(null);
                }}
                disabled={isInviting}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-secondary hover:bg-surface-container cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteInvitations}
                disabled={isInviting}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isInviting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                <span>{isInviting ? 'Connecting Team...' : 'Yes, Connect All as Contributors'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: INVITATION RESULTS DISPLAY
          ======================================================== */}
      {inviteResults && (
        <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-md flex items-start justify-center p-3 pt-6 sm:pt-10 overflow-y-auto animate-fade-in">
          <div className="w-full max-w-lg bg-surface-container-lowest/85 dark:bg-[#0A0F1D]/85 backdrop-blur-2xl border border-outline-variant/60 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col gap-3.5 my-2">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/50">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-500" />
                <h3 className="font-semibold text-sm text-on-surface">Team Contributor Setup Complete</h3>
              </div>
              <button
                onClick={() => setInviteResults(null)}
                className="p-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-secondary leading-relaxed">
              All eligible team members have been added as contributors to the repository.
            </p>

            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
              {inviteResults.map(res => (
                <div key={res.userId} className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60 flex items-center justify-between text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-on-surface">{res.memberName} (@{res.githubUsername})</span>
                    <span className="text-[11px] text-secondary">{res.message}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono-code font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                    <Check size={11} />
                    <span>CONTRIBUTOR</span>
                  </span>
                </div>
              ))}
            </div>

            {repository && (
              <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="text-secondary">Direct GitHub Links:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href={`https://github.com/${repository.owner}/${repository.name}/invitations`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] flex items-center gap-1"
                  >
                    <ExternalLink size={11} />
                    <span>Accept Invites Link</span>
                  </a>
                  <a
                    href={`https://github.com/${repository.owner}/${repository.name}/settings/access`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant/60 font-medium text-[11px] flex items-center gap-1"
                  >
                    <ExternalLink size={11} />
                    <span>Manage on GitHub</span>
                  </a>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-outline-variant/40">
              <button
                type="button"
                onClick={() => {
                  setInviteResults(null);
                  setIsSetupModalOpen(true);
                }}
                className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <ShieldCheck size={13} />
                <span>View GitHub Setup Guide</span>
              </button>
              <button
                type="button"
                onClick={() => setInviteResults(null)}
                className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold shadow-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 4: GITHUB SETUP / OAUTH CONFIGURATION GUIDE
          ======================================================== */}
      {isSetupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-md flex items-start justify-center p-3 pt-4 sm:pt-8 overflow-y-auto animate-fade-in">
          <div className="w-full max-w-xl bg-surface-container-lowest/85 dark:bg-[#0A0F1D]/85 backdrop-blur-2xl border border-outline-variant/60 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col gap-3 my-2">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/50">
              <div className="flex items-center gap-2">
                <GithubIcon size={18} className="text-on-surface" />
                <h3 className="font-semibold text-sm text-on-surface">GitHub Integration &amp; Security Setup</h3>
              </div>
              <button
                onClick={() => setIsSetupModalOpen(false)}
                className="p-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="text-xs text-secondary leading-relaxed flex flex-col gap-3">
              <p>
                HackSync uses a safe architecture: private account secrets and raw tokens are never accepted in browser forms to safeguard your GitHub credentials.
              </p>

              <div className="flex flex-col gap-2 p-3 rounded-xl bg-surface-container-low border border-outline-variant/60">
                <span className="font-semibold text-on-surface text-xs flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-primary" />
                  <span>How Direct Collaboration Works</span>
                </span>
                <ul className="list-disc pl-4 space-y-1 text-[11px]">
                  <li>Team leader connects the repository and confirms contributor permissions.</li>
                  <li>Team members link their personal GitHub usernames.</li>
                  <li>Invitations are generated granting <strong>Write (Push)</strong> access only.</li>
                  <li>Members accept their repository invitation at <code className="text-primary font-mono-code">github.com/owner/repo/invitations</code>.</li>
                </ul>
              </div>

              <div className="flex flex-col gap-2 p-3 rounded-xl bg-surface-container-low border border-outline-variant/60">
                <span className="font-semibold text-on-surface text-xs flex items-center gap-1.5">
                  <Lock size={14} className="text-primary" />
                  <span>Backend Automated OAuth Integration (Optional)</span>
                </span>
                <p className="text-[11px]">
                  To automatically dispatch invites via GitHub's REST API without manual confirmation links, register a GitHub OAuth App with <code className="text-primary font-mono-code">repo</code> scope in Supabase Secrets.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-outline-variant/40">
              <button
                type="button"
                onClick={() => setIsSetupModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold shadow-xs cursor-pointer"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
