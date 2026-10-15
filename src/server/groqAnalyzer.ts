import { z } from 'zod';
import type { 
  ProjectAnalysisInput, 
  PptProjectAnalysis, 
  SlideCategoryAnalysis, 
  SlideCoverageStatus,
  SlideChecklistItem
} from '../types.ts';

/**
 * Standard 10-Slide Hackathon Pitch Preset (Default)
 */
export const DEFAULT_10_SLIDES: SlideChecklistItem[] = [
  {
    id: 'title_slide',
    number: 1,
    title: 'Title Slide',
    descriptionGuide: 'Project name, tagline, team name, members and college.',
    defaultQuestion: 'What is your official project name, tagline, team name, members and college?'
  },
  {
    id: 'problem_statement',
    number: 2,
    title: 'Problem Statement',
    descriptionGuide: 'Real-world problem, user pain point, and why it matters.',
    defaultQuestion: 'What real-world problem does your project solve and why does it matter right now?'
  },
  {
    id: 'existing_solutions',
    number: 3,
    title: 'Existing Solutions & Gaps',
    descriptionGuide: 'Existing solutions, alternatives, and their specific shortcomings.',
    defaultQuestion: 'Which existing solutions did you compare, and what are their specific shortcomings?'
  },
  {
    id: 'proposed_solution',
    number: 4,
    title: 'Proposed Solution',
    descriptionGuide: 'Proposed solution, core concept, and how it fundamentally works.',
    defaultQuestion: 'What is your proposed solution and how does it fundamentally work?'
  },
  {
    id: 'key_features',
    number: 5,
    title: 'Key Features & Innovation',
    descriptionGuide: 'Main features, unique selling point (USP), and core innovation.',
    defaultQuestion: 'What are your main features, unique selling points (USP), and core innovation?'
  },
  {
    id: 'system_architecture',
    number: 6,
    title: 'System Architecture / Workflow',
    descriptionGuide: 'User flow, data flow, frontend, backend, database, and API interactions.',
    defaultQuestion: 'How does your system flow from user to frontend, backend, database, AI and APIs?'
  },
  {
    id: 'technology_stack',
    number: 7,
    title: 'Technology Stack',
    descriptionGuide: 'Frontend, backend, database, AI/ML, APIs and hardware, if applicable.',
    defaultQuestion: 'Which specific technologies (frontend, backend, database, APIs) are actually implemented?'
  },
  {
    id: 'prototype_demo',
    number: 8,
    title: 'Prototype / Demo',
    descriptionGuide: 'UI screenshots, working prototype, demo flow and verified output.',
    defaultQuestion: 'Do you have prototype screenshots, working prototype flow, or verified demo output?'
  },
  {
    id: 'feasibility_impact',
    number: 9,
    title: 'Feasibility, Impact & Scalability',
    descriptionGuide: 'Implementation feasibility, target users, expected impact and future expansion.',
    defaultQuestion: 'Who are your target users, what evidence supports expected impact, and how will it scale?'
  },
  {
    id: 'conclusion_team',
    number: 10,
    title: 'Conclusion & Team',
    descriptionGuide: 'Key takeaway, team contributions and contact details.',
    defaultQuestion: 'What is your final key takeaway, individual team contributions, and contact details?'
  }
];

/**
 * Expanded 12-Slide Hackathon Pitch Preset
 */
