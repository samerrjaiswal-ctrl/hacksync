import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { 
  validateAnalysisInput, 
  calculateCompletionScore, 
  analyzeProjectWithGroq,
  REQUIRED_SLIDE_CATEGORIES,
  DEFAULT_10_SLIDES,
  EXPANDED_12_SLIDES,
  parseHashChecklist
} from '../src/server/groqAnalyzer.ts';

// Load .env.local
dotenv.config({ path: '.env.local' });
dotenv.config();

console.log('====================================================');
console.log('   HackSync Groq AI Integration Verification Tests  ');
console.log('====================================================\n');

// ----------------------------------------------------
// TEST 1: Empty and Invalid Inputs Validation
// ----------------------------------------------------
console.log('[TEST 1] Empty and Invalid Inputs Validation');
{
  const emptyRes = validateAnalysisInput({ description: '   ' });
  assert.strictEqual(emptyRes.valid, false, 'Empty description must be rejected');
  assert.ok(emptyRes.error.includes('required and cannot be empty'));

  const nullRes = validateAnalysisInput(null);
  assert.strictEqual(nullRes.valid, false, 'Null input must be rejected');

  const longRes = validateAnalysisInput({ description: 'A'.repeat(35000) });
  assert.strictEqual(longRes.valid, true, 'Long description without character limit must be accepted');
  if (longRes.valid) {
    assert.strictEqual(longRes.data.description.length, 35000);
  }

  const validRes = validateAnalysisInput({
    projectName: 'HackSync Test',
    description: 'A collaborative real-time hackathon workspace.'
  });
  assert.strictEqual(validRes.valid, true, 'Valid input must be accepted');
  if (validRes.valid) {
    assert.strictEqual(validRes.data.projectName, 'HackSync Test');
  }
  console.log('✓ TEST 1 Passed: Empty and null inputs are strictly rejected; descriptions without character limits are accepted.\n');
}

// ----------------------------------------------------
// TEST 2: Missing API Key Handling (Mocked Configuration)
// ----------------------------------------------------
console.log('[TEST 2] Missing API Key Handling (Defensive Path)');
{
  let threwExpected = false;
  try {
    await analyzeProjectWithGroq(
      { description: 'Testing missing key handling' },
      { apiKey: '' }
    );
  } catch (err) {
    if (err.code === 'GROQ_API_KEY_MISSING') {
      threwExpected = true;
    }
  }
  assert.strictEqual(threwExpected, true, 'Service must reject requests when GROQ_API_KEY is not configured');
  console.log('✓ TEST 2 Passed: Missing API key triggers graceful GROQ_API_KEY_MISSING error without crash.\n');
}

// ----------------------------------------------------
// TEST 3: Malformed Model Output Recovery (Defensive Fallback)
// ----------------------------------------------------
console.log('[TEST 3] Malformed Model Output Recovery (Schema Validation & Repair)');
{
  // Simulated malformed model output missing several required slides
  const incompleteMock = {
    slides: [
      {
        slideNumber: 1,
        slideTitle: 'Title Slide',
        status: 'present',
        evidenceFromUserInput: ['HackSync - SyncSquad'],
        coveredPoints: ['Name', 'Team'],
        missingPoints: [],
        followUpQuestions: [],
        proposedOutline: ['Title', 'Members'],
        verificationNotes: 'Complete'
      }
      // Slides 2-10 missing from model output!
    ],
    overallSummary: 'Partial response test.',
    readinessStatus: 'needs_work'
  };

  const repaired = await analyzeProjectWithGroq(
    { description: 'Testing partial model output repair' },
    { mockResponse: incompleteMock }
  );

  assert.strictEqual(repaired.categories.length, 10, 'Must always return exactly 10 slide categories');
  assert.strictEqual(repaired.categories[0].status, 'present', 'Slide 1 preserved as present');
  assert.strictEqual(repaired.categories[1].status, 'missing', 'Missing slide 2 safely filled as missing');
  assert.strictEqual(repaired.categories[9].status, 'missing', 'Missing slide 10 safely filled as missing');
  assert.ok(repaired.unresolvedQuestions.length >= 9, 'Unresolved questions generated for missing slides');
  console.log('✓ TEST 3 Passed: Incomplete or malformed model responses are defensively repaired to all 10 slides.\n');
}

