import type { 
  SlideCategoryId, 
  SlideCoverageStatus, 
  SlideCategoryAnalysis, 
  ProjectAnalysisInput, 
  PptProjectAnalysis,
  GroqAiConfig,
  SlideChecklistItem
} from '../types';

/**
 * Standard 10-Slide Hackathon Pitch Preset
 */
export const DEFAULT_10_SLIDES = [
  {
    id: 'title_slide' as SlideCategoryId,
    number: 1,
    title: 'Title Slide',
    descriptionGuide: 'Project name, tagline, team name, members and college name.',
    defaultQuestion: 'What is your official project name, tagline, team name, members and college name?'
  },
  {
    id: 'problem_statement' as SlideCategoryId,
    number: 2,
    title: 'Problem Statement',
    descriptionGuide: 'The real-world problem and why it matters.',
    defaultQuestion: 'What real-world problem does your project solve and why does it matter right now?'
  },
  {
    id: 'existing_solutions' as SlideCategoryId,
    number: 3,
    title: 'Existing Solutions & Gaps',
    descriptionGuide: 'Current solutions and their shortcomings.',
    defaultQuestion: 'Which existing solutions did you compare, and what are their specific shortcomings?'
  },
  {
    id: 'proposed_solution' as SlideCategoryId,
    number: 4,
    title: 'Proposed Solution',
    descriptionGuide: 'What the proposed solution is and how it works.',
    defaultQuestion: 'What is your proposed solution and how does it fundamentally work?'
  },
  {
    id: 'key_features' as SlideCategoryId,
    number: 5,
    title: 'Key Features & Innovation',
    descriptionGuide: 'Main features, unique selling points and innovation.',
    defaultQuestion: 'What are your main features, unique selling points (USP), and core innovation?'
  },
  {
    id: 'system_architecture' as SlideCategoryId,
    number: 6,
    title: 'System Architecture / Workflow',
    descriptionGuide: 'The system flow from user to frontend, backend, database, AI and APIs, where applicable.',
    defaultQuestion: 'How does your system flow from user to frontend, backend, database, AI and APIs?'
  },
  {
    id: 'technology_stack' as SlideCategoryId,
    number: 7,
    title: 'Technology Stack',
    descriptionGuide: 'Frontend, backend, database, AI/ML, APIs and hardware, if applicable.',
    defaultQuestion: 'Which specific technologies (frontend, backend, database, APIs) are actually implemented?'
  },
  {
    id: 'prototype_demo' as SlideCategoryId,
    number: 8,
    title: 'Prototype / Demo',
    descriptionGuide: 'UI screenshots, working prototype, demo flow and actual output.',
    defaultQuestion: 'Do you have prototype screenshots, working prototype flow, or verified demo output?'
  },
  {
    id: 'feasibility_impact' as SlideCategoryId,
    number: 9,
    title: 'Feasibility, Impact & Scalability',
    descriptionGuide: 'Implementation feasibility, target users, expected impact and future expansion.',
    defaultQuestion: 'Who are your target users, what evidence supports expected impact, and how will it scale?'
  },
  {
    id: 'conclusion_team' as SlideCategoryId,
    number: 10,
    title: 'Conclusion & Team',
    descriptionGuide: 'Key takeaway, team contributions and contact details.',
    defaultQuestion: 'What is your final key takeaway, individual team contributions, and contact details?'
  }
];

/**
 * Expanded 12-Slide Hackathon Pitch Preset
 */
export const EXPANDED_12_SLIDES = [
  ...DEFAULT_10_SLIDES.slice(0, 8),
  {
    id: 'business_model' as SlideCategoryId,
    number: 9,
    title: 'Business Model & Monetization',
    descriptionGuide: 'Value proposition, revenue streams, customer acquisition, and monetization strategy.',
    defaultQuestion: 'What is your monetization strategy, revenue model, and target customer pricing?'
  },
  {
    id: 'feasibility_impact' as SlideCategoryId,
    number: 10,
    title: 'Feasibility, Impact & Scalability',
    descriptionGuide: 'Implementation feasibility, target users, expected impact and future expansion.',
    defaultQuestion: 'Who are your target users, what evidence supports expected impact, and how will it scale?'
  },
  {
    id: 'roadmap_expansion' as SlideCategoryId,
    number: 11,
    title: 'Future Roadmap & Expansion',
    descriptionGuide: 'Post-hackathon development milestones, next release phases, and future expansion.',
    defaultQuestion: 'What are your key post-hackathon development milestones and future roadmap goals?'
  },
  {
    id: 'conclusion_team' as SlideCategoryId,
    number: 12,
    title: 'Conclusion & Team',
    descriptionGuide: 'Key takeaway, team contributions and contact details.',
    defaultQuestion: 'What is your final key takeaway, individual team contributions, and contact details?'
  }
];

