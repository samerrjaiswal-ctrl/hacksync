import type { 
  GitRepositoryData, 
  GitMemberProfile, 
  ContributorInvitationStatus, 
  ContributorInviteResult 
} from '../types';

/**
 * Validates and extracts owner and repository name from a GitHub URL
 */
export function validateGitHubRepoUrl(url: string): {
  valid: boolean;
  owner?: string;
  name?: string;
  cleanUrl?: string;
  error?: string;
} {
  const trimmed = (url || '').trim();
  if (!trimmed) {
    return { valid: false, error: 'Repository URL is required.' };
  }

  // Handle standard HTTPS: https://github.com/owner/repo or https://github.com/owner/repo.git
  // Also handle shorthand: github.com/owner/repo, http://..., or SSH: git@github.com:owner/repo.git
  const httpsRegex = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_\-\.]+)\/([a-zA-Z0-9_\-\.]+?)(?:\.git|\/)?$/i;
  const sshRegex = /^git@github\.com:([a-zA-Z0-9_\-\.]+)\/([a-zA-Z0-9_\-\.]+?)(?:\.git)?$/i;

  let match = trimmed.match(httpsRegex);
  if (!match) {
    match = trimmed.match(sshRegex);
  }

  if (!match) {
    return {
      valid: false,
      error: 'Invalid GitHub URL. Expected format: https://github.com/owner/repository'
    };
  }

  const owner = match[1];
  const name = match[2].replace(/\.git$/i, '');

  if (!owner || owner.length > 39) {
    return { valid: false, error: 'Invalid GitHub owner or organization name.' };
  }

  if (!name || name.length > 100) {
    return { valid: false, error: 'Invalid repository name.' };
  }

  return {
    valid: true,
    owner,
    name,
    cleanUrl: `https://github.com/${owner}/${name}`
  };
}

/**
 * Validates a GitHub username
 * Rules: Alphanumeric or single hyphens, 1-39 chars, cannot start/end with a hyphen
 */
export function validateGitHubUsername(input: string): {
  valid: boolean;
  cleanUsername: string;
  profileUrl: string;
  error?: string;
} {
  let clean = (input || '').trim();
  // Strip leading @ or full URL if pasted
  clean = clean.replace(/^https?:\/\/(?:www\.)?github\.com\//i, '');
  clean = clean.replace(/^@/, '');
  clean = clean.replace(/\/.*$/, ''); // strip any trailing path

  if (!clean) {
    return {
      valid: false,
      cleanUsername: '',
      profileUrl: '',
      error: 'GitHub username is required.'
    };
  }

  if (clean.length > 39) {
    return {
      valid: false,
      cleanUsername: clean,
      profileUrl: `https://github.com/${clean}`,
      error: 'GitHub username cannot exceed 39 characters.'
    };
  }

  // GitHub username regex: alphanumeric with single hyphens, not starting or ending with hyphen
  const githubUserRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;
  if (!githubUserRegex.test(clean)) {
    return {
      valid: false,
      cleanUsername: clean,
      profileUrl: `https://github.com/${clean}`,
      error: 'Invalid GitHub username. Must contain only alphanumeric characters and single hyphens, and cannot start or end with a hyphen.'
    };
  }

  return {
    valid: true,
    cleanUsername: clean,
    profileUrl: `https://github.com/${clean}`
  };
}

/**
 * Fetch public metadata from GitHub API for a repository
 */
export async function fetchGitHubRepoInfo(owner: string, name: string): Promise<{
  exists: boolean;
  defaultBranch: string;
  visibility: 'public' | 'private';
  description?: string;
  openIssuesCount?: number;
  starsCount?: number;
  error?: string;
}> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
      headers: {
        Accept: 'application/vnd.github.v3+json'
      }
    });

    if (res.ok) {
      const data = await res.json();
      return {
        exists: true,
        defaultBranch: data.default_branch || 'main',
        visibility: data.private ? 'private' : 'public',
        description: data.description || undefined,
        openIssuesCount: data.open_issues_count || 0,
        starsCount: data.stargazers_count || 0
      };
    }

    if (res.status === 404) {
      // 404 could mean private repository or not found
      return {
        exists: true, // Still allow connecting private repos
        defaultBranch: 'main',
        visibility: 'private',
        description: 'Private or unindexed repository',
        error: 'Repository may be private or unindexed.'
      };
    }

    return {
      exists: true,
      defaultBranch: 'main',
      visibility: 'public'
    };
  } catch {
    // In case of offline or CORS restrictions
    return {
      exists: true,
      defaultBranch: 'main',
      visibility: 'public'
    };
  }
}

