import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import jszip from 'jszip';
import { 
  generateHackathonPptx, 
  sanitizePptxFileName, 
  PPTX_COLORS 
} from '../src/lib/pptxGenerator.ts';
import { 
  DEFAULT_10_SLIDES, 
  EXPANDED_12_SLIDES 
} from '../src/lib/pptAnalyzer.ts';

console.log('====================================================');
console.log('   HackSync PPTX Real Generation Verification Test  ');
console.log('====================================================\n');

// ----------------------------------------------------
// TEST 1: Filename Sanitization
// ----------------------------------------------------
console.log('[TEST 1] Filename Sanitization');
{
  const test1 = sanitizePptxFileName('HackSync');
  assert.strictEqual(test1, 'HackSync_Hackathon_Pitch.pptx');

  const test2 = sanitizePptxFileName('My Project / 2026: The "Best" Pitch!');
  assert.strictEqual(test2, 'My_Project_2026_The_Best_Pitch_Hackathon_Pitch.pptx');

  const test3 = sanitizePptxFileName('');
  assert.strictEqual(test3, 'Hackathon_Project_Hackathon_Pitch.pptx');
  console.log('✓ TEST 1 Passed: Filenames correctly sanitized and formatted.\n');
}

// ----------------------------------------------------
// TEST 2: Generate 10-Slide Standard Preset Deck
// ----------------------------------------------------
console.log('[TEST 2] Real 10-Slide Standard PPTX Generation');
{
  const mock10Analysis = {
    projectName: 'HackSync_10Slide_Test',
    hackathonName: 'Global Hackathon 2026',
    teamName: 'SyncSquad',
    membersDetails: 'Sameer (Full Stack / WebRTC), Alex (UI/UX Lead)',
    rawDescription: 'A complete real-time collaborative workspace for hackathons.',
    categories: DEFAULT_10_SLIDES.map(s => ({
      categoryId: s.id,
      categoryNumber: s.number,
      title: s.title,
      descriptionGuide: s.descriptionGuide,
      status: 'present',
      evidenceText: [`Evidence text for ${s.title}`],
      missingDetails: [],
      notes: `Review complete for ${s.title}`,
      contentOutline: [
        `• Core Focus: Main concept of ${s.title}`,
        `• Technical Detail: Implemented architecture and workflow`,
        `• Expected Impact: Quantifiable hackathon outcomes`
      ]
    })),
    totalCovered: 10,
    totalPresent: 10,
    totalPartiallyCovered: 0,
    totalMissing: 0,
    totalNeedsVerification: 0,
    completionPercentage: 100,
    isReadyForTemplateSelection: true,
    unresolvedQuestions: [],
    analyzedAt: new Date()
  };

  const result10 = await generateHackathonPptx(mock10Analysis);

  assert.strictEqual(result10.status, 'success');
  assert.strictEqual(result10.slideCount, 10);
  assert.strictEqual(result10.fileName, 'HackSync_10Slide_Test_Hackathon_Pitch.pptx');

  // Verify file exists on disk
  const filePath = path.resolve(result10.fileName);
  assert.ok(fs.existsSync(filePath), `Generated file ${result10.fileName} must exist on disk`);
  const fileBytes = fs.readFileSync(filePath);
  assert.ok(fileBytes.length > 20000, 'PPTX file size must be substantial (>20KB)');

  // Verify OOXML zip structure
  const zip = await jszip.loadAsync(fileBytes);
  assert.ok(zip.file('[Content_Types].xml'), 'Must contain [Content_Types].xml');
  assert.ok(zip.file('ppt/presentation.xml'), 'Must contain ppt/presentation.xml');

  // Verify exact slide count in OOXML package
  for (let i = 1; i <= 10; i++) {
    const slideXml = zip.file(`ppt/slides/slide${i}.xml`);
    assert.ok(slideXml, `Slide ${i} must exist in ppt/slides/slide${i}.xml`);
  }
  assert.strictEqual(zip.file('ppt/slides/slide11.xml'), null, 'Slide 11 must NOT exist for 10-slide deck');

  // Verify text content is in OOXML slide 1
  const slide1XmlStr = await zip.file('ppt/slides/slide1.xml').async('string');
  assert.ok(slide1XmlStr.includes('HackSync_10Slide_Test'), 'Slide 1 XML must contain project title');
  assert.ok(slide1XmlStr.includes('SyncSquad'), 'Slide 1 XML must contain team name');

  // Clean up test file
  fs.unlinkSync(filePath);
  console.log(`✓ TEST 2 Passed: 10-slide PPTX generated successfully (${fileBytes.length} bytes, 10 verified OOXML slides).\n`);
}