export const SLIDE_CATEGORIES_DEFINITION = DEFAULT_10_SLIDES;

/**
 * Extracts and calculates dynamic slide checklist items from hash (#) lines.
 * Supports:
 *   # 1. Project Overview & Vision
 *   # Problem Statement: The core friction
 *   ## Market Opportunity
 *   #1 Slide Title
 */
export function parseHashChecklist(text: string): SlideChecklistItem[] {
  if (!text || typeof text !== 'string') return [];

  const lines = text.split('\n');
  const slideLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^#+\s*\d*[\.\)]?\s*\S+/.test(trimmed)) {
      slideLines.push(trimmed);
    }
  }

  if (slideLines.length === 0) return [];

  return slideLines.map((raw, idx) => {
    let clean = raw.replace(/^#+\s*/, '').trim();
    clean = clean.replace(/^\d+[\.\)\-:]\s*/, '').trim();

    const colonIdx = clean.indexOf(':');
    let title = clean;
    let guide = 'Details, evidence, and deliverables for this pitch slide.';

    if (colonIdx > 0 && colonIdx < 60) {
      title = clean.slice(0, colonIdx).trim();
      const extractedGuide = clean.slice(colonIdx + 1).trim();
      if (extractedGuide) guide = extractedGuide;
    }

    const safeTitle = title || `Slide ${idx + 1}`;
    const safeId = safeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `slide_${idx + 1}`;

    return {
      id: safeId as any,
      number: idx + 1,
      title: safeTitle,
      descriptionGuide: guide,
      defaultQuestion: `What specific details and proof do you have for ${safeTitle}?`
    };
  });
}

/**
 * Default editable hash checklist template
 */
export function getDefaultHashChecklistText(): string {
  return [
    '# 1. Project Title & Vision: Project name, tagline, team name and event',
    '# 2. Problem Statement: Real-world pain point and why it matters',
    '# 3. Existing Solutions & Gaps: Current alternatives and their shortcomings',
    '# 4. Proposed Solution: How our application works and core value',
    '# 5. Key Features & Innovation: Main features, USP and innovation',
    '# 6. System Architecture & Tech Stack: End-to-end user and data flow',
    '# 7. Live Prototype & Demo: Verified working deliverables and proofs',
    '# 8. Feasibility & Market Impact: Expected outcomes and scalability',
    '# 9. Conclusion & Team: Key pitch takeaway, team contributions and contact'
  ].join('\n');
}

/**
 * Point-wise starter template for hackathon project descriptions
 */
export function getPointWiseStarterTemplate(): string {
  return `• Project Name: HackSync
• Tagline: Real-Time Zero-Friction Hackathon Workspace
• Team & Members: Sameer (Full Stack / WebRTC), Alex (UI/UX Lead) — Tech Institute

• Problem Statement:
  - Participants lose hours configuring cloud drives and sharing large screen recordings over venue Wi-Fi.
  - Google Drive permission confusion leads to judge access denied errors.
  - Adding GitHub contributors manually is slow and repetitive under 24h pressure.

• Proposed Solution:
  - Browser-to-browser P2P file transfers using WebRTC DataChannels that bypass server bandwidth bottlenecks.
  - Google Drive Demo Video Library that automatically verifies judge-viewable links.
  - 1-Click Git Connect to link repository and grant contributor access to teammates instantly.

• Key Features & Innovation:
  - Direct P2P transfers with local caching and zero server storage cost.
  - Instant Google Drive demo upload with verified playback status.
  - AI-Powered Pitch Builder evaluating deck completeness against judging checklists.

• System Architecture & Tech Stack:
  - Frontend: React 19, TypeScript, Vite, Tailwind CSS, Lucide React.
  - P2P Data Layer: WebRTC DataChannels, fflate, IndexedDB local caching.
  - Cloud & Auth: Google Drive REST API, Supabase PostgreSQL with strict RLS.

• Prototype & Demo Status:
  - Functional local prototype running live on localhost:5173.
  - Tested 100MB file transfers between peer browser tabs.
  - Video upload, verification polling, and pitch review all fully working.

• Feasibility & Impact:
  - Target audience: 500,000+ hackathon participants globally every year.
  - Near-zero server costs because P2P offloads bandwidth to client devices.
  - Easily scalable to university hackathons and enterprise internal hack days.

• Conclusion & Team:
  - HackSync eliminates hackathon submission chaos so builders can focus on shipping.
  - Contributor Roles: Sameer (P2P protocol & backend), Alex (design system & workflows).
  - Contact: team@hacksync.dev`;
}