export const EXPANDED_12_SLIDES: SlideChecklistItem[] = [
  {
    id: 'title_slide',
    number: 1,
    title: 'Title Slide',
    descriptionGuide: 'Project name, tagline, team name, members and college.',
    defaultQuestion: 'What is your official project name, tagline, team name, members and college?'
  },
  {
    id: 'problem_statement',
    number: 2,
    title: 'Problem Statement',
    descriptionGuide: 'Real-world problem, user pain point, and why it matters.',
    defaultQuestion: 'What real-world problem does your project solve and why does it matter right now?'
  },
  {
    id: 'existing_solutions',
    number: 3,
    title: 'Existing Solutions & Gaps',
    descriptionGuide: 'Current market alternatives and their specific shortcomings.',
    defaultQuestion: 'Which existing solutions did you compare, and what are their specific shortcomings?'
  },
  {
    id: 'proposed_solution',
    number: 4,
    title: 'Proposed Solution',
    descriptionGuide: 'Proposed solution, core concept, and how it fundamentally works.',
    defaultQuestion: 'What is your proposed solution and how does it fundamentally work?'
  },
  {
    id: 'key_features',
    number: 5,
    title: 'Key Features & Innovation',
    descriptionGuide: 'Main features, unique selling point (USP), and core innovation.',
    defaultQuestion: 'What are your main features, unique selling points (USP), and core innovation?'
  },
  {
    id: 'system_architecture',
    number: 6,
    title: 'System Architecture / Workflow',
    descriptionGuide: 'User flow, data flow, frontend, backend, database, and API interactions.',
    defaultQuestion: 'How does your system flow from user to frontend, backend, database, AI and APIs?'
  },
  {
    id: 'technology_stack',
    number: 7,
    title: 'Technology Stack',
    descriptionGuide: 'Frontend frameworks, backend services, database, AI/ML models, and APIs.',
    defaultQuestion: 'Which specific technologies (frontend, backend, database, APIs) are actually implemented?'
  },
  {
    id: 'prototype_demo',
    number: 8,
    title: 'Prototype / Demo',
    descriptionGuide: 'UI screenshots, working prototype, demo flow and verified output.',
    defaultQuestion: 'Do you have prototype screenshots, working prototype flow, or verified demo output?'
  },
  {
    id: 'business_model',
    number: 9,
    title: 'Business Model & Monetization',
    descriptionGuide: 'Value proposition, revenue streams, customer acquisition, and monetization strategy.',
    defaultQuestion: 'What is your monetization strategy, revenue model, and target customer pricing?'
  },
  {
    id: 'feasibility_impact',
    number: 10,
    title: 'Feasibility, Impact & Scalability',
    descriptionGuide: 'Implementation feasibility, target users, measurable impact, and scaling strategy.',
    defaultQuestion: 'Who are your target users, what evidence supports expected impact, and how will it scale?'
  },
  {
    id: 'roadmap_expansion',
    number: 11,
    title: 'Future Roadmap & Expansion',
    descriptionGuide: 'Post-hackathon development milestones, next release phases, and future expansion.',
    defaultQuestion: 'What are your key post-hackathon development milestones and future roadmap goals?'
  },
  {
    id: 'conclusion_team',
    number: 12,
    title: 'Conclusion & Team',
    descriptionGuide: 'Final key takeaway, individual team roles/contributions, and contact details.',
    defaultQuestion: 'What is your final key takeaway, individual team contributions, and contact details?'
  }
];

export const REQUIRED_SLIDE_CATEGORIES = DEFAULT_10_SLIDES;

// Helper to normalize model status strings to valid enum values
const normalizeStatus = (val: unknown): 'missing' | 'partially_covered' | 'present' | 'needs_verification' => {
  if (typeof val !== 'string') return 'missing';
  const s = val.toLowerCase().trim();
  if (s === 'present' || s === 'covered' || s === 'complete' || s === 'feasible' || s === 'addressed') return 'present';
  if (s === 'partially_covered' || s === 'partial' || s === 'moderate' || s === 'limited' || s === 'in_progress') return 'partially_covered';
  if (s === 'needs_verification' || s === 'verify' || s === 'unverified' || s === 'claimed') return 'needs_verification';
  if (s === 'missing' || s === 'none' || s === 'not_covered' || s === 'pending') return 'missing';
  return 'partially_covered';
};

// Zod Schema for Raw Slide output from Groq (supports dynamic slide numbers up to 50)
const RawSlideSchema = z.object({
  slideNumber: z.number().int().min(1).max(50),
  slideTitle: z.string().optional(),
  status: z.preprocess(normalizeStatus, z.enum(['missing', 'partially_covered', 'present', 'needs_verification'])),
  evidenceFromUserInput: z.union([z.array(z.string()), z.string()]).optional(),
  coveredPoints: z.union([z.array(z.string()), z.string()]).optional(),
  missingPoints: z.union([z.array(z.string()), z.string()]).optional(),
  followUpQuestions: z.union([z.array(z.string()), z.string()]).optional(),
  proposedOutline: z.union([z.array(z.string()), z.string()]).optional(),
  verificationNotes: z.string().optional()
});