// ----------------------------------------------------
// TEST 3: Generate 12-Slide Expanded Preset Deck
// ----------------------------------------------------
console.log('[TEST 3] Real 12-Slide Expanded PPTX Generation');
{
  const mock12Analysis = {
    projectName: 'HackSync_12Slide_Test',
    hackathonName: 'TechCrunch Disrupt Hackathon',
    teamName: 'DisruptTeam',
    membersDetails: 'Sameer (Backend), Sarah (Cloud), Alex (Design)',
    rawDescription: 'Expanded 12-slide pitch with monetization and roadmap.',
    categories: EXPANDED_12_SLIDES.map(s => ({
      categoryId: s.id,
      categoryNumber: s.number,
      title: s.title,
      descriptionGuide: s.descriptionGuide,
      status: s.number === 9 ? 'partially_covered' : 'present',
      evidenceText: [`Evidence for ${s.title}`],
      missingDetails: [],
      notes: `Notes for ${s.title}`,
      contentOutline: [
        `• Strategic Focus: Key aspects of ${s.title}`,
        `• Execution Metrics: Measurable hackathon milestones`,
        `• Future Horizon: Growth and sustainability roadmap`
      ]
    })),
    totalCovered: 12,
    totalPresent: 11,
    totalPartiallyCovered: 1,
    totalMissing: 0,
    totalNeedsVerification: 0,
    completionPercentage: 96,
    isReadyForTemplateSelection: true,
    unresolvedQuestions: [],
    analyzedAt: new Date()
  };

  const result12 = await generateHackathonPptx(mock12Analysis);

  assert.strictEqual(result12.status, 'success');
  assert.strictEqual(result12.slideCount, 12);

  const filePath12 = path.resolve(result12.fileName);
  assert.ok(fs.existsSync(filePath12));
  const fileBytes12 = fs.readFileSync(filePath12);

  const zip12 = await jszip.loadAsync(fileBytes12);
  for (let i = 1; i <= 12; i++) {
    assert.ok(zip12.file(`ppt/slides/slide${i}.xml`), `Slide ${i} must exist in 12-slide deck`);
  }
  assert.strictEqual(zip12.file('ppt/slides/slide13.xml'), null, 'Slide 13 must NOT exist in 12-slide deck');

  // Verify slide 9 (Business Model) and slide 11 (Future Roadmap)
  const slide9Xml = await zip12.file('ppt/slides/slide9.xml').async('string');
  assert.ok(slide9Xml.includes('Business Model') || slide9Xml.includes('SLIDE 09'), 'Slide 9 must represent Business Model');

  const slide11Xml = await zip12.file('ppt/slides/slide11.xml').async('string');
  assert.ok(slide11Xml.includes('Roadmap') || slide11Xml.includes('SLIDE 11'), 'Slide 11 must represent Future Roadmap');

  fs.unlinkSync(filePath12);
  console.log(`✓ TEST 3 Passed: 12-slide expanded PPTX generated successfully (${fileBytes12.length} bytes, 12 verified OOXML slides).\n`);
}