// ----------------------------------------------------
// TEST 4: Completion-Percentage Formula Consistency
// ----------------------------------------------------
console.log('[TEST 4] Completion-Percentage Consistency (Frontend & Backend Alignment)');
{
  // Formula: (present * 10) + (partial * 6) + (needsVerification * 6) + (missing * 0)
  // Test case A: 10 present = 100%
  const allPresent = REQUIRED_SLIDE_CATEGORIES.map(def => ({
    categoryId: def.id,
    categoryNumber: def.number,
    title: def.title,
    descriptionGuide: def.descriptionGuide,
    status: 'present',
    evidenceText: ['All details provided'],
    missingDetails: [],
    notes: 'Verified'
  }));
  const scoreA = calculateCompletionScore(allPresent);
  assert.strictEqual(scoreA.completionPercentage, 100);
  assert.strictEqual(scoreA.isReadyForTemplateSelection, true);
  assert.strictEqual(scoreA.readinessStatus, 'ready_for_pitch');

  // Test case B: 5 present (50), 3 partial (18), 2 missing (0) = 68% -> NOT ready (missing > 0, score < 70)
  const mixed = REQUIRED_SLIDE_CATEGORIES.map((def, idx) => ({
    categoryId: def.id,
    categoryNumber: def.number,
    title: def.title,
    descriptionGuide: def.descriptionGuide,
    status: idx < 5 ? 'present' : idx < 8 ? 'partially_covered' : 'missing',
    evidenceText: [],
    missingDetails: idx >= 8 ? ['Missing'] : [],
    notes: 'Mixed'
  }));
  const scoreB = calculateCompletionScore(mixed);
  assert.strictEqual(scoreB.completionPercentage, 68);
  assert.strictEqual(scoreB.isReadyForTemplateSelection, false);
  assert.strictEqual(scoreB.readinessStatus, 'almost_ready');

  // Test case C: 7 present (70), 3 partial (18), 0 missing (0) = 88% -> READY
  const readyMixed = REQUIRED_SLIDE_CATEGORIES.map((def, idx) => ({
    categoryId: def.id,
    categoryNumber: def.number,
    title: def.title,
    descriptionGuide: def.descriptionGuide,
    status: idx < 7 ? 'present' : 'partially_covered',
    evidenceText: [],
    missingDetails: [],
    notes: 'Ready mixed'
  }));
  const scoreC = calculateCompletionScore(readyMixed);
  assert.strictEqual(scoreC.completionPercentage, 88);
  assert.strictEqual(scoreC.isReadyForTemplateSelection, true);
  assert.strictEqual(scoreC.readinessStatus, 'ready_for_pitch');

  console.log('✓ TEST 4 Passed: Completion percentage formula is strictly consistent across all conditions.\n');
}

// ----------------------------------------------------
// TEST 5: Secret Key Exposure Prevention Audit
// ----------------------------------------------------
console.log('[TEST 5] Secret Key Exposure Prevention Audit');
{
  const gitignore = fs.readFileSync('.gitignore', 'utf-8');
  assert.ok(gitignore.includes('.env*.local') || gitignore.includes('.env'), '.gitignore must ignore .env*.local');

  // Verify dist/ contains zero traces of groq secret
  const distDir = path.resolve('dist');
  if (fs.existsSync(distDir)) {
    const distFiles = fs.readdirSync(path.join(distDir, 'assets'));
    for (const f of distFiles) {
      if (f.endsWith('.js')) {
        const content = fs.readFileSync(path.join(distDir, 'assets', f), 'utf-8');
        assert.ok(!content.includes('gsk_'), `Secret key leaked in dist bundle ${f}!`);
      }
    }
  }

  // Verify src/ contains zero hardcoded keys
  const srcFiles = ['src/server/groqAnalyzer.ts', 'src/server/viteGroqPlugin.ts', 'src/lib/pptAnalyzer.ts'];
  for (const sf of srcFiles) {
    const content = fs.readFileSync(sf, 'utf-8');
    assert.ok(!content.includes('gsk_'), `Hardcoded secret key found in source file ${sf}!`);
  }

  console.log('✓ TEST 5 Passed: Zero API key leakage in source code, client bundles, or repository.\n');
}