/**
 * Future Groq AI Configuration (Prepare only - no live API calls or keys in frontend)
 */
export const GROQ_AI_CONFIG: GroqAiConfig = {
  provider: 'groq',
  defaultModel: 'openai/gpt-oss-20b',
  isConfigured: false
};

/**
 * Queries server-side Groq status without exposing API keys
 */
export async function fetchGroqAiStatus(): Promise<GroqAiConfig> {
  try {
    const res = await fetch('/api/groq-status');
    if (res.ok) {
      const data = await res.json();
      return {
        provider: 'groq',
        defaultModel: 'openai/gpt-oss-20b',
        activeModel: data.activeModel || 'openai/gpt-oss-20b',
        isConfigured: Boolean(data.isConfigured)
      };
    }
  } catch (err) {
    console.error('Failed to query Groq status from backend:', err);
  }
  return {
    provider: 'groq',
    defaultModel: 'openai/gpt-oss-20b',
    isConfigured: false
  };
}

/**
 * Calls the secure backend endpoint /api/groq-analyze for real AI evaluation
 */
export async function analyzeProjectWithBackendApi(input: ProjectAnalysisInput): Promise<PptProjectAnalysis> {
  const res = await fetch('/api/groq-analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.success) {
    const errorMsg = data?.error || `Analysis request failed with status ${res.status}`;
    const err = new Error(errorMsg);
    (err as any).code = data?.code;
    (err as any).statusCode = res.status;
    throw err;
  }

  const analysis = data.analysis as PptProjectAnalysis;
  if (analysis && typeof analysis.analyzedAt === 'string') {
    analysis.analyzedAt = new Date(analysis.analyzedAt);
  }
  return analysis;
}

/**
 * Realistic Hackathon Example Project Data
 */
export function getExampleHackathonProject(): ProjectAnalysisInput {
  return {
    projectName: 'HackSync',
    hackathonName: 'Global Hackathon 2026',
    teamName: 'SyncSquad',
    membersDetails: 'Sameer (Full Stack / WebRTC), Alex (UI/UX Lead), Sarah (Cloud & DevOps) - Tech Institute',
    description: `Project Overview:
HackSync is an all-in-one real-time collaborative workspace designed specifically for hackathon teams under tight deadlines.

Problem Statement:
Hackathon participants lose valuable hours juggling disparate tools: slow cloud storage for huge asset transfers, messy Google Drive permission links for judge demo video submissions, and cumbersome Git collaborator management. Most cloud drives throttle large local video and zip transfers over weak venue Wi-Fi, causing last-minute submission penalties.

Existing Solutions & Gaps:
Teams currently rely on Google Drive, Discord, Slack, and manual GitHub settings:
1. Discord file size limits block raw screen recordings and datasets.
2. Google Drive requires navigating permission menus; judges often hit "Access Denied" on restricted videos.
3. Adding team collaborators on GitHub requires navigating repository settings page by page.

Proposed Solution:
HackSync provides a unified, zero-friction web application featuring:
1. Browser-to-browser P2P file transfers using WebRTC DataChannels that bypass server bandwidth limits on venue networks.
2. Verified Google Drive Demo Video Library that automatically manages viewable webViewLinks and "Anyone with link" judge permissions.
3. 1-Click Git Connect to link repository and grant contributor access to all team members instantly.

Key Features & Innovation:
- High-Speed WebRTC P2P Transfer: Direct peer transfers with IndexedDB local caching and zero server storage cost.
- Instant Hackathon Video Link: Resumable chunked upload with polling to guarantee judge playback readiness.
- 1-Click Team Contributor Setup: Leader links repo and confirms invite permissions for the entire roster in one click.
- Automated 10-Slide Pitch Builder: Analyzes project completeness against hackathon judging criteria.

System Architecture / Workflow:
The system flow begins with the user accessing the React frontend.
- P2P Data Layer: Team peers join a secure room via Supabase Realtime signaling and establish direct WebRTC DataChannels.
- Video Layer: Google Drive REST API uploads videos via resumable sessions with automatic permission updating.
- Git Layer: Team roster binds GitHub identities, preparing write/push access invites.
- Backend: Supabase PostgreSQL stores team membership and session state with strict Row Level Security (RLS).

Technology Stack:
- Frontend: React 19, TypeScript, Vite, Tailwind CSS, Lucide React.
- Networking & P2P: WebRTC DataChannels, fflate, JSZip, IndexedDB.
- Cloud & Video: Google Drive v3 REST API, OAuth 2.0.
- Database & Auth: Supabase (PostgreSQL, Supabase Auth, Realtime Broadcast).

Prototype / Demo:
Fully functional local prototype verified. P2P transfers tested with 100MB zip files between local tabs. Google Drive video upload and playback verified. Sidebar navigation and Git Connect dashboard interactive and live on localhost:5173.

Feasibility, Impact & Scalability:
HackSync directly targets over 500,000 hackathon participants globally each year. Because P2P transfers offload bandwidth to client devices, server infrastructure costs remain near zero. Scalable to university hackathons and enterprise hack days.

Conclusion & Team:
HackSync eliminates hackathon submission chaos so builders can focus on shipping.
- Sameer: WebRTC peer protocol, P2P transfer engine, and Supabase integration.
- Alex: Design system, dark navy responsive UI, and interactive dashboard workflows.
- Sarah: Google Drive API integration, token handling, and performance optimization.
Contact: team@hacksync.dev`
  };
}