// ----------------------------------------------------
// TEST 4: Generate Custom Checklist Deck (5 Slides)
// ----------------------------------------------------
console.log('[TEST 4] Custom Checklist (5 Slides) PPTX Generation');
{
  const customSlides = [
    { id: 'custom_title', number: 1, title: 'Title & Vision', descriptionGuide: 'Official title and vision', status: 'present' },
    { id: 'custom_problem', number: 2, title: 'Crucial Problem', descriptionGuide: 'Why the problem matters', status: 'present' },
    { id: 'custom_ai', number: 3, title: 'Custom AI Engine', descriptionGuide: 'Proprietary deep learning model', status: 'present' },
    { id: 'custom_metrics', number: 4, title: 'Live Performance', descriptionGuide: 'Benchmarking results', status: 'present' },
    { id: 'custom_close', number: 5, title: 'Closing & Team', descriptionGuide: 'Team roster and contact', status: 'present' }
  ];

  const mockCustomAnalysis = {
    projectName: 'Custom_Deck_5Slides',
    teamName: 'CustomTeam',
    rawDescription: 'A 5-slide tailored deck.',
    categories: customSlides.map(s => ({
      categoryId: s.id,
      categoryNumber: s.number,
      title: s.title,
      descriptionGuide: s.descriptionGuide,
      status: s.status,
      evidenceText: [`Proof for ${s.title}`],
      missingDetails: [],
      notes: 'Custom slide verified',
      contentOutline: [
        `• Priority 1: Key dimension of ${s.title}`,
        `• Priority 2: Execution detail and outcome`
      ]
    })),
    totalCovered: 5,
    totalPresent: 5,
    totalPartiallyCovered: 0,
    totalMissing: 0,
    totalNeedsVerification: 0,
    completionPercentage: 100,
    isReadyForTemplateSelection: true,
    unresolvedQuestions: [],
    analyzedAt: new Date()
  };

  const resultCustom = await generateHackathonPptx(mockCustomAnalysis);
  assert.strictEqual(resultCustom.slideCount, 5);

  const filePathCustom = path.resolve(resultCustom.fileName);
  assert.ok(fs.existsSync(filePathCustom));
  const fileBytesCustom = fs.readFileSync(filePathCustom);

  const zipCustom = await jszip.loadAsync(fileBytesCustom);
  for (let i = 1; i <= 5; i++) {
    assert.ok(zipCustom.file(`ppt/slides/slide${i}.xml`), `Slide ${i} must exist in 5-slide deck`);
  }
  assert.strictEqual(zipCustom.file('ppt/slides/slide6.xml'), null, 'Slide 6 must NOT exist in 5-slide deck');

  const slide3Xml = await zipCustom.file('ppt/slides/slide3.xml').async('string');
  assert.ok(slide3Xml.includes('Custom AI Engine'), 'Slide 3 must contain custom title');

  fs.unlinkSync(filePathCustom);
  console.log(`✓ TEST 4 Passed: Custom 5-slide checklist generated exactly 5 slides with custom titles.\n`);
}

// ----------------------------------------------------
// TEST 5: Editable Text & Shapes OOXML Verification
// ----------------------------------------------------
console.log('[TEST 5] Editable Text & Shapes OOXML Verification');
{
  const mockTestDeck = {
    projectName: 'Editable_Text_Verify',
    categories: [
      {
        categoryId: 'title_slide',
        categoryNumber: 1,
        title: 'Title Slide',
        descriptionGuide: 'Project title and team',
        status: 'present',
        evidenceText: [],
        missingDetails: [],
        notes: '',
        contentOutline: ['• Pitch Headline: Full details here']
      },
      {
        categoryId: 'key_features',
        categoryNumber: 2,
        title: 'Key Features & Innovation',
        descriptionGuide: 'Main features',
        status: 'present',
        evidenceText: [],
        missingDetails: [],
        notes: '',
        contentOutline: [
          '• Fast Transfer: Peer to peer data channels',
          '• Instant Upload: Automated Google Drive verification'
        ]
      }
    ]
  };

  const result = await generateHackathonPptx(mockTestDeck);
  const filePath = path.resolve(result.fileName);
  const fileBytes = fs.readFileSync(filePath);
  const zip = await jszip.loadAsync(fileBytes);

  const slide2Xml = await zip.file('ppt/slides/slide2.xml').async('string');

  // Verify OOXML shapes (<p:sp>) and text runs (<a:r> & <a:t>) exist
  assert.ok(slide2Xml.includes('<p:sp>'), 'Slide XML must contain native OOXML shape elements (<p:sp>)');
  assert.ok(slide2Xml.includes('<a:r>'), 'Slide XML must contain native OOXML text runs (<a:r>)');
  assert.ok(slide2Xml.includes('<a:t>'), 'Slide XML must contain native OOXML text tags (<a:t>)');
  assert.ok(slide2Xml.includes('Fast Transfer'), 'Slide XML must contain bullet text headline');
  assert.ok(slide2Xml.includes('Peer to peer data channels'), 'Slide XML must contain bullet text body');

  // Verify slide is NOT a single raster image screenshot
  assert.strictEqual(slide2Xml.includes('<p:pic>'), false, 'Slide must NOT use screenshot raster image fallbacks');

  fs.unlinkSync(filePath);
  console.log('✓ TEST 5 Passed: Slides contain genuine, editable OOXML shapes and text elements.\n');
}