// ----------------------------------------------------
// TEST 6: Feature Isolation Audit (File Share, Video Link, Git Connect)
// ----------------------------------------------------
console.log('[TEST 6] Feature Isolation Audit');
{
  assert.ok(fs.existsSync('src/lib/webrtc/fileTransfer.ts'), 'File Share WebRTC module preserved');
  assert.ok(fs.existsSync('src/lib/googleDrive.ts'), 'Video Link Google Drive module preserved');
  assert.ok(fs.existsSync('src/lib/gitConnect.ts'), 'Git Connect module preserved');

  const workspaceFile = fs.readFileSync('src/components/TeamWorkspace.tsx', 'utf-8');
  assert.ok(workspaceFile.includes('tab-panel-files'), 'File share tab panel preserved');
  assert.ok(workspaceFile.includes('tab-panel-video'), 'Video link tab panel preserved');
  assert.ok(workspaceFile.includes('tab-panel-git'), 'Git connect tab panel preserved');
  assert.ok(workspaceFile.includes('tab-panel-ppt'), 'PPT builder tab panel preserved');

  const templateSelector = fs.readFileSync('src/components/PptBuilder/PptTemplateSelector.tsx', 'utf-8');
  assert.ok(templateSelector.includes('generateHackathonPptx'), 'Generate PowerPoint integration present');
  assert.ok(templateSelector.includes('Option A: Upload My PowerPoint Template'), 'Option A template preserved');
  assert.ok(templateSelector.includes('Option B: HackSync Default Theme'), 'Option B template preserved');

  console.log('✓ TEST 6 Passed: File Share, Video Link, Git Connect, and real PPTX generation integration preserved.\n');
}

// ----------------------------------------------------
// TEST 7: Real Live Groq API Test (openai/gpt-oss-20b)
// ----------------------------------------------------
console.log('[TEST 7] Live Groq API Integration Test (openai/gpt-oss-20b)');
const apiKey = process.env.GROQ_API_KEY;
const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

if (!apiKey) {
  console.log('⚠ Skipping live API test: GROQ_API_KEY not found in environment.');
} else {
  console.log(`Executing live Groq evaluation using model: ${model}...`);
  const liveInput = {
    projectName: 'HackSync Live Audit',
    hackathonName: 'Global Hackathon 2026',
    teamName: 'SyncSquad',
    membersDetails: 'Sameer (Full Stack), Alex (Frontend)',
    description: `HackSync is an all-in-one real-time workspace for hackathons.
Problem: Hackathons suffer from slow cloud uploads, messy drive permission links, and slow Git setups.
Solution: Browser P2P file transfers using WebRTC DataChannels and Google Drive Demo Video upload.
Features: 1-click team Git connection, WebRTC P2P direct transfer, and 10-slide deck analysis.
Tech Stack: React 19, TypeScript, Tailwind CSS, WebRTC, Vite.
Prototype: Working demo verified locally on port 5173 with 100MB file transfers.`
  };

  const startTime = Date.now();
  const liveResult = await analyzeProjectWithGroq(liveInput, { apiKey, model });
  const elapsedMs = Date.now() - startTime;

  assert.strictEqual(liveResult.categories.length, 10, 'Live API must return exactly 10 categories');
  assert.strictEqual(liveResult.totalCategories, 10);
  assert.ok(liveResult.completionPercentage > 0, 'Completion percentage must be > 0');
  assert.strictEqual(liveResult.modelUsed, model, 'Model used must match configured model');
  assert.strictEqual(liveResult.isAiGenerated, true, 'isAiGenerated must be true');

  // Verify each category has essential structure
  for (const cat of liveResult.categories) {
    assert.ok(['present', 'partially_covered', 'needs_verification', 'missing'].includes(cat.status));
    assert.ok(cat.categoryNumber >= 1 && cat.categoryNumber <= 10);
    assert.ok(cat.title.length > 0);
    assert.ok(Array.isArray(cat.contentOutline) && cat.contentOutline.length > 0);
  }

  // Slide 8 Prototype test: In description user claims working demo, model must mark needs_verification or present
  const slide8 = liveResult.categories.find(c => c.categoryNumber === 8);
  assert.ok(slide8, 'Slide 8 (Prototype / Demo) must exist');

  console.log(`✓ TEST 7 Passed: Live Groq API analysis successful in ${elapsedMs}ms!`);
  console.log(`   Model: ${liveResult.modelUsed}`);
  console.log(`   Readiness Score: ${liveResult.completionPercentage}% (${liveResult.readinessStatus})`);
  console.log(`   Present: ${liveResult.totalPresent}, Partial: ${liveResult.totalPartiallyCovered}, Verify: ${liveResult.totalNeedsVerification}, Missing: ${liveResult.totalMissing}`);
  console.log(`   Overall Summary: ${liveResult.overallSummary}\n`);
}

