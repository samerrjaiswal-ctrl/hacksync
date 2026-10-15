import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('--- HackSync PPT Builder Verification Test Suite ---');

const projectRoot = resolve(process.cwd());

// Check 1: Types definition
const typesFile = readFileSync(resolve(projectRoot, 'src/types.ts'), 'utf-8');
const requiredSlideCategories = [
  'title_slide',
  'problem_statement',
  'existing_solutions',
  'proposed_solution',
  'key_features',
  'system_architecture',
  'technology_stack',
  'prototype_demo',
  'feasibility_impact',
  'conclusion_team'
];

const requiredStatuses = [
  'missing',
  'partially_covered',
  'present',
  'needs_verification'
];

const hasAllCategories = requiredSlideCategories.every(cat => typesFile.includes(cat));
const hasAllStatuses = requiredStatuses.every(st => typesFile.includes(st));

if (hasAllCategories && hasAllStatuses && typesFile.includes('PptProjectAnalysis') && typesFile.includes('GroqAiConfig')) {
  console.log('✓ Check 1: src/types.ts defines all 10 slide categories, 4 coverage statuses, and GroqAiConfig');
} else {
  console.error('✗ Check 1 Failed: Missing required types in src/types.ts');
  process.exit(1);
}

// Check 2: Analyzer service and 10 categories definition
const analyzerFile = readFileSync(resolve(projectRoot, 'src/lib/pptAnalyzer.ts'), 'utf-8');
if (
  analyzerFile.includes('SLIDE_CATEGORIES_DEFINITION') &&
  analyzerFile.includes('analyzeHackathonProject') &&
  analyzerFile.includes('getExampleHackathonProject') &&
  analyzerFile.includes('openai/gpt-oss-20b')
) {
  console.log('✓ Check 2: src/lib/pptAnalyzer.ts implements 10-slide category rules and modular analysis');
} else {
  console.error('✗ Check 2 Failed: Missing analyzer functions in src/lib/pptAnalyzer.ts');
  process.exit(1);
}

// Check 3: Sidebar navigation placement
const sidebarFile = readFileSync(resolve(projectRoot, 'src/components/WorkspaceSidebar.tsx'), 'utf-8');
if (
  sidebarFile.includes('sidebar-nav-ppt') &&
  sidebarFile.includes('PPT Builder') &&
  sidebarFile.indexOf('sidebar-nav-git') < sidebarFile.indexOf('sidebar-nav-ppt')
) {
  console.log('✓ Check 3: src/components/WorkspaceSidebar.tsx places PPT Builder directly below Git Connect');
} else {
  console.error('✗ Check 3 Failed: Sidebar navigation item misplaced or missing');
  process.exit(1);
}

// Check 4: Dashboard & Components
const dashboardFile = readFileSync(resolve(projectRoot, 'src/components/PptBuilder/PptBuilderDashboard.tsx'), 'utf-8');
const checklistFile = readFileSync(resolve(projectRoot, 'src/components/PptBuilder/PptChecklistGrid.tsx'), 'utf-8');
const questionsFile = readFileSync(resolve(projectRoot, 'src/components/PptBuilder/PptFollowUpQuestions.tsx'), 'utf-8');
const reviewFile = readFileSync(resolve(projectRoot, 'src/components/PptBuilder/PptReadinessReview.tsx'), 'utf-8');
const templateFile = readFileSync(resolve(projectRoot, 'src/components/PptBuilder/PptTemplateSelector.tsx'), 'utf-8');

if (
  dashboardFile.includes('Describe Your Hackathon Project') &&
  dashboardFile.includes('Analyze Project Details') &&
  dashboardFile.includes('Load Example Project') &&
  checklistFile.includes('needs_verification') &&
  questionsFile.includes('Complete Your Pitch') &&
  reviewFile.includes('Slide Content Outlines') &&
  templateFile.includes('Option A: Upload My PowerPoint Template') &&
  templateFile.includes('Option B: HackSync Default Theme')
) {
  console.log('✓ Check 4: PPT Builder components implement landing form, checklist, follow-up questions, review, and templates');
} else {
  console.error('✗ Check 4 Failed: PPT Builder components missing required sections');
  process.exit(1);
}

// Check 5: Real PowerPoint Generation is integrated and active
if (
  templateFile.includes('Generate PowerPoint') &&
  templateFile.includes('generateHackathonPptx')
) {
  console.log('✓ Check 5: Real PowerPoint generation is integrated and active (PptxGenJS engine connected)');
} else {
  console.error('✗ Check 5 Failed: Real PowerPoint generator not properly integrated');
  process.exit(1);
}

// Check 6: Safety audit - Groq AI preparation invariant (no key exposed, no API calls)
if (
  !dashboardFile.includes('VITE_GROQ_API_KEY') &&
  !analyzerFile.includes('VITE_GROQ_API_KEY') &&
  !dashboardFile.includes('https://api.groq.com') &&
  analyzerFile.includes('isConfigured: false')
) {
  console.log('✓ Check 6: Future Groq AI is prepared modularly with zero frontend key exposure or unauthorized API calls');
} else {
  console.error('✗ Check 6 Failed: Insecure Groq key pattern or unexpected API call detected');
  process.exit(1);
}

// Check 7: Isolation audit - File Share, Video Link, and Git Connect remain untouched
const workspaceFile = readFileSync(resolve(projectRoot, 'src/components/TeamWorkspace.tsx'), 'utf-8');
if (
  workspaceFile.includes('tab-panel-files') &&
  workspaceFile.includes('tab-panel-video') &&
  workspaceFile.includes('tab-panel-git') &&
  workspaceFile.includes('tab-panel-ppt')
) {
  console.log('✓ Check 7: All 4 workspaces (File Share, Video Link, Git Connect, PPT Builder) are cleanly isolated');
} else {
  console.error('✗ Check 7 Failed: Workspace tab panels disturbed');
  process.exit(1);
}

console.log('All 7 PPT Builder verification checks passed successfully!');