// ----------------------------------------------------
// TEST 6: Slide 3 ("Existing Solutions & Gaps") Specific Bullet Verification
// ----------------------------------------------------
console.log('[TEST 6] Slide 3 Bullet Formatting and Content Verification');
{
  const mockDeckWithSlide3 = {
    projectName: 'HackSync_Slide3_Test',
    hackathonName: 'Pitchfest 2026',
    teamName: 'TeamAlpha',
    membersDetails: 'Lead (Dev)',
    rawDescription: 'Testing Slide 3 bullets.',
    categories: [
      {
        categoryId: 'title_slide',
        categoryNumber: 1,
        title: 'Project Title',
        descriptionGuide: 'Title slide',
        status: 'present',
        evidenceText: [],
        missingDetails: [],
        notes: '',
        contentOutline: []
      },
      {
        categoryId: 'problem_statement',
        categoryNumber: 2,
        title: 'Problem Statement',
        descriptionGuide: 'Problem slide',
        status: 'present',
        evidenceText: ['Problem points'],
        missingDetails: [],
        notes: '',
        contentOutline: []
      },
      {
        categoryId: 'existing_solutions',
        categoryNumber: 3,
        title: 'Existing Solutions & Gaps',
        descriptionGuide: 'Current alternatives & market shortcomings',
        status: 'partially_covered',
        // Simulate extracted paragraph from project description
        evidenceText: [
          'Teams currently rely on Google Drive, Discord, Slack, and manual GitHub settings: 1. Discord file size limits block raw screen recordings and datasets. 2. Google Drive requires navigating permission menus; judges often hit "Access Denied" on restricted videos. 3. Adding team collaborators on GitHub requires navigating repository settings page by page.'
        ],
        missingDetails: [],
        notes: 'Review alternatives',
        contentOutline: [
          'Existing Solutions in the Market',
          'Key Gaps & Failure Points of Current Alternatives',
          'The Opportunity for a Better Approach'
        ]
      }
    ]
  };

  const result = await generateHackathonPptx(mockDeckWithSlide3);
  const filePath = path.resolve(result.fileName);
  const fileBytes = fs.readFileSync(filePath);
  const zip = await jszip.loadAsync(fileBytes);

  const slide3Xml = await zip.file('ppt/slides/slide3.xml').async('string');

  // 1. Verify CURRENT ALTERNATIVES & WORKAROUNDS Section Header & Bullets
  assert.ok(slide3Xml.includes('CURRENT ALTERNATIVES &amp; WORKAROUNDS') || slide3Xml.includes('CURRENT ALTERNATIVES & WORKAROUNDS'), 'Slide 3 must contain Alternatives header');
  assert.ok(slide3Xml.includes('Google Drive: File-sharing permissions can be confusing.'), 'Slide 3 must contain Google Drive bullet');
  assert.ok(slide3Xml.includes('Discord: File-size limits can restrict large recordings and datasets.'), 'Slide 3 must contain Discord bullet');
  assert.ok(slide3Xml.includes('Slack: Teams may need separate tools for file sharing and collaboration.'), 'Slide 3 must contain Slack bullet');
  assert.ok(slide3Xml.includes('GitHub: Adding collaborators requires repository access configuration.'), 'Slide 3 must contain GitHub bullet');

  // 2. Verify CRITICAL GAPS & OPPORTUNITY Section Header & Bullets
  assert.ok(slide3Xml.includes('CRITICAL GAPS &amp; OPPORTUNITY') || slide3Xml.includes('CRITICAL GAPS & OPPORTUNITY'), 'Slide 3 must contain Gaps header');
  assert.ok(slide3Xml.includes('File-sharing limitations for large assets.'), 'Slide 3 must contain large assets limitation bullet');
  assert.ok(slide3Xml.includes('Permission-related issues when sharing demo videos with judges.'), 'Slide 3 must contain judge permission issue bullet');
  assert.ok(slide3Xml.includes('Manual GitHub collaborator setup.'), 'Slide 3 must contain GitHub collaborator setup bullet');
  assert.ok(slide3Xml.includes('Fragmented workflows across multiple tools.'), 'Slide 3 must contain fragmented workflows bullet');

  // 3. Verify OOXML Bullet Formatting (<a:buChar char="&#x2022;"/> or bullet marks)
  assert.ok(slide3Xml.includes('&#x2022;'), 'Slide 3 must contain native OOXML bullet tags (<a:buChar>)');

  // 4. Verify distinct bullet rows (at least 8 bullet paragraph blocks in Slide 3)
  const paragraphCount = (slide3Xml.match(/<a:p>/g) || []).length;
  assert.ok(paragraphCount >= 8, `Slide 3 must have at least 8 distinct bullet paragraph rows, found ${paragraphCount}`);

  // 5. Verify no raster fallback image
  assert.strictEqual(slide3Xml.includes('<p:pic>'), false, 'Slide 3 must NOT contain raster screenshot fallbacks');

  fs.unlinkSync(filePath);
  console.log('✓ TEST 6 Passed: Slide 3 renders clean, separate presentation-ready bullets for both sections.\n');
}