/**
 * Helper to extract sentences or snippets containing matched terms
 */
function extractMatchingSentences(text: string, keywords: string[]): string[] {
  const sentences = text
    .split(/(?<=[.!?\n])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 15);

  const matched: string[] = [];
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) {
        matched.push(sentence);
        break;
      }
    }
    if (matched.length >= 3) break;
  }
  return matched;
}

/**
 * Modular Frontend Project Analyzer
 * Strictly follows safety and transparency rules:
 * - Never invents facts or claims.
 * - Distinguishes provided text from verified execution.
 * - Categorizes into: Missing, Partially Covered, Present, Needs Verification.
 */
export function analyzeHackathonProject(input: ProjectAnalysisInput): PptProjectAnalysis {
  const text = (input.description || '').trim();
  const projectName = (input.projectName || '').trim();
  const hackathonName = (input.hackathonName || '').trim();
  const teamName = (input.teamName || '').trim();
  const membersDetails = (input.membersDetails || '').trim();

  const categories: SlideCategoryAnalysis[] = [];

  // ========================================================
  // SLIDE 1: Title Slide
  // ========================================================
  {
    const hasProjectName = Boolean(projectName || text.match(/project(\s*name)?:?\s*([A-Za-z0-9_\- ]+)/i));
    const hasTeamName = Boolean(teamName || text.match(/team(\s*name)?:?\s*([A-Za-z0-9_\- ]+)/i));
    const hasMembers = Boolean(membersDetails || text.match(/members?|contributor|lead|developer/i));
    const hasTaglineOrCollege = Boolean(hackathonName || text.match(/tagline|college|university|institute|hackathon/i));

    const evidence: string[] = [];
    if (projectName) evidence.push(`Project Name: "${projectName}"`);
    if (teamName) evidence.push(`Team Name: "${teamName}"`);
    if (membersDetails) evidence.push(`Team Members: "${membersDetails}"`);
    if (hackathonName) evidence.push(`Event: "${hackathonName}"`);

    const missing: string[] = [];
    if (!hasProjectName) missing.push('Project name or title is missing.');
    if (!hasTeamName) missing.push('Team name is missing.');
    if (!hasMembers) missing.push('Team member names and roles are missing.');
    if (!hasTaglineOrCollege) missing.push('College name or project tagline is not specified.');

    let status: SlideCoverageStatus = 'missing';
    if (hasProjectName && hasTeamName && hasMembers) {
      status = 'present';
    } else if (hasProjectName || hasTeamName || hasMembers) {
      status = 'partially_covered';
    }

    categories.push({
      categoryId: 'title_slide',
      categoryNumber: 1,
      title: 'Title Slide',
      descriptionGuide: 'Project name, tagline, team name, members and college name.',
      status,
      evidenceText: evidence.length > 0 ? evidence : extractMatchingSentences(text, ['project', 'team', 'members']),
      missingDetails: missing,
      notes: status === 'present' 
        ? 'All key identity attributes provided.' 
        : 'Ensure your official project title, team name, and member credentials are listed.',
      contentOutline: [
        `Project Title: ${projectName || 'Hackathon Project'}`,
        `Team: ${teamName || 'Team Members'}`,
        `Presented for: ${hackathonName || 'Hackathon Submission'}`,
        `Members: ${membersDetails || 'Contributor Roster'}`
      ],
      targetedQuestion: missing.length > 0 ? 'What is your official project name, team name, and member details?' : undefined
    });
  }

  // ========================================================
  // SLIDE 2: Problem Statement
  // ========================================================
  {
    const problemMatches = extractMatchingSentences(text, [
      'problem', 'issue', 'pain point', 'challenge', 'struggle', 'friction', 'inefficient', 'time-consuming', 'bottleneck'
    ]);
    const hasDetail = problemMatches.some(s => s.length > 40);

    let status: SlideCoverageStatus = 'missing';
    const missing: string[] = [];

    if (problemMatches.length >= 2 && hasDetail) {
      status = 'present';
    } else if (problemMatches.length === 1) {
      status = 'partially_covered';
      missing.push('Explain who is affected and why solving this problem matters right now.');
    } else {
      status = 'missing';
      missing.push('No specific real-world problem or pain point identified.');
    }

    categories.push({
      categoryId: 'problem_statement',
      categoryNumber: 2,
      title: 'Problem Statement',
      descriptionGuide: 'The real-world problem and why it matters.',
      status,
      evidenceText: problemMatches,
      missingDetails: missing,
      notes: status === 'present' 
        ? 'Concrete pain points and impact articulated.' 
        : 'Highlight the exact real-world struggle and affected audience.',
      contentOutline: [
        'Core Pain Point & Context',
        'Who Experiences This Friction (Target Users)',
        'Consequences of Leaving This Unsolved'
      ],
      targetedQuestion: status !== 'present' ? 'What real-world problem does your project solve and why does it matter?' : undefined
    });
  }

  // ========================================================
  // SLIDE 3: Existing Solutions & Gaps
  // ========================================================
  {
    const gapMatches = extractMatchingSentences(text, [
      'existing', 'current solution', 'alternatives', 'competitor', 'shortcoming', 'drawback', 'limitation', 'gap', 'compared to', 'currently teams'
    ]);
    const namesSpecificTool = text.match(/google drive|dropbox|github|slack|discord|trello|jira|figma|existing tools/i);

    let status: SlideCoverageStatus = 'missing';
    const missing: string[] = [];

    if (gapMatches.length >= 1 && namesSpecificTool) {
      status = 'present';
    } else if (gapMatches.length >= 1 || namesSpecificTool) {
      status = 'partially_covered';
      missing.push('Identify specific existing tools and explain why current alternatives fall short.');
    } else {
      status = 'missing';
      missing.push('No comparison with existing solutions or market alternatives provided.');
    }

    categories.push({
      categoryId: 'existing_solutions',
      categoryNumber: 3,
      title: 'Existing Solutions & Gaps',
      descriptionGuide: 'Current solutions and their shortcomings.',
      status,
      evidenceText: gapMatches,
      missingDetails: missing,
      notes: status === 'present' 
        ? 'Clear gap analysis comparing existing alternatives.' 
        : 'Detail existing tools and articulate why their limitations necessitate your project.',
      contentOutline: [
        'Existing Solutions in the Market',
        'Key Gaps & Failure Points of Current Alternatives',
        'The Opportunity for a Better Approach'
      ],
      targetedQuestion: status !== 'present' ? 'Which existing solutions did you compare, and what are their specific shortcomings?' : undefined
    });
  }

  // ========================================================
  // SLIDE 4: Proposed Solution
  // ========================================================
  {
    const solutionMatches = extractMatchingSentences(text, [
      'solution', 'proposed', 'we built', 'we propose', 'platform', 'system', 'application that', 'works by', 'allows users to', 'designed to'
    ]);
    const hasClearMechanism = solutionMatches.some(s => s.length > 50);

    let status: SlideCoverageStatus = 'missing';
    const missing: string[] = [];

    if (solutionMatches.length >= 2 && hasClearMechanism) {
      status = 'present';
    } else if (solutionMatches.length >= 1) {
      status = 'partially_covered';
      missing.push('Clarify the core mechanism of how your solution works end-to-end.');
    } else {
      status = 'missing';
      missing.push('No clear proposed solution description found.');
    }

    categories.push({
      categoryId: 'proposed_solution',
      categoryNumber: 4,
      title: 'Proposed Solution',
      descriptionGuide: 'What the proposed solution is and how it works.',
      status,
      evidenceText: solutionMatches,
      missingDetails: missing,
      notes: status === 'present' 
        ? 'Well-defined solution mechanism.' 
        : 'State what your project does and explain how it solves the identified pain point.',
      contentOutline: [
        'High-Level Value Proposition',
        'Core Operating Mechanism',
        'How it Eliminates the Problem'
      ],
      targetedQuestion: status !== 'present' ? 'What is your proposed solution and how does it fundamentally work?' : undefined
    });
  }

  // ========================================================
  // SLIDE 5: Key Features & Innovation
  // ========================================================
  {
    const featureMatches = extractMatchingSentences(text, [
      'feature', 'key features', 'innovation', 'unique', 'usp', 'differentiator', 'capability', 'instant', 'automated', 'p2p'
    ]);
    const bulletCount = (text.match(/[-*•]\s+/g) || []).length;
    const hasInnovationWord = Boolean(text.match(/innovat|unique|novel|patent|differentiator|first|bypasses/i));

    let status: SlideCoverageStatus = 'missing';
    const missing: string[] = [];

    if (featureMatches.length >= 2 && (bulletCount >= 2 || hasInnovationWord)) {
      status = 'present';
    } else if (featureMatches.length >= 1) {
      status = 'partially_covered';
      missing.push('Highlight 3-4 distinct features and articulate your primary innovation (USP).');
    } else {
      status = 'missing';
      missing.push('No distinct features or innovation differentiators listed.');
    }

    categories.push({
      categoryId: 'key_features',
      categoryNumber: 5,
      title: 'Key Features & Innovation',
      descriptionGuide: 'Main features, unique selling points and innovation.',
      status,
      evidenceText: featureMatches,
      missingDetails: missing,
      notes: status === 'present' 
        ? 'Multiple distinct features and innovation points identified.' 
        : 'List your core capabilities and emphasize what makes your project unique.',
      contentOutline: [
        'Primary Feature 1 (Core Capability)',
        'Primary Feature 2 (User Experience / Speed)',
        'Primary Feature 3 (Automation / Intelligence)',
        'Unique Selling Proposition (USP)'
      ],
      targetedQuestion: status !== 'present' ? 'What are your main features and unique selling points (USP)?' : undefined
    });
  }

  // ========================================================
  // SLIDE 6: System Architecture / Workflow
  // ========================================================
  {
    const archMatches = extractMatchingSentences(text, [
      'architecture', 'workflow', 'system flow', 'data flow', 'pipeline', 'client', 'server', 'database', 'frontend to backend', 'webrtc', 'api', 'signaling'
    ]);
    const mentionsPipeline = Boolean(text.match(/user ->|flow|pipeline|layer|step 1|step 2|frontend|backend/i));

    let status: SlideCoverageStatus = 'missing';
    const missing: string[] = [];

    if (archMatches.length >= 2 && mentionsPipeline) {
      status = 'present';
    } else if (archMatches.length >= 1) {
      status = 'partially_covered';
      missing.push('Detail the step-by-step flow from user action to backend processing and response.');
    } else {
      status = 'missing';
      missing.push('No architectural workflow or system interaction flow described.');
    }

    // Safety rule: If complex architectural claims exist without evidence, mark needs_verification
    if (status === 'present' && text.match(/blockchain|zero-knowledge|microservices|distributed consensus/i) && archMatches.length < 3) {
      status = 'needs_verification';
      missing.push('Complex architectural claims noted — requires explicit component verification.');
    }

    categories.push({
      categoryId: 'system_architecture',
      categoryNumber: 6,
      title: 'System Architecture / Workflow',
      descriptionGuide: 'The system flow from user to frontend, backend, database, AI and APIs, where applicable.',
      status,
      evidenceText: archMatches,
      missingDetails: missing,
      notes: status === 'present' 
        ? 'System interactions and data pipelines mapped.' 
        : 'Outline how data travels through your frontend, backend, and external integrations.',
      contentOutline: [
        'User Interaction & Client Interface',
        'Data Ingestion & Real-Time Processing Layer',
        'Storage, Database & External API Services'
      ],
      targetedQuestion: status !== 'present' ? 'How does your system flow from user to frontend, backend, database, AI and APIs?' : undefined
    });
  }

  // ========================================================
  // SLIDE 7: Technology Stack
  // ========================================================
  {
    const techMatches = extractMatchingSentences(text, [
      'tech stack', 'technology stack', 'frontend', 'backend', 'database', 'react', 'typescript', 'node', 'python', 'vite', 'tailwind', 'supabase', 'postgresql', 'webrtc', 'docker', 'api'
    ]);
    const techCount = (text.match(/react|vue|angular|svelte|typescript|javascript|python|fastapi|node|express|supabase|firebase|postgresql|mongodb|tailwind|webrtc|docker/gi) || []).length;

    let status: SlideCoverageStatus = 'missing';
    const missing: string[] = [];

    if (techCount >= 4) {
      status = 'present';
    } else if (techCount >= 1) {
      status = 'partially_covered';
      missing.push('Specify concrete technologies across frontend, backend, database, and APIs.');
    } else {
      status = 'missing';
      missing.push('No tech stack or implementation frameworks listed.');
    }

    categories.push({
      categoryId: 'technology_stack',
      categoryNumber: 7,
      title: 'Technology Stack',
      descriptionGuide: 'Frontend, backend, database, AI/ML, APIs and hardware, if applicable.',
      status,
      evidenceText: techMatches,
      missingDetails: missing,
      notes: status === 'present' 
        ? 'Concrete frameworks and tools listed across multiple layers.' 
        : 'List the actual libraries, frameworks, databases, and APIs used in your project.',
      contentOutline: [
        'Frontend & UI Frameworks',
        'Backend Services & Real-time Layer',
        'Database & Storage Engines',
        'APIs & Protocol Integrations'
      ],
      targetedQuestion: status !== 'present' ? 'Which specific technologies (frontend, backend, database, APIs) are actually implemented?' : undefined
    });
  }

  // ========================================================
  // SLIDE 8: Prototype / Demo
  // ========================================================
  {
    const demoMatches = extractMatchingSentences(text, [
      'prototype', 'demo', 'working', 'tested', 'live', 'screenshot', 'mvp', 'video', 'output', 'localhost', 'status'
    ]);
    const claimsVerification = Boolean(text.match(/verified|working prototype|tested locally|live demo|demo flow/i));

    let status: SlideCoverageStatus = 'missing';
    const missing: string[] = [];

    if (demoMatches.length >= 1 && claimsVerification) {
      // In accordance with safety prompt: distinguish information provided from independently verified
      status = 'needs_verification';
      missing.push('Working prototype reported in description; actual screenshots and demo output require live verification.');
    } else if (demoMatches.length >= 1) {
      status = 'partially_covered';
      missing.push('Provide details on the demo flow, prototype testing results, and UI screenshots.');
    } else {
      status = 'missing';
      missing.push('No prototype status, screenshots, or demo verification provided.');
    }

    categories.push({
      categoryId: 'prototype_demo',
      categoryNumber: 8,
      title: 'Prototype / Demo',
      descriptionGuide: 'UI screenshots, working prototype, demo flow and actual output.',
      status,
      evidenceText: demoMatches,
      missingDetails: missing,
      notes: status === 'needs_verification'
        ? 'Prototype flow described; verify that visual screenshots and live output are ready for judging.'
        : 'Describe what you have built and demonstrate actual working output.',
      contentOutline: [
        'Current Implementation Status (MVP / Working Demo)',
        'Key Walkthrough Screenshots & User Flow',
        'Validated Outputs & Test Results'
      ],
      targetedQuestion: status === 'missing' ? 'Do you have prototype screenshots, working demo flow, or verified output?' : undefined
    });
  }

  // ========================================================
  // SLIDE 9: Feasibility, Impact & Scalability
  // ========================================================
  {
    const impactMatches = extractMatchingSentences(text, [
      'impact', 'scalability', 'target users', 'market', 'scale', 'future', 'feasibility', 'audience', 'adoption', 'expansion'
    ]);
    const mentionsUsersOrScale = Boolean(text.match(/users|audience|scale|expansion|future scope|growth/i));

    let status: SlideCoverageStatus = 'missing';
    const missing: string[] = [];

    if (impactMatches.length >= 2 && mentionsUsersOrScale) {
      status = 'present';
    } else if (impactMatches.length >= 1) {
      status = 'partially_covered';
      missing.push('State target user metrics, feasibility justifications, and future scaling plans.');
    } else {
      status = 'missing';
      missing.push('No feasibility, target user impact, or scalability roadmap outlined.');
    }

    categories.push({
      categoryId: 'feasibility_impact',
      categoryNumber: 9,
      title: 'Feasibility, Impact & Scalability',
      descriptionGuide: 'Implementation feasibility, target users, expected impact and future expansion.',
      status,
      evidenceText: impactMatches,
      missingDetails: missing,
      notes: status === 'present' 
        ? 'Impact metrics and scalability dimensions articulated.' 
        : 'Specify who uses this, why it is practical to deploy, and how it expands beyond the hackathon.',
      contentOutline: [
        'Target Audience & Practical Feasibility',
        'Quantitative / Qualitative Expected Impact',
        'Scalability Roadmap & Future Expansion'
      ],
      targetedQuestion: status !== 'present' ? 'Who are your target users, what evidence supports expected impact, and how will it scale?' : undefined
    });
  }

  // ========================================================
  // SLIDE 10: Conclusion & Team
  // ========================================================
  {
    const conclusionMatches = extractMatchingSentences(text, [
      'conclusion', 'summary', 'team', 'takeaway', 'contributions', 'contact', 'future', 'developed by', 'call to action'
    ]);
    const hasTeamMention = Boolean(membersDetails || teamName || text.match(/sameer|alex|sarah|developer|engineer|designer|contributor/i));

    let status: SlideCoverageStatus = 'missing';
    const missing: string[] = [];

    if (conclusionMatches.length >= 1 && hasTeamMention) {
      status = 'present';
    } else if (hasTeamMention || conclusionMatches.length >= 1) {
      status = 'partially_covered';
      missing.push('Summarize key takeaway and outline individual team contributions.');
    } else {
      status = 'missing';
      missing.push('No conclusion takeaway, team roles, or contact details provided.');
    }

    categories.push({
      categoryId: 'conclusion_team',
      categoryNumber: 10,
      title: 'Conclusion & Team',
      descriptionGuide: 'Key takeaway, team contributions and contact details.',
      status,
      evidenceText: conclusionMatches,
      missingDetails: missing,
      notes: status === 'present' 
        ? 'Final pitch takeaway and team contribution summary prepared.' 
        : 'Include a memorable summary, team responsibilities, and contact info.',
      contentOutline: [
        'Key Pitch Takeaway & Summary',
        'Team Member Roles & Individual Contributions',
        'Repository & Contact Information'
      ],
      targetedQuestion: status !== 'present' ? 'What is your final key takeaway, individual team contributions, and contact details?' : undefined
    });
  }

  // ========================================================
  // Summary Aggregation
  // ========================================================
  let totalPresent = 0;
  let totalPartiallyCovered = 0;
  let totalMissing = 0;
  let totalNeedsVerification = 0;

  for (const cat of categories) {
    if (cat.status === 'present') totalPresent++;
    else if (cat.status === 'partially_covered') totalPartiallyCovered++;
    else if (cat.status === 'needs_verification') totalNeedsVerification++;
    else totalMissing++;
  }

  const totalCovered = totalPresent + totalPartiallyCovered + totalNeedsVerification;

  // Weighted score calculation:
  // Present = 10 pts, Partially Covered = 6 pts, Needs Verification = 6 pts, Missing = 0 pts
  const count = categories.length || 10;
  const score = (totalPresent * 10) + (totalPartiallyCovered * 6) + (totalNeedsVerification * 6);
  const completionPercentage = Math.min(100, Math.round((score / (count * 10)) * 100));

  // Ready for template selection when no category is completely missing and completion >= 70%
  const isReadyForTemplateSelection = totalMissing === 0 && completionPercentage >= 70;

  const unresolvedQuestions = categories
    .filter(c => c.targetedQuestion)
    .map(c => c.targetedQuestion!);

  return {
    projectName: projectName || 'Hackathon Project',
    hackathonName,
    teamName,
    membersDetails,
    rawDescription: text,
    categories,
    totalCovered,
    totalPresent,
    totalPartiallyCovered,
    totalMissing,
    totalNeedsVerification,
    completionPercentage,
    isReadyForTemplateSelection,
    unresolvedQuestions,
    analyzedAt: new Date(),
    totalCategories: categories.length,
    presentCount: totalPresent,
    partiallyCoveredCount: totalPartiallyCovered,
    missingCount: totalMissing,
    needsVerificationCount: totalNeedsVerification,
    readinessStatus: isReadyForTemplateSelection ? 'ready_for_pitch' : completionPercentage >= 40 ? 'almost_ready' : 'needs_work'
  };
}