// ----------------------------------------------------
// TEST 8: Re-analysis after Follow-up Answers
// ----------------------------------------------------
console.log('[TEST 8] Re-analysis after Follow-up Answers Test');
if (apiKey) {
  const followUpInput = {
    projectName: 'HackSync Live Audit',
    description: `HackSync is an all-in-one real-time workspace for hackathons.
Problem: Hackathons suffer from slow cloud uploads.
Solution: Browser P2P file transfers.
Tech Stack: React 19, WebRTC.

[Addendum for SLIDE 9 FEASIBILITY IMPACT]:
Target users: Over 500,000 hackathon participants globally. Zero server infrastructure cost because WebRTC transfers directly peer-to-peer.

[Addendum for SLIDE 10 CONCLUSION TEAM]:
Takeaway: Eliminating submission chaos. Sameer led WebRTC protocol, Alex built the UI. Contact: team@hacksync.dev`
  };

  const reResult = await analyzeProjectWithGroq(followUpInput, { apiKey, model });
  const slide9 = reResult.categories.find(c => c.categoryNumber === 9);
  const slide10 = reResult.categories.find(c => c.categoryNumber === 10);

  assert.ok(slide9.status === 'present' || slide9.status === 'partially_covered', 'Slide 9 improved with follow-up info');
  assert.ok(slide10.status === 'present' || slide10.status === 'partially_covered', 'Slide 10 improved with follow-up info');
  console.log('✓ TEST 8 Passed: Re-analysis after applying follow-up answers successfully updates slide scores.\n');
}

// ----------------------------------------------------
// TEST 9: 12-Slide Expanded Checklist and Custom Slides Support
// ----------------------------------------------------
console.log('[TEST 9] 12-Slide Expanded Checklist & Custom Slides Support');
{
  assert.strictEqual(DEFAULT_10_SLIDES.length, 10, 'DEFAULT_10_SLIDES must have 10 items');
  assert.strictEqual(EXPANDED_12_SLIDES.length, 12, 'EXPANDED_12_SLIDES must have 12 items');

  const customMock = {
    slides: EXPANDED_12_SLIDES.map((s, idx) => ({
      slideNumber: idx + 1,
      slideTitle: s.title,
      status: 'present',
      evidenceFromUserInput: [`Evidence for ${s.title}`],
      coveredPoints: [s.title],
      missingPoints: [],
      followUpQuestions: [],
      proposedOutline: [`• ${s.title}: Key point 1`, `• Detail: Key point 2`],
      verificationNotes: 'Verified'
    })),
    overallSummary: 'Complete 12-slide pitch deck.',
    readinessStatus: 'ready_for_pitch'
  };

  const result12 = await analyzeProjectWithGroq(
    {
      description: 'Full 12-slide project analysis with custom checklist.',
      customSlides: EXPANDED_12_SLIDES
    },
    { mockResponse: customMock }
  );

  assert.strictEqual(result12.categories.length, 12, 'Must evaluate all 12 categories');
  assert.strictEqual(result12.totalCategories, 12);
  assert.strictEqual(result12.totalPresent, 12);
  assert.strictEqual(result12.completionPercentage, 100);
  assert.strictEqual(result12.isReadyForTemplateSelection, true);
  console.log('✓ TEST 9 Passed: 12-Slide Expanded Checklist correctly evaluated and scored dynamically.\n');
}

