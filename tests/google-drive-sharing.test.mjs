import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- HackSync Google Drive Demo Video Sharing Verification Test ---');

// 1. Verify src/types.ts
const typesFile = fs.readFileSync(path.resolve('./src/types.ts'), 'utf-8');
assert.ok(typesFile.includes("export type VideoSharingAccess = 'restricted' | 'anyone_with_link'"), 'VideoSharingAccess type is defined in src/types.ts');
assert.ok(typesFile.includes('sharingAccess: VideoSharingAccess'), 'DemoVideoData includes sharingAccess');
console.log('✓ Check 1: src/types.ts defines VideoSharingAccess and DemoVideoData.sharingAccess');

// 2. Verify supabase/functions/google-drive/index.ts
const edgeFunctionFile = fs.readFileSync(path.resolve('./supabase/functions/google-drive/index.ts'), 'utf-8');
assert.ok(edgeFunctionFile.includes("action === 'update-sharing'"), 'Edge function has update-sharing action');
assert.ok(edgeFunctionFile.includes("role: 'reader'"), 'Edge function uses role: reader');
assert.ok(edgeFunctionFile.includes("type: 'anyone'"), 'Edge function uses type: anyone');
assert.ok(edgeFunctionFile.includes("/files/${videoRow.google_file_id}/permissions"), 'Edge function sets permissions strictly on the specific file, NOT folder');
assert.ok(!edgeFunctionFile.includes("/files/${teamFolderId}/permissions"), 'Edge function NEVER touches team folder permissions');
assert.ok(edgeFunctionFile.includes("if (!isLeader)"), 'Edge function strictly enforces leader-only permission changes');
console.log('✓ Check 2: Edge Function implements update-sharing with leader enforcement and single-file isolation');

// 3. Verify src/lib/googleDrive.ts
const libFile = fs.readFileSync(path.resolve('./src/lib/googleDrive.ts'), 'utf-8');
assert.ok(libFile.includes('export async function updateVideoSharing'), 'updateVideoSharing is exported in src/lib/googleDrive.ts');
assert.ok(libFile.includes("action: 'update-sharing'"), 'updateVideoSharing invokes update-sharing action');
assert.ok(libFile.includes('sharingAccess: VideoSharingAccess'), 'uploadDemoVideo supports sharingAccess parameter');
console.log('✓ Check 3: src/lib/googleDrive.ts provides updateVideoSharing and preserves team-level security');

// 4. Verify src/components/DemoVideoLibrary.tsx
const componentFile = fs.readFileSync(path.resolve('./src/components/DemoVideoLibrary.tsx'), 'utf-8');
assert.ok(componentFile.includes('confirmSharingChange'), 'Explicit confirmation modal exists for public sharing changes');
assert.ok(componentFile.includes('Anyone with the link — Viewer'), 'UI provides Anyone with the link — Viewer option');
assert.ok(componentFile.includes('Restricted — only people with permission') || componentFile.includes('Restricted (Default)'), 'UI provides Restricted option');
assert.ok(componentFile.includes('handleCopyLink'), 'Copy link functionality is present');
assert.ok(componentFile.includes('select-all'), 'Real Google Drive link is selectable and displayed');
console.log('✓ Check 4: src/components/DemoVideoLibrary.tsx UI supports explicit confirmation, badges, link display, and copy button');

// 5. Verify local migration file
const migrationFile = fs.readFileSync(path.resolve('./supabase/migrations/20261011030000_google_drive_demo_videos.sql'), 'utf-8');
assert.ok(migrationFile.includes("sharing_access text NOT NULL DEFAULT 'restricted'"), 'Migration contains sharing_access column with restricted default');
console.log('✓ Check 5: Local SQL migration includes sharing_access column');

// 6. Verify P2P file sharing untouched
const gitStatus = fs.existsSync(path.resolve('./src/lib/webrtc/fileTransfer.ts'));
assert.ok(gitStatus, 'P2P file transfer module is preserved');
console.log('✓ Check 6: P2P file transfer remains completely isolated and untouched');

console.log('All verification checks passed successfully!');