// Zod Schema for Overall Model JSON response
export const GroqResponseSchema = z.object({
  slides: z.array(RawSlideSchema),
  overallSummary: z.string().optional(),
  readinessStatus: z.enum(['needs_work', 'almost_ready', 'ready_for_pitch']).optional()
});

export type RawGroqResponse = z.infer<typeof GroqResponseSchema>;

/**
 * Calculates the pitch deck readiness score and completion percentage.
 * Normalized to any number of slides (10, 12, or custom N).
 */
export function calculateCompletionScore(categories: SlideCategoryAnalysis[]): {
  totalPresent: number;
  totalPartiallyCovered: number;
  totalNeedsVerification: number;
  totalMissing: number;
  completionPercentage: number;
  isReadyForTemplateSelection: boolean;
  readinessStatus: 'needs_work' | 'almost_ready' | 'ready_for_pitch';
} {
  let totalPresent = 0;
  let totalPartiallyCovered = 0;
  let totalNeedsVerification = 0;
  let totalMissing = 0;

  for (const cat of categories) {
    if (cat.status === 'present') {
      totalPresent++;
    } else if (cat.status === 'partially_covered') {
      totalPartiallyCovered++;
    } else if (cat.status === 'needs_verification') {
      totalNeedsVerification++;
    } else {
      totalMissing++;
    }
  }

  const count = categories.length || 10;
  const rawScore = (totalPresent * 10) + (totalPartiallyCovered * 6) + (totalNeedsVerification * 6);
  const maxPossible = count * 10;
  const completionPercentage = Math.min(100, Math.round((rawScore / maxPossible) * 100));
  const isReadyForTemplateSelection = totalMissing === 0 && completionPercentage >= 70;

  let readinessStatus: 'needs_work' | 'almost_ready' | 'ready_for_pitch' = 'needs_work';
  if (isReadyForTemplateSelection) {
    readinessStatus = 'ready_for_pitch';
  } else if (completionPercentage >= 40) {
    readinessStatus = 'almost_ready';
  }

  return {
    totalPresent,
    totalPartiallyCovered,
    totalNeedsVerification,
    totalMissing,
    completionPercentage,
    isReadyForTemplateSelection,
    readinessStatus
  };
}

/**
 * Helper to ensure a value is converted to a clean array of non-empty strings
 */
function toStringArray(val: string[] | string | undefined | null): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map(s => typeof s === 'string' ? s.trim() : String(s).trim()).filter(Boolean);
  }
  if (typeof val === 'string') {
    return val.split(/\n+/).map(s => s.trim().replace(/^[-*•]\s*/, '')).filter(Boolean);
  }
  return [];
}

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
    // Match lines starting with #, ##, ###, or #1, #2, etc.
    if (/^#+\s*\d*[\.\)]?\s*\S+/.test(trimmed)) {
      slideLines.push(trimmed);
    }
  }

  if (slideLines.length === 0) return [];

  return slideLines.map((raw, idx) => {
    // Strip leading hashes (e.g. #, ##, ###)
    let clean = raw.replace(/^#+\s*/, '').trim();
    // Strip leading numbering if present (e.g. "1.", "1)", "01 -", etc.)
    clean = clean.replace(/^\d+[\.\)\-:]\s*/, '').trim();

    // Check for colon separator between title and description guide
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
      id: safeId,
      number: idx + 1,
      title: safeTitle,
      descriptionGuide: guide,
      defaultQuestion: `What specific details and proof do you have for ${safeTitle}?`
    };
  });
}

/**
 * Validates analysis input payload.
 * No arbitrary character limit restrictions on project description.
 * Dynamically calculates slide count from user's # checklist.
 */