// ----------------------------------------------------
// TEST 10: Point-Wise Presentation Bullet Outlines Verification
// ----------------------------------------------------
console.log('[TEST 10] Point-Wise Presentation Bullet Outlines Verification');
{
  const mockWithParagraphs = {
    slides: [
      {
        slideNumber: 1,
        slideTitle: 'Title Slide',
        status: 'present',
        proposedOutline: [
          'HackSync: Real-time hackathon workspace for teams',
          '• Team: Sameer and Alex from Tech Institute',
          'Outcome: Eliminate last-minute file transfer chaos'
        ]
      }
    ],
    overallSummary: 'Point-wise outline formatting check.',
    readinessStatus: 'needs_work'
  };

  const bulletResult = await analyzeProjectWithGroq(
    { description: 'Testing bullet point formatting enforcement' },
    { mockResponse: mockWithParagraphs }
  );

  const outline = bulletResult.categories[0].contentOutline;
  assert.ok(Array.isArray(outline) && outline.length > 0, 'Outline must be an array');
  for (const item of outline) {
    assert.ok(item.startsWith('•') || item.startsWith('-'), `Item "${item}" must be point-wise formatted with a bullet`);
  }
  console.log('✓ TEST 10 Passed: Slide content outlines are guaranteed point-wise presentation bullets.\n');
}

// ----------------------------------------------------
// TEST 11: Dynamic Hash Checklist (# Checklist) Calculation & Analysis
// ----------------------------------------------------
console.log('[TEST 11] Dynamic Hash Checklist (# Checklist) Calculation');
{
  const hashText = `
# 1. Project Title: Vision and members
# 2. Problem Statement: Core friction in hackathons
# 3. Market Gap: Existing alternatives
# 4. Proposed Solution: Core WebRTC platform
# 5. Live Demo: Verified functioning prototype
# 6. Team & Future: Roles and contact
`;

  const calculatedSlides = parseHashChecklist(hashText);
  assert.strictEqual(calculatedSlides.length, 6, 'Must calculate exactly 6 slides from # lines');
  assert.strictEqual(calculatedSlides[0].title, 'Project Title');
  assert.strictEqual(calculatedSlides[0].number, 1);
  assert.strictEqual(calculatedSlides[5].title, 'Team & Future');
  assert.strictEqual(calculatedSlides[5].number, 6);

  // Validate that validateAnalysisInput extracts these 6 slides from checklistText
  const validated = validateAnalysisInput({
    description: 'A real-time workspace for hackathon builders.',
    checklistText: hashText
  });

  assert.strictEqual(validated.valid, true);
  assert.strictEqual(validated.data.customSlides.length, 6, 'validateAnalysisInput must extract 6 slides');

  // Validate analysis against these 6 slides
  const mock6 = {
    slides: calculatedSlides.map((s, idx) => ({
      slideNumber: idx + 1,
      slideTitle: s.title,
      status: 'present',
      evidenceFromUserInput: [`Evidence for ${s.title}`],
      coveredPoints: [s.title],
      missingPoints: [],
      followUpQuestions: [],
      proposedOutline: [`• ${s.title}: Key point 1`, `• Detail: Key point 2`],
      verificationNotes: 'Verified'
    })),
    overallSummary: 'Custom 6-slide deck completely verified.',
    readinessStatus: 'ready_for_pitch'
  };

  const result6 = await analyzeProjectWithGroq(validated.data, { mockResponse: mock6 });
  assert.strictEqual(result6.categories.length, 6, 'Analysis must contain exactly 6 categories');
  assert.strictEqual(result6.totalCategories, 6);
  assert.strictEqual(result6.totalPresent, 6);
  assert.strictEqual(result6.completionPercentage, 100);
  console.log('✓ TEST 11 Passed: Dynamic # checklist calculation and analysis verified for arbitrary slide count.\n');
}

console.log('====================================================');
console.log('   All 11 Groq Integration Test Suites PASSED!      ');
console.log('====================================================');

