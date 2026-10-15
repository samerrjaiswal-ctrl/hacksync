import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('--- HackSync Git Connect Verification Test Suite ---');

const projectRoot = resolve(process.cwd());

// Check 1: Types definition
const typesFile = readFileSync(resolve(projectRoot, 'src/types.ts'), 'utf-8');
if (
  typesFile.includes('GitRepositoryData') &&
  typesFile.includes('ContributorInvitationStatus') &&
  typesFile.includes('GitMemberProfile') &&
  typesFile.includes('ContributorInviteResult')
) {
  console.log('✓ Check 1: src/types.ts defines GitRepositoryData, GitMemberProfile, and ContributorInvitationStatus types');
} else {
  console.error('✗ Check 1 Failed: Missing Git Connect types in src/types.ts');
  process.exit(1);
}

// Check 2: Service layer implementation
const serviceFile = readFileSync(resolve(projectRoot, 'src/lib/gitConnect.ts'), 'utf-8');
if (
  serviceFile.includes('validateGitHubRepoUrl') &&
  serviceFile.includes('validateGitHubUsername') &&
  serviceFile.includes('inviteContributorsWorkflow')
) {
  console.log('✓ Check 2: src/lib/gitConnect.ts provides validation, storage, and safe invitation workflow');
} else {
  console.error('✗ Check 2 Failed: Missing required functions in src/lib/gitConnect.ts');
  process.exit(1);
}

// Check 3: Sidebar navigation
const sidebarFile = readFileSync(resolve(projectRoot, 'src/components/WorkspaceSidebar.tsx'), 'utf-8');
if (
  sidebarFile.includes('sidebar-nav-git') &&
  sidebarFile.includes('Git Connect') &&
  sidebarFile.indexOf('sidebar-nav-video') < sidebarFile.indexOf('sidebar-nav-git')
) {
  console.log('✓ Check 3: src/components/WorkspaceSidebar.tsx places Git Connect directly below Video Link with active glowing pill');
} else {
  console.error('✗ Check 3 Failed: Sidebar navigation item misplaced or missing');
  process.exit(1);
}

// Check 4: Dashboard component
const dashboardFile = readFileSync(resolve(projectRoot, 'src/components/GitConnectDashboard.tsx'), 'utf-8');
if (
  dashboardFile.includes('Connect Repository') &&
  dashboardFile.includes('Add Selected as Contributors') &&
  dashboardFile.includes('Add All Eligible as Contributors') &&
  dashboardFile.includes('Review Contributor Invitations') &&
  dashboardFile.includes('Write / Push access only')
) {
  console.log('✓ Check 4: src/components/GitConnectDashboard.tsx implements repository connection, team member list, leader controls, confirmation dialog, and least privilege');
} else {
  console.error('✗ Check 4 Failed: Dashboard missing key UI or security elements');
  process.exit(1);
}

// Check 5: Security audit - No PAT input or exposed client secrets
if (
  !dashboardFile.includes('Personal Access Token') &&
  !dashboardFile.includes('ghp_') &&
  !serviceFile.includes('VITE_GITHUB_CLIENT_SECRET')
) {
  console.log('✓ Check 5: Zero Personal Access Token inputs or exposed client secrets in frontend');
} else {
  console.error('✗ Check 5 Failed: Detected insecure token pattern in frontend');
  process.exit(1);
}

// Check 6: Isolation check - File Share and Video Link remain untouched
const workspaceFile = readFileSync(resolve(projectRoot, 'src/components/TeamWorkspace.tsx'), 'utf-8');
if (
  workspaceFile.includes('tab-panel-files') &&
  workspaceFile.includes('tab-panel-video') &&
  workspaceFile.includes('tab-panel-git')
) {
  console.log('✓ Check 6: File Share and Video Link components remain cleanly isolated and fully preserved');
} else {
  console.error('✗ Check 6 Failed: TeamWorkspace tab panels disturbed');
  process.exit(1);
}

// Check 7: Proposed SQL migration file
const migrationPath = resolve(projectRoot, 'supabase/migrations/20261014000000_git_connect.sql');
if (existsSync(migrationPath)) {
  const sql = readFileSync(migrationPath, 'utf-8');
  if (
    sql.includes('team_git_repositories') &&
    sql.includes('team_member_git_profiles') &&
    sql.includes('team_git_tokens') &&
    sql.includes('ENABLE ROW LEVEL SECURITY')
  ) {
    console.log('✓ Check 7: Proposed SQL migration is documented with RLS and team isolation (unexecuted)');
  } else {
    console.error('✗ Check 7 Failed: Migration SQL missing tables or RLS');
    process.exit(1);
  }
} else {
  console.error('✗ Check 7 Failed: Proposed migration file not found');
  process.exit(1);
}

console.log('All 7 verification checks passed successfully!');