export function validateAnalysisInput(input: unknown): { valid: true; data: ProjectAnalysisInput } | { valid: false; error: string } {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Request body must be a valid JSON object' };
  }

  const { 
    description, 
    projectName, 
    hackathonName, 
    teamName, 
    membersDetails,
    customSlides,
    checklistText
  } = input as Record<string, unknown>;

  if (typeof description !== 'string' || !description.trim()) {
    return { valid: false, error: 'Project description is required and cannot be empty' };
  }

  // Calculate slides dynamically:
  let validatedCustomSlides: SlideChecklistItem[] | undefined;

  // 1. If explicit checklistText is supplied, parse its # lines
  if (typeof checklistText === 'string' && checklistText.trim()) {
    const parsedFromText = parseHashChecklist(checklistText);
    if (parsedFromText.length > 0) {
      validatedCustomSlides = parsedFromText;
    }
  }

  // 2. Otherwise if customSlides array is supplied
  if (!validatedCustomSlides && Array.isArray(customSlides) && customSlides.length > 0) {
    validatedCustomSlides = customSlides.map((s: any, idx: number) => ({
      id: typeof s.id === 'string' && s.id.trim() ? s.id.trim() : `slide_${idx + 1}`,
      number: typeof s.number === 'number' ? s.number : (idx + 1),
      title: typeof s.title === 'string' && s.title.trim() ? s.title.trim() : `Slide ${idx + 1}`,
      descriptionGuide: typeof s.descriptionGuide === 'string' ? s.descriptionGuide.trim() : '',
      defaultQuestion: typeof s.defaultQuestion === 'string' ? s.defaultQuestion.trim() : undefined
    }));
  }

  // 3. Otherwise if description itself contains # headings, dynamically calculate slides from # lines!
  if (!validatedCustomSlides && typeof description === 'string') {
    const parsedFromDesc = parseHashChecklist(description);
    if (parsedFromDesc.length > 0) {
      validatedCustomSlides = parsedFromDesc;
    }
  }

  return {
    valid: true,
    data: {
      description: description.trim(),
      projectName: typeof projectName === 'string' ? projectName.trim().slice(0, 500) : undefined,
      hackathonName: typeof hackathonName === 'string' ? hackathonName.trim().slice(0, 500) : undefined,
      teamName: typeof teamName === 'string' ? teamName.trim().slice(0, 500) : undefined,
      membersDetails: typeof membersDetails === 'string' ? membersDetails.trim().slice(0, 1000) : undefined,
      customSlides: validatedCustomSlides,
      checklistText: typeof checklistText === 'string' ? checklistText.trim() : undefined
    }
  };
}

/**
 * Builds the Groq System Prompt for any configured slide checklist.
 * Strictly enforces point-wise presentation bullet output.
 */
export function buildGroqSystemPrompt(slides: SlideChecklistItem[] = REQUIRED_SLIDE_CATEGORIES): string {
  const slideList = slides
    .map(s => `${s.number}. "${s.title}" (${s.descriptionGuide})`)
    .join('\n');

  return `You are an expert Hackathon Pitch Evaluation Engine.
Your task is to analyze hackathon project submissions against the exact ${slides.length} required pitch deck slides:
${slideList}

CRITICAL ANALYSIS RULES:
1. Analyze ONLY information provided by the user.
2. NEVER invent technologies, team members, statistics, performance claims, or project achievements.
3. Distinguish "provided in description" from "independently verified". Do NOT mark a claim as verified merely because the user asserts it.
4. Prototype/Demo: Prototype existence, screenshots, and live working output REQUIRE concrete supporting evidence. If only claimed without verifiable demonstration, mark as "needs_verification". If unmentioned, mark as "missing".
5. For status, choose EXACTLY ONE of:
   - "present": Fully addressed with specific details.
   - "partially_covered": Mentioned at a high level but lacking depth, metrics, or specifics.
   - "needs_verification": Described or claimed by the user, but requires supporting proof, live testing, or screenshots.
   - "missing": Not addressed or unmentioned in the user input.
6. Provide targeted, constructive follow-up questions for missing or partially covered points.
7. Do NOT ask again for information that is already clearly supplied.

CRITICAL POINT-WISE FORMAT REQUIREMENT FOR HACKATHONS:
Hackathons evaluate presentations point-wise! For "proposedOutline", you MUST provide 3 to 4 crisp, punchy, presentation-ready bullet points (each formatted as "• Headline: Concrete detail").
Do NOT write dense multi-sentence paragraphs. Presenters need clean bullet points directly usable on presentation slides.

OUTPUT FORMAT:
Respond ONLY with a single valid JSON object strictly matching this schema:
{
  "slides": [
    {
      "slideNumber": 1,
      "slideTitle": "${slides[0]?.title || 'Title Slide'}",
      "status": "partially_covered",
      "evidenceFromUserInput": ["quote or summary from user description"],
      "coveredPoints": ["aspect covered"],
      "missingPoints": ["aspect missing"],
      "followUpQuestions": ["targeted question for the user"],
      "proposedOutline": [
        "• Core Concept: Short punchy point",
        "• Key Mechanism: Point-wise bullet",
        "• Pitch Value: Clear outcome"
      ],
      "verificationNotes": "Objective note regarding verification"
    }
  ],
  "overallSummary": "Concise 2-3 sentence overview of pitch deck completeness.",
  "readinessStatus": "needs_work"
}

IMPORTANT: The "slides" array must contain all ${slides.length} slides (slideNumber 1 to ${slides.length} in sequential order). Each slide's "status" MUST be one of: "present", "partially_covered", "needs_verification", "missing". The "readinessStatus" MUST be one of: "needs_work", "almost_ready", "ready_for_pitch".`;
}