// ----------------------------------------------------
// TEST 7: Light Blue Background Template with Black Lines & Text
// ----------------------------------------------------
console.log('[TEST 7] Light Blue Background Template with Black Lines & Text Generation');
{
  const mockLightBlueDeck = {
    projectName: 'SkySync_LightBlue_Test',
    hackathonName: 'Daylight Hackathon 2026',
    teamName: 'SkyBuilders',
    membersDetails: 'Alex (Full Stack), Sam (Design)',
    rawDescription: 'A high-contrast light blue presentation deck with black lines.',
    categories: [
      {
        categoryId: 'title_slide',
        categoryNumber: 1,
        title: 'Project Overview',
        descriptionGuide: 'Project pitch and introduction',
        status: 'present',
        evidenceText: ['Evidence 1'],
        missingDetails: [],
        notes: '',
        contentOutline: ['• Executive Summary: Real-time high-contrast presentation']
      },
      {
        categoryId: 'problem_statement',
        categoryNumber: 2,
        title: 'Problem Statement',
        descriptionGuide: 'Key friction and user obstacles',
        status: 'present',
        evidenceText: ['Evidence 2'],
        missingDetails: [],
        notes: '',
        contentOutline: ['• Friction Point: Existing tools lack clear daytime contrast']
      },
      {
        categoryId: 'proposed_solution',
        categoryNumber: 3,
        title: 'Proposed Solution',
        descriptionGuide: 'Core mechanism and architecture',
        status: 'present',
        evidenceText: ['Evidence 3'],
        missingDetails: [],
        notes: '',
        contentOutline: ['• Solution: Crisp light blue theme with black outlines']
      }
    ],
    totalCovered: 3,
    totalPresent: 3,
    totalPartiallyCovered: 0,
    totalMissing: 0,
    totalNeedsVerification: 0,
    completionPercentage: 100,
    isReadyForTemplateSelection: true,
    unresolvedQuestions: [],
    analyzedAt: new Date()
  };

  const resultLightBlue = await generateHackathonPptx(mockLightBlueDeck, {
    templateOption: 'light_blue'
  });

  assert.strictEqual(resultLightBlue.status, 'success');
  assert.strictEqual(resultLightBlue.slideCount, 3);

  const filePath = path.resolve(resultLightBlue.fileName);
  assert.ok(fs.existsSync(filePath));
  const fileBytes = fs.readFileSync(filePath);
  const zip = await jszip.loadAsync(fileBytes);

  // Inspect Slide 1 OOXML for light blue background (E8F4FD) and black border/text (000000)
  const slide1Xml = await zip.file('ppt/slides/slide1.xml').async('string');
  assert.ok(
    slide1Xml.includes('E8F4FD'),
    'Slide 1 must have E8F4FD light blue background color in OOXML'
  );
  assert.ok(
    slide1Xml.includes('000000'),
    'Slide 1 must have 000000 black lines or text in OOXML'
  );

  // Inspect Slide 2 OOXML for light blue background
  const slide2Xml = await zip.file('ppt/slides/slide2.xml').async('string');
  assert.ok(
    slide2Xml.includes('E8F4FD'),
    'Slide 2 must have E8F4FD light blue background in OOXML'
  );

  fs.unlinkSync(filePath);
  console.log('✓ TEST 7 Passed: Light Blue template generated with genuine E8F4FD background, black lines and black text.\n');
}