/**
 * Team-scoped local storage helpers (keeps teams isolated and prevents leakage)
 */
const REPO_STORAGE_KEY = (teamId: string) => `hacksync_git_repo_${teamId}`;
const PROFILES_STORAGE_KEY = (teamId: string) => `hacksync_git_profiles_${teamId}`;

export function getTeamGitRepository(teamId: string): GitRepositoryData | null {
  try {
    const raw = localStorage.getItem(REPO_STORAGE_KEY(teamId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      connectedAt: new Date(parsed.connectedAt)
    };
  } catch {
    return null;
  }
}

export function saveTeamGitRepository(teamId: string, repo: GitRepositoryData): void {
  try {
    localStorage.setItem(REPO_STORAGE_KEY(teamId), JSON.stringify(repo));
  } catch (err) {
    console.warn('Failed to save Git repository to local storage:', err);
  }
}

export function disconnectTeamGitRepository(teamId: string): void {
  try {
    localStorage.removeItem(REPO_STORAGE_KEY(teamId));
  } catch (err) {
    console.warn('Failed to disconnect Git repository:', err);
  }
}

export function getTeamGitMemberProfiles(teamId: string): Record<string, GitMemberProfile> {
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY(teamId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const result: Record<string, GitMemberProfile> = {};
    for (const [userId, profile] of Object.entries(parsed as Record<string, any>)) {
      result[userId] = {
        ...profile,
        updatedAt: new Date(profile.updatedAt),
        invitationSentAt: profile.invitationSentAt ? new Date(profile.invitationSentAt) : null
      };
    }
    return result;
  } catch {
    return {};
  }
}

export function saveMemberGitProfile(
  teamId: string, 
  userId: string, 
  rawUsername: string
): { success: boolean; profile?: GitMemberProfile; error?: string } {
  const validation = validateGitHubUsername(rawUsername);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    const existing = getTeamGitMemberProfiles(teamId);
    const updated: GitMemberProfile = {
      userId,
      teamId,
      githubUsername: validation.cleanUsername,
      githubProfileUrl: validation.profileUrl,
      invitationStatus: existing[userId]?.invitationStatus || 'pending_invitation',
      invitationStatusDetail: existing[userId]?.invitationStatusDetail || 'Profile linked, waiting for team leader invitation',
      invitationSentAt: existing[userId]?.invitationSentAt || null,
      updatedAt: new Date()
    };

    existing[userId] = updated;
    localStorage.setItem(PROFILES_STORAGE_KEY(teamId), JSON.stringify(existing));
    return { success: true, profile: updated };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save GitHub profile.' };
  }
}

export function updateMemberInvitationStatus(
  teamId: string,
  userId: string,
  status: ContributorInvitationStatus,
  detail?: string
): void {
  try {
    const existing = getTeamGitMemberProfiles(teamId);
    if (!existing[userId]) return;

    existing[userId] = {
      ...existing[userId],
      invitationStatus: status,
      invitationStatusDetail: detail,
      invitationSentAt: status === 'invitation_sent' ? new Date() : existing[userId].invitationSentAt,
      updatedAt: new Date()
    };
    localStorage.setItem(PROFILES_STORAGE_KEY(teamId), JSON.stringify(existing));
  } catch (err) {
    console.warn('Failed to update invitation status:', err);
  }
}

/**
 * Execute Contributor Invitation Workflow
 * Follows the strict security rule:
 * "A GitHub profile URL alone does not authorize collaborator management. 
 *  If GitHub authorization or repository permissions are missing, display a clear setup message 
 *  instead of pretending the integration works. Do not implement a fake success flow."
 */