/**
 * Builds the user prompt combining metadata, active slides, and description.
 */
export function buildGroqUserPrompt(
  input: ProjectAnalysisInput,
  slides: SlideChecklistItem[] = REQUIRED_SLIDE_CATEGORIES
): string {
  const slideSummary = slides.map(s => `${s.number}: ${s.title}`).join(', ');
  const parts: string[] = [
    `Please evaluate the following hackathon project against the exact ${slides.length} pitch deck slides (${slideSummary}). Format all slide outlines point-wise with crisp bullet points for presentation slides:`
  ];

  if (input.projectName) parts.push(`Project Name: ${input.projectName}`);
  if (input.hackathonName) parts.push(`Hackathon / Event: ${input.hackathonName}`);
  if (input.teamName) parts.push(`Team Name: ${input.teamName}`);
  if (input.membersDetails) parts.push(`Team Members & Roles: ${input.membersDetails}`);

  parts.push('\nProject Description (Point-wise Hackathon Submission):');
  parts.push(input.description);

  return parts.join('\n');
}

/**
 * Primary Server-Side Groq Analysis Service
 */
export async function analyzeProjectWithGroq(
  input: ProjectAnalysisInput,
  options?: {
    apiKey?: string;
    model?: string;
    timeoutMs?: number;
    mockResponse?: RawGroqResponse; // For testing
  }
): Promise<PptProjectAnalysis> {
  const apiKey = (options?.apiKey !== undefined ? options.apiKey : process.env.GROQ_API_KEY)?.trim();
  const model = (options?.model !== undefined ? options.model : (process.env.GROQ_MODEL || 'openai/gpt-oss-20b'))?.trim();
  const timeoutMs = options?.timeoutMs ?? 35000;

  // Resolve active slide checklist: user custom checklist or default 10
  const activeSlides: SlideChecklistItem[] = (input.customSlides && input.customSlides.length > 0)
    ? input.customSlides
    : REQUIRED_SLIDE_CATEGORIES;

  if (!apiKey && !options?.mockResponse) {
    const error = new Error('GROQ_API_KEY is not configured in server environment');
    (error as any).code = 'GROQ_API_KEY_MISSING';
    throw error;
  }

  let parsedResponse: RawGroqResponse;

  if (options?.mockResponse) {
    parsedResponse = options.mockResponse;
  } else {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          response_format: { type: 'json_object' },
          max_tokens: 8192,
          temperature: 0.1,
          messages: [
            { role: 'system', content: buildGroqSystemPrompt(activeSlides) },
            { role: 'user', content: buildGroqUserPrompt(input, activeSlides) }
          ]
        }),
        signal: controller.signal
      });
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        const timeoutErr = new Error(`Groq API request timed out after ${Math.round(timeoutMs / 1000)} seconds.`);
        (timeoutErr as any).code = 'GROQ_API_TIMEOUT';
        throw timeoutErr;
      }
      const networkErr = new Error(`Failed to connect to Groq API: ${err.message}`);
      (networkErr as any).code = 'GROQ_API_NETWORK_ERROR';
      throw networkErr;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      let errorBody = '';
      try {
        const errorJson = await res.json() as any;
        errorBody = errorJson?.error?.message || JSON.stringify(errorJson);
      } catch {
        errorBody = await res.text();
      }

      if (res.status === 401 || res.status === 403) {
        const authErr = new Error('Invalid or unauthorized Groq API key.');
        (authErr as any).code = 'GROQ_API_AUTH_ERROR';
        (authErr as any).statusCode = res.status;
        throw authErr;
      }

      if (res.status === 429) {
        const rateLimitErr = new Error('Groq API rate limit reached. Please wait a moment before trying again.');
        (rateLimitErr as any).code = 'GROQ_API_RATE_LIMIT';
        (rateLimitErr as any).statusCode = 429;
        throw rateLimitErr;
      }

      if (res.status === 404 || errorBody.toLowerCase().includes('model')) {
        const modelErr = new Error(`Configured model "${model}" is unavailable or not recognized by Groq.`);
        (modelErr as any).code = 'GROQ_MODEL_UNAVAILABLE';
        (modelErr as any).statusCode = res.status;
        throw modelErr;
      }

      const apiErr = new Error(`Groq API error (${res.status}): ${errorBody}`);
      (apiErr as any).code = 'GROQ_API_ERROR';
      (apiErr as any).statusCode = res.status;
      throw apiErr;
    }

    const data = await res.json() as any;
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      const emptyErr = new Error('Groq model returned an empty response.');
      (emptyErr as any).code = 'GROQ_EMPTY_RESPONSE';
      throw emptyErr;
    }

    let jsonParsed: unknown;
    try {
      jsonParsed = JSON.parse(content);
    } catch (parseErr: any) {
      const malformedErr = new Error(`Groq model returned malformed JSON: ${parseErr.message}`);
      (malformedErr as any).code = 'GROQ_MALFORMED_JSON';
      throw malformedErr;
    }

    // Validate using Zod schema
    const zodResult = GroqResponseSchema.safeParse(jsonParsed);
    if (!zodResult.success) {
      if (jsonParsed && typeof jsonParsed === 'object' && Array.isArray((jsonParsed as any).slides)) {
        parsedResponse = {
          slides: (jsonParsed as any).slides.map((s: any, idx: number) => ({
            slideNumber: s.slideNumber || (idx + 1),
            slideTitle: s.slideTitle,
            status: ['missing', 'partially_covered', 'present', 'needs_verification'].includes(s.status) ? s.status : 'missing',
            evidenceFromUserInput: s.evidenceFromUserInput,
            coveredPoints: s.coveredPoints,
            missingPoints: s.missingPoints,
            followUpQuestions: s.followUpQuestions,
            proposedOutline: s.proposedOutline,
            verificationNotes: s.verificationNotes
          })),
          overallSummary: (jsonParsed as any).overallSummary || 'Project analysis completed.',
          readinessStatus: (jsonParsed as any).readinessStatus || 'needs_work'
        };
      } else {
        const invalidErr = new Error('Groq response failed schema validation.');
        (invalidErr as any).code = 'GROQ_SCHEMA_INVALID';
        throw invalidErr;
      }
    } else {
      parsedResponse = zodResult.data;
    }
  }

  // Construct guaranteed categories aligned with activeSlides
  const slideMap = new Map<number, z.infer<typeof RawSlideSchema>>();
  for (const s of parsedResponse.slides) {
    if (s.slideNumber >= 1 && s.slideNumber <= activeSlides.length) {
      slideMap.set(s.slideNumber, s);
    }
  }

  const categories: SlideCategoryAnalysis[] = activeSlides.map(def => {
    let raw = slideMap.get(def.number);
    if (!raw) {
      const lowerDef = def.title.toLowerCase();
      raw = parsedResponse.slides.find(s => {
        const lowerS = (s.slideTitle || '').toLowerCase();
        return lowerS && (lowerS.includes(lowerDef.slice(0, 6)) || lowerDef.includes(lowerS.slice(0, 6)));
      });
    }

    const defaultOutline = [
      `• Problem & Focus: Key aspect of ${def.title}`,
      `• Implementation Detail: Technical approach and solution`,
      `• Outcome & Demo: Expected pitch takeaway`
    ];

    if (!raw) {
      return {
        categoryId: def.id,
        categoryNumber: def.number,
        title: def.title,
        descriptionGuide: def.descriptionGuide,
        status: 'missing' as SlideCoverageStatus,
        evidenceText: [],
        evidenceFromUserInput: [],
        coveredPoints: [],
        missingDetails: [def.descriptionGuide],
        missingPoints: [def.descriptionGuide],
        notes: `No details provided for ${def.title}.`,
        contentOutline: defaultOutline,
        targetedQuestion: def.defaultQuestion,
        followUpQuestions: def.defaultQuestion ? [def.defaultQuestion] : [],
        proposedOutline: defaultOutline,
        verificationNotes: 'Information missing from project description.'
      };
    }

    const evidenceText = toStringArray(raw.evidenceFromUserInput);
    const coveredPoints = toStringArray(raw.coveredPoints);
    const missingDetails = toStringArray(raw.missingPoints);
    const followUpQuestions = toStringArray(raw.followUpQuestions);
    
    // Ensure outlines are formatted point-wise with bullets
    const rawOutlines = toStringArray(raw.proposedOutline);
    const proposedOutline = rawOutlines.length > 0 
      ? rawOutlines.map(item => item.startsWith('•') || item.startsWith('-') ? item : `• ${item}`)
      : defaultOutline;

    return {
      categoryId: def.id,
      categoryNumber: def.number,
      title: def.title,
      descriptionGuide: def.descriptionGuide,
      status: raw.status as SlideCoverageStatus,
      evidenceText: evidenceText.length > 0 ? evidenceText : coveredPoints,
      evidenceFromUserInput: evidenceText,
      coveredPoints,
      missingDetails: missingDetails.length > 0 ? missingDetails : (raw.status !== 'present' ? [def.descriptionGuide] : []),
      missingPoints: missingDetails,
      notes: raw.verificationNotes || (raw.status === 'present' ? 'Addressed in description.' : def.descriptionGuide),
      verificationNotes: raw.verificationNotes,
      contentOutline: proposedOutline,
      proposedOutline,
      targetedQuestion: followUpQuestions[0] || (raw.status !== 'present' ? def.defaultQuestion : undefined),
      followUpQuestions
    };
  });

  const scores = calculateCompletionScore(categories);

  const unresolvedQuestions = categories
    .filter(c => c.status !== 'present' && c.targetedQuestion)
    .map(c => c.targetedQuestion!);

  return {
    projectName: input.projectName || 'Hackathon Project',
    hackathonName: input.hackathonName,
    teamName: input.teamName,
    membersDetails: input.membersDetails,
    rawDescription: input.description,
    categories,
    totalCovered: scores.totalPresent + scores.totalPartiallyCovered + scores.totalNeedsVerification,
    totalPresent: scores.totalPresent,
    totalPartiallyCovered: scores.totalPartiallyCovered,
    totalMissing: scores.totalMissing,
    totalNeedsVerification: scores.totalNeedsVerification,
    completionPercentage: scores.completionPercentage,
    isReadyForTemplateSelection: scores.isReadyForTemplateSelection,
    unresolvedQuestions,
    analyzedAt: new Date(),
    totalCategories: activeSlides.length,
    presentCount: scores.totalPresent,
    partiallyCoveredCount: scores.totalPartiallyCovered,
    missingCount: scores.totalMissing,
    needsVerificationCount: scores.totalNeedsVerification,
    overallSummary: parsedResponse.overallSummary || `Deck analysis completed with ${scores.completionPercentage}% pitch readiness.`,
    readinessStatus: scores.readinessStatus,
    modelUsed: model,
    isAiGenerated: true
  };
}