// ----------------------------------------------------
// TEST 8: Real OOXML Uploaded Template Parsing & Adaptive Generation
// ----------------------------------------------------
console.log('[TEST 8] Uploaded Template OOXML Parsing & Adaptive Deck Generation');
{
  const { parseUploadedPptxTemplate } = await import('../src/lib/pptxTemplateParser.ts');

  // Generate a seed presentation to serve as a real uploaded .pptx template
  const seedResult = await generateHackathonPptx({
    projectName: 'Custom_Template_Seed',
    hackathonName: 'Seed Hackathon',
    teamName: 'SeedTeam',
    membersDetails: 'Lead Dev',
    rawDescription: 'Seed presentation for template testing.',
    categories: [
      {
        categoryId: 'title_slide',
        categoryNumber: 1,
        title: 'Title Slide',
        descriptionGuide: 'Intro',
        status: 'present',
        evidenceText: [],
        missingDetails: [],
        notes: '',
        contentOutline: ['• Point 1: Seed point']
      }
    ],
    totalCovered: 1,
    totalPresent: 1,
    totalPartiallyCovered: 0,
    totalMissing: 0,
    totalNeedsVerification: 0,
    completionPercentage: 100,
    isReadyForTemplateSelection: true,
    unresolvedQuestions: [],
    analyzedAt: new Date()
  });

  const seedPath = path.resolve(seedResult.fileName);
  const seedBytes = fs.readFileSync(seedPath);

  // Parse the uploaded template bytes using our new OOXML template parser
  const parsedTemplate = await parseUploadedPptxTemplate(seedBytes, 'MyCustomTemplate.pptx');

  assert.ok(parsedTemplate.isTemplateValid, 'Uploaded template must be parsed as valid');
  assert.strictEqual(parsedTemplate.fileName, 'MyCustomTemplate.pptx');
  assert.ok(parsedTemplate.colors, 'Template must extract color scheme');
  assert.ok(parsedTemplate.fonts, 'Template must extract font scheme');
  assert.ok(typeof parsedTemplate.isLightMode === 'boolean', 'Template must determine light/dark mode');

  // Generate a new deck using the parsed custom template
  const customGeneratedResult = await generateHackathonPptx({
    projectName: 'Custom_Generated_Deck',
    hackathonName: 'Demo Hackathon',
    teamName: 'Team Alpha',
    membersDetails: 'Member 1',
    rawDescription: 'Deck using uploaded template styling.',
    categories: [
      {
        categoryId: 'title_slide',
        categoryNumber: 1,
        title: 'Custom Title',
        descriptionGuide: 'Guide',
        status: 'present',
        evidenceText: [],
        missingDetails: [],
        notes: '',
        contentOutline: ['• Custom Template Outline']
      }
    ],
    totalCovered: 1,
    totalPresent: 1,
    totalPartiallyCovered: 0,
    totalMissing: 0,
    totalNeedsVerification: 0,
    completionPercentage: 100,
    isReadyForTemplateSelection: true,
    unresolvedQuestions: [],
    analyzedAt: new Date()
  }, {
    templateOption: 'custom_upload',
    parsedTemplate
  });

  assert.strictEqual(customGeneratedResult.status, 'success');
  const customPath = path.resolve(customGeneratedResult.fileName);
  assert.ok(fs.existsSync(customPath));

  fs.unlinkSync(seedPath);
  fs.unlinkSync(customPath);
  console.log('✓ TEST 8 Passed: Uploaded template parsed successfully and generated adaptive deck using extracted styles.\n');
}

console.log('====================================================');
console.log('   All 8 PPTX Generation Test Suites PASSED!        ');
console.log('====================================================');