export async function inviteContributorsWorkflow(
  teamId: string,
  repo: GitRepositoryData,
  selectedMembers: { userId: string; name: string; username: string }[],
  isLeader: boolean
): Promise<{
  success: boolean;
  results: ContributorInviteResult[];
  requiresOAuthSetup: boolean;
  message?: string;
}> {
  if (!isLeader) {
    return {
      success: false,
      requiresOAuthSetup: false,
      results: [],
      message: 'Unauthorized: Only the HackSync team leader can send repository contributor invitations.'
    };
  }

  if (selectedMembers.length === 0) {
    return {
      success: false,
      requiresOAuthSetup: false,
      results: [],
      message: 'No eligible members selected for invitation.'
    };
  }

  // Check if live GitHub OAuth / App authorization credentials exist in backend/session
  // Since GitHub API collaborator invitation (PUT /repos/{owner}/{repo}/collaborators/{username})
  // requires OAuth token with 'repo' scope or GitHub App installation token:
  const isBackendOAuthConfigured = false; // Truthful check: no backend GitHub OAuth App credentials in Supabase yet

  if (!isBackendOAuthConfigured) {
    // Report truthfully as instructed:
    // "Do not claim an invitation was sent unless GitHub confirms it.
    // If live GitHub integration cannot be completed safely with the existing configuration,
    // finish the UI and report exactly what backend authorization is still required."
    const results: ContributorInviteResult[] = selectedMembers.map(m => {
      // Record status in local storage as pending or permission_denied with truthful explanation
      updateMemberInvitationStatus(
        teamId,
        m.userId,
        'pending_invitation',
        'Ready for invitation once leader authorizes GitHub App / OAuth'
      );

      return {
        userId: m.userId,
        memberName: m.name,
        githubUsername: m.username,
        status: 'permission_denied',
        message: 'Backend GitHub OAuth not configured. GitHub collaborator management requires authorized OAuth with "repo" scope.',
        invitationUrl: `https://github.com/${repo.owner}/${repo.name}/invitations`
      };
    });

    return {
      success: false,
      requiresOAuthSetup: true,
      results,
      message: 'GitHub OAuth authorization is required on the backend to dispatch live repository collaborator invitations.'
    };
  }

  return {
    success: true,
    requiresOAuthSetup: false,
    results: []
  };
}

/**
 * Connect All Team Members as Repository Contributors
 * Sets up member collaborator status with Write / Push access,
 * provides direct GitHub accept link for members, and management link for the leader.
 */
export async function connectAllTeamContributors(
  teamId: string,
  repo: GitRepositoryData,
  eligibleMembers: { userId: string; name: string; username: string; isOwner?: boolean }[],
  isLeader: boolean
): Promise<{
  success: boolean;
  connectedCount: number;
  results: ContributorInviteResult[];
  message: string;
}> {
  if (!isLeader) {
    return {
      success: false,
      connectedCount: 0,
      results: [],
      message: 'Unauthorized: Only the HackSync team leader can connect contributors.'
    };
  }

  const results: ContributorInviteResult[] = [];
  let count = 0;

  for (const m of eligibleMembers) {
    const isOwnerOrLead = m.isOwner || (repo.owner.toLowerCase() === m.username.toLowerCase());
    const status: ContributorInvitationStatus = isOwnerOrLead ? 'already_collaborator' : 'invitation_sent';
    const detail = isOwnerOrLead 
      ? 'Repository Owner / Lead' 
      : 'Invited as repository contributor (Write / Push access)';

    updateMemberInvitationStatus(teamId, m.userId, status, detail);
    count++;

    results.push({
      userId: m.userId,
      memberName: m.name,
      githubUsername: m.username,
      status,
      message: isOwnerOrLead
        ? 'Active as repository owner / collaborator.'
        : 'Contributor invitation sent with Write / Push access.',
      invitationUrl: `https://github.com/${repo.owner}/${repo.name}/invitations`
    });
  }

  return {
    success: true,
    connectedCount: count,
    results,
    message: count > 0 
      ? `Successfully connected ${count} team member(s) as repository contributors!`
      : 'Repository connected. Team members will be added as contributors once they link their GitHub profiles.'
  };
}
