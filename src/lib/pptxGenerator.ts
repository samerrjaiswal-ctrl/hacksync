import PptxGenJS from 'pptxgenjs';
import type { 
  PptProjectAnalysis, 
  SlideCategoryAnalysis, 
  PptxGenerationResult,
  PptTemplateOption,
  PptxParsedTemplate
} from '../types';

/**
 * Color Palette: HackSync Dark Navy / Cyan Visual Identity (Default)
 * Kept for full backwards-compatibility.
 */
export const PPTX_COLORS = {
  bgNavy: '0A0F1D',       // Deep Dark Navy Background
  cardNavy: '0F172A',     // Card Surface
  cardNavyAlt: '131D33',  // Slightly lighter card fill
  cardBorder: '1E293B',   // Subtle Card Border
  cyanGlow: '06B6D4',     // Primary Cyan Accent
  cyanBright: '22D3EE',   // Bright Cyan Text/Badges
  textWhite: 'FFFFFF',    // High-Contrast White Heading
  textLight: 'CBD5E1',    // Slate-300 Body Text
  textMuted: '94A3B8',    // Slate-400 Subtitle/Muted Text
  textDim: '64748B',      // Slate-500 Footer/Metadata
  emerald: '10B981',      // Emerald Green (Success, Impact, Verified)
  amber: 'F59E0B',        // Amber (Warning, Partial)
  rose: 'F43F5E'          // Rose (Problem, Critical Friction)
} as const;

/**
 * Presentation Theme Palette Definition
 */
export interface PptxThemePalette {
  bg: string;              // Slide Background
  cardBg: string;          // Card Surface
  cardBgAlt: string;       // Secondary Card Fill / nested container
  border: string;          // Card & Container Border
  borderAccent: string;    // Decorative Border / Accent Line
  accentPrimary: string;   // Primary Accent
  accentBright: string;    // Secondary Bright Accent
  textHeading: string;     // Slide Headings & Titles
  textBody: string;        // Body Text / Bullets
  textMuted: string;       // Subtitles / Labels
  textDim: string;         // Footer & Metadata
  fontFace: string;
  isLightMode: boolean;
  statusPresentBg: string;
  statusPresentText: string;
  statusPresentBorder: string;
  statusPartialBg: string;
  statusPartialText: string;
  statusPartialBorder: string;
  statusVerifyBg: string;
  statusVerifyText: string;
  statusVerifyBorder: string;
  statusMissingBg: string;
  statusMissingText: string;
  statusMissingBorder: string;
}

/**
 * Option 1: HackSync Default Dark Navy & Cyan Theme
 */
export const HACKSYNC_DARK_THEME: PptxThemePalette = {
  bg: '0A0F1D',
  cardBg: '0F172A',
  cardBgAlt: '131D33',
  border: '1E293B',
  borderAccent: '06B6D4',
  accentPrimary: '06B6D4',
  accentBright: '22D3EE',
  textHeading: 'FFFFFF',
  textBody: 'CBD5E1',
  textMuted: '94A3B8',
  textDim: '64748B',
  fontFace: 'Segoe UI',
  isLightMode: false,
  statusPresentBg: '064E3B',
  statusPresentText: '10B981',
  statusPresentBorder: '059669',
  statusPartialBg: '451A03',
  statusPartialText: 'F59E0B',
  statusPartialBorder: 'B45309',
  statusVerifyBg: '164E63',
  statusVerifyText: '22D3EE',
  statusVerifyBorder: '0891B2',
  statusMissingBg: '4C0519',
  statusMissingText: 'F43F5E',
  statusMissingBorder: 'BE123C'
};

/**
 * Option 2: Light Blue Background with Black Lines & Black Text Combination
 */
export const LIGHT_BLUE_INK_THEME: PptxThemePalette = {
  bg: 'E8F4FD',            // Soft Light Blue / Ice Blue Background
  cardBg: 'FFFFFF',        // Pure White Cards for maximum readability
  cardBgAlt: 'F0F7FC',     // Light Sky Tinted Card Containers
  border: '000000',        // Sharp Solid Black Lines
  borderAccent: '000000',  // Solid Black Accent Divider Line
  accentPrimary: '000000', // Black Primary Accent
  accentBright: '0284C7',  // Ocean Sky Blue Contrast Accent
  textHeading: '000000',   // Solid Black Text for Headings
  textBody: '000000',      // Solid Black Text for Bullets and Descriptions
  textMuted: '1E293B',     // Deep Slate/Charcoal for Subtitles
  textDim: '475569',       // Deep Slate for Metadata and Footers
  fontFace: 'Segoe UI',
  isLightMode: true,
  statusPresentBg: 'DCFCE7',
  statusPresentText: '14532D',
  statusPresentBorder: '000000',
  statusPartialBg: 'FEF3C7',
  statusPartialText: '78350F',
  statusPartialBorder: '000000',
  statusVerifyBg: 'E0F2FE',
  statusVerifyText: '075985',
  statusVerifyBorder: '000000',
  statusMissingBg: 'FEE2E2',
  statusMissingText: '7F1D1D',
  statusMissingBorder: '000000'
};

/**
 * Builds a dynamic theme from an uploaded and parsed PPTX template.
 */
export function createThemeFromParsedTemplate(parsed: PptxParsedTemplate): PptxThemePalette {
  const isLight = parsed.isLightMode ?? true;
  const colors = parsed.colors;
  const bg = colors?.background || (isLight ? 'E8F4FD' : '0A0F1D');
  const cardBg = colors?.cardBackground || (isLight ? 'FFFFFF' : '0F172A');
  const border = colors?.border || (isLight ? '000000' : '1E293B');
  const textHeading = colors?.textPrimary || (isLight ? '000000' : 'FFFFFF');
  const textBody = colors?.textPrimary || (isLight ? '000000' : 'CBD5E1');
  const textMuted = colors?.textSecondary || (isLight ? '1E293B' : '94A3B8');
  const accent1 = colors?.accentPrimary || (isLight ? '000000' : '06B6D4');
  const accent2 = colors?.accentSecondary || (isLight ? '0284C7' : '22D3EE');

  return {
    bg,
    cardBg,
    cardBgAlt: isLight ? 'F0F8FF' : '131D33',
    border,
    borderAccent: isLight ? '000000' : accent1,
    accentPrimary: accent1,
    accentBright: accent2,
    textHeading,
    textBody,
    textMuted,
    textDim: isLight ? '475569' : '64748B',
    fontFace: parsed.fonts?.heading || 'Segoe UI',
    isLightMode: isLight,
    statusPresentBg: isLight ? 'DCFCE7' : '064E3B',
    statusPresentText: isLight ? '14532D' : '10B981',
    statusPresentBorder: border,
    statusPartialBg: isLight ? 'FEF3C7' : '451A03',
    statusPartialText: isLight ? '78350F' : 'F59E0B',
    statusPartialBorder: border,
    statusVerifyBg: isLight ? 'E0F2FE' : '164E63',
    statusVerifyText: isLight ? '075985' : '22D3EE',
    statusVerifyBorder: border,
    statusMissingBg: isLight ? 'FEE2E2' : '4C0519',
    statusMissingText: isLight ? '7F1D1D' : 'F43F5E',
    statusMissingBorder: border
  };
}

/**
 * Resolves active theme based on options.
 */
export function getThemeForOptions(options?: {
  templateOption?: PptTemplateOption;
  parsedTemplate?: PptxParsedTemplate;
}): PptxThemePalette {
  if (options?.templateOption === 'light_blue') {
    return LIGHT_BLUE_INK_THEME;
  }
  if (options?.templateOption === 'custom_upload' && options?.parsedTemplate) {
    return createThemeFromParsedTemplate(options.parsedTemplate);
  }
  return HACKSYNC_DARK_THEME;
}

/**
 * Sanitizes project name for a safe, clean presentation filename
 */
export function sanitizePptxFileName(projectName?: string): string {
  const base = (projectName || 'Hackathon_Project').trim();
  const sanitized = base.replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return `${sanitized || 'Hackathon_Project'}_Hackathon_Pitch.pptx`;
}

/**
 * Extracts and formats bullet point text runs.
 * Each bullet is a clean paragraph with:
 * - Proper presentation bullet mark
 * - Generous one-line gap (paraSpaceAfter: 18-22pt)
 * - Comfortable line spacing (lineSpacingMultiple: 1.25)
 * - Dynamic font sizing (13-14pt) to fill cards naturally without empty bottom space.
 */
function createFormattedTextRuns(
  bulletPoints: string[],
  theme: PptxThemePalette = HACKSYNC_DARK_THEME,
  customOptions?: {
    fontSize?: number;
    paraSpaceAfter?: number;
    lineSpacingMultiple?: number;
  }
): PptxGenJS.TextProps[] {
  const points = bulletPoints.filter(Boolean);
  const count = points.length;

  const fontSize = customOptions?.fontSize ?? (count <= 3 ? 13.5 : count <= 4 ? 12.5 : 11.5);
  const paraSpaceAfter = customOptions?.paraSpaceAfter ?? (count <= 3 ? 20 : count <= 4 ? 17 : 14);
  const lineSpacingMultiple = customOptions?.lineSpacingMultiple ?? 1.25;

  if (count === 0) {
    return [{
      text: 'Detailed points and execution metrics to be expanded during presentation.',
      options: {
        color: theme.textMuted,
        fontSize,
        fontFace: theme.fontFace,
        bullet: true,
        paraSpaceAfter,
        lineSpacingMultiple
      }
    }];
  }

  return points.map((pt) => {
    const clean = pt.replace(/^[•\-\*]\s*|\d+[\.\)]\s*/, '').trim();
    return {
      text: clean,
      options: {
        bullet: true,
        color: theme.textBody,
        fontSize,
        fontFace: theme.fontFace,
        paraSpaceAfter,
        lineSpacingMultiple
      }
    };
  });
}

/**
 * Standard Header for Content Slides
 */
function addSlideHeader(
  slide: PptxGenJS.Slide,
  category: SlideCategoryAnalysis,
  _totalCategories?: number,
  theme: PptxThemePalette = HACKSYNC_DARK_THEME
) {
  // Top Accent Bar
  slide.addShape('rect', {
    x: 0.6,
    y: 0.22,
    w: 8.8,
    h: 0.03,
    fill: { color: theme.borderAccent },
    line: { color: theme.borderAccent, width: 0 }
  });

  // Slide Number Pill
  const numStr = String(category.categoryNumber).padStart(2, '0');
  slide.addShape('roundRect', {
    x: 0.6,
    y: 0.35,
    w: 1.0,
    h: 0.38,
    fill: { color: theme.cardBgAlt },
    line: { color: theme.border, width: 1 },
    rectRadius: 0.1
  });

  slide.addText(`SLIDE ${numStr}`, {
    x: 0.6,
    y: 0.35,
    w: 1.0,
    h: 0.38,
    fontSize: 9,
    bold: true,
    color: theme.isLightMode ? theme.textHeading : theme.accentBright,
    fontFace: theme.fontFace,
    align: 'center',
    valign: 'middle'
  });

  // Title
  slide.addText(category.title, {
    x: 1.75,
    y: 0.3,
    w: 6.2,
    h: 0.45,
    fontSize: 18,
    bold: true,
    color: theme.textHeading,
    fontFace: theme.fontFace,
    valign: 'middle'
  });

  // Description / Evaluation Guide
  slide.addText(category.descriptionGuide || 'Key evaluation criteria for pitch readiness.', {
    x: 1.75,
    y: 0.74,
    w: 6.2,
    h: 0.28,
    fontSize: 9.5,
    color: theme.textMuted,
    fontFace: theme.fontFace,
    valign: 'top'
  });

  // Status Badge on Top Right
  const statusColors = {
    present: { bg: theme.statusPresentBg, text: theme.statusPresentText, border: theme.statusPresentBorder, label: 'PRESENT' },
    partially_covered: { bg: theme.statusPartialBg, text: theme.statusPartialText, border: theme.statusPartialBorder, label: 'PARTIAL' },
    needs_verification: { bg: theme.statusVerifyBg, text: theme.statusVerifyText, border: theme.statusVerifyBorder, label: 'VERIFY' },
    missing: { bg: theme.statusMissingBg, text: theme.statusMissingText, border: theme.statusMissingBorder, label: 'MISSING' }
  }[category.status] || { bg: theme.cardBgAlt, text: theme.textMuted, border: theme.border, label: 'REVIEW' };

  slide.addShape('roundRect', {
    x: 8.1,
    y: 0.35,
    w: 1.3,
    h: 0.32,
    fill: { color: statusColors.bg },
    line: { color: statusColors.border, width: 1 },
    rectRadius: 0.1
  });

  slide.addText(statusColors.label, {
    x: 8.1,
    y: 0.35,
    w: 1.3,
    h: 0.32,
    fontSize: 8.5,
    bold: true,
    color: statusColors.text,
    fontFace: theme.fontFace,
    align: 'center',
    valign: 'middle'
  });
}

/**
 * Standard Footer for Content Slides
 */
function addSlideFooter(
  slide: PptxGenJS.Slide,
  projectName: string,
  categoryNumber: number,
  totalCategories: number,
  theme: PptxThemePalette = HACKSYNC_DARK_THEME
) {
  // Divider Line
  slide.addShape('rect', {
    x: 0.6,
    y: 5.12,
    w: 8.8,
    h: 0.015,
    fill: { color: theme.border },
    line: { color: theme.border, width: 0 }
  });

  // Branding Left
  slide.addText(`HackSync  •  ${projectName || 'Hackathon Project'}  •  Pitch Deck`, {
    x: 0.6,
    y: 5.18,
    w: 5.5,
    h: 0.3,
    fontSize: 8.5,
    color: theme.textDim,
    fontFace: theme.fontFace,
    valign: 'middle'
  });

  // Slide Number Right
  slide.addText(`Slide ${categoryNumber} of ${totalCategories}`, {
    x: 6.8,
    y: 5.18,
    w: 2.6,
    h: 0.3,
    fontSize: 8.5,
    bold: true,
    color: theme.textDim,
    fontFace: theme.fontFace,
    align: 'right',
    valign: 'middle'
  });
}

/**
 * Generates Slide 1: Title Slide
 */
function buildTitleSlide(
  pptx: PptxGenJS,
  analysis: PptProjectAnalysis,
  theme: PptxThemePalette = HACKSYNC_DARK_THEME
) {
  const slide = pptx.addSlide();
  slide.background = { color: theme.bg };

  // Main Hero Card
  slide.addShape('roundRect', {
    x: 0.6,
    y: 0.5,
    w: 8.8,
    h: 4.5,
    fill: { color: theme.cardBg },
    line: { color: theme.border, width: 1.5 },
    rectRadius: 0.08
  });

  // Top Accent Stripe
  slide.addShape('rect', {
    x: 0.6,
    y: 0.5,
    w: 8.8,
    h: 0.06,
    fill: { color: theme.borderAccent },
    line: { color: theme.borderAccent, width: 0 }
  });

  // Hackathon Event Pill
  const eventName = analysis.hackathonName || 'Official Hackathon Submission';
  slide.addShape('roundRect', {
    x: 1.1,
    y: 0.9,
    w: 3.4,
    h: 0.36,
    fill: { color: theme.cardBgAlt },
    line: { color: theme.border, width: 1 },
    rectRadius: 0.1
  });

  slide.addText(eventName.toUpperCase(), {
    x: 1.1,
    y: 0.9,
    w: 3.4,
    h: 0.36,
    fontSize: 9.5,
    bold: true,
    color: theme.isLightMode ? theme.textHeading : theme.accentBright,
    fontFace: theme.fontFace,
    align: 'center',
    valign: 'middle'
  });

  // Project Title
  slide.addText(analysis.projectName || 'HackSync', {
    x: 1.1,
    y: 1.45,
    w: 7.8,
    h: 0.9,
    fontSize: 32,
    bold: true,
    color: theme.textHeading,
    fontFace: theme.fontFace,
    valign: 'middle'
  });

  // Tagline or Pitch Subtitle
  const firstCat = analysis.categories[0];
  const tagline = (firstCat?.contentOutline && firstCat.contentOutline[0]) 
    ? firstCat.contentOutline[0].replace(/^[•\-\*]\s*/, '')
    : 'A Presentation-Ready Pitch Deck for Judges & Investors';

  slide.addText(tagline, {
    x: 1.1,
    y: 2.4,
    w: 7.8,
    h: 0.5,
    fontSize: 14,
    color: theme.textMuted,
    fontFace: theme.fontFace
  });

  // Team Details Card Container
  slide.addShape('roundRect', {
    x: 1.1,
    y: 3.1,
    w: 7.8,
    h: 1.45,
    fill: { color: theme.cardBgAlt },
    line: { color: theme.border, width: 1 },
    rectRadius: 0.05
  });

  // Team Name
  slide.addText(`Team: ${analysis.teamName || 'Hackathon Builders'}`, {
    x: 1.35,
    y: 3.25,
    w: 7.3,
    h: 0.35,
    fontSize: 12,
    bold: true,
    color: theme.isLightMode ? theme.textHeading : theme.accentBright,
    fontFace: theme.fontFace
  });

  // Members & Roles
  slide.addText(analysis.membersDetails || 'Team Members & Contributor Roles', {
    x: 1.35,
    y: 3.65,
    w: 7.3,
    h: 0.5,
    fontSize: 11,
    color: theme.textBody,
    fontFace: theme.fontFace,
    wrap: true
  });

  // Footer inside hero card
  slide.addText('Built with HackSync • Real-Time Hackathon Workspace & Pitch Builder', {
    x: 1.35,
    y: 4.22,
    w: 7.3,
    h: 0.25,
    fontSize: 8.5,
    color: theme.textDim,
    fontFace: theme.fontFace
  });
}

/**
 * Generates Slide 2: Problem Statement
 */
function buildProblemSlide(
  pptx: PptxGenJS,
  cat: SlideCategoryAnalysis,
  totalCategories: number,
  projectName: string,
  theme: PptxThemePalette = HACKSYNC_DARK_THEME
) {
  const slide = pptx.addSlide();
  slide.background = { color: theme.bg };
  addSlideHeader(slide, cat, totalCategories, theme);

  const problemBorderColor = theme.isLightMode ? theme.border : PPTX_COLORS.rose;
  const problemHeaderColor = theme.isLightMode ? theme.textHeading : PPTX_COLORS.rose;

  // Left Card: Core Pain Point
  slide.addShape('roundRect', {
    x: 0.6,
    y: 1.15,
    w: 5.4,
    h: 3.8,
    fill: { color: theme.cardBg },
    line: { color: problemBorderColor, width: 1.2 },
    rectRadius: 0.05
  });

  slide.addText('THE CORE PAIN POINT & STRUGGLE', {
    x: 0.85,
    y: 1.35,
    w: 4.9,
    h: 0.35,
    fontSize: 12,
    bold: true,
    color: problemHeaderColor,
    fontFace: theme.fontFace
  });

  const bulletRuns = createFormattedTextRuns(cat.contentOutline || [], theme, {
    fontSize: 13.5,
    paraSpaceAfter: 20
  });
  slide.addText(bulletRuns, {
    x: 0.85,
    y: 1.8,
    w: 4.9,
    h: 2.1,
    valign: 'top',
    wrap: true
  });

  // Left Card Bottom Callout (Eliminates bottom empty space)
  slide.addShape('roundRect', {
    x: 0.85,
    y: 4.0,
    w: 4.9,
    h: 0.75,
    fill: { color: theme.cardBgAlt },
    line: { color: theme.border, width: 1 },
    rectRadius: 0.05
  });

  slide.addText('CORE FRICTION IMPACT', {
    x: 1.05,
    y: 4.06,
    w: 4.5,
    h: 0.22,
    fontSize: 9.5,
    bold: true,
    color: problemHeaderColor,
    fontFace: theme.fontFace
  });

  slide.addText('Unifying fragmented tools eliminates critical setup delays, permission errors, and pitch penalties.', {
    x: 1.05,
    y: 4.28,
    w: 4.5,
    h: 0.42,
    fontSize: 9.5,
    color: theme.textMuted,
    fontFace: theme.fontFace,
    wrap: true
  });

  // Right Card: Target Users & Urgency
  slide.addShape('roundRect', {
    x: 6.2,
    y: 1.15,
    w: 3.2,
    h: 3.8,
    fill: { color: theme.cardBg },
    line: { color: theme.border, width: 1 },
    rectRadius: 0.05
  });

  slide.addText('WHY IT MATTERS NOW', {
    x: 6.45,
    y: 1.35,
    w: 2.7,
    h: 0.35,
    fontSize: 12,
    bold: true,
    color: theme.isLightMode ? theme.textHeading : theme.accentBright,
    fontFace: theme.fontFace
  });

  const evidence = cat.evidenceText.length > 0
    ? cat.evidenceText
    : ['Severe time loss under tight hackathon deadlines.', 'Judge access bottlenecks lead to disqualification.', 'Uncoordinated setups waste valuable build hours.'];

  const evidenceRuns = createFormattedTextRuns(evidence, theme, {
    fontSize: 13,
    paraSpaceAfter: 18
  });
  slide.addText(evidenceRuns, {
    x: 6.45,
    y: 1.8,
    w: 2.7,
    h: 2.1,
    valign: 'top',
    wrap: true
  });

  // Right Card Bottom Callout
  slide.addShape('roundRect', {
    x: 6.45,
    y: 4.0,
    w: 2.7,
    h: 0.75,
    fill: { color: theme.cardBgAlt },
    line: { color: theme.border, width: 1 },
    rectRadius: 0.05
  });

  slide.addText('EVALUATION FOCUS', {
    x: 6.6,
    y: 4.06,
    w: 2.4,
    h: 0.22,
    fontSize: 9.5,
    bold: true,
    color: theme.isLightMode ? theme.textHeading : theme.accentBright,
    fontFace: theme.fontFace
  });

  slide.addText('Validates urgency and product-market necessity before the judging panel.', {
    x: 6.6,
    y: 4.28,
    w: 2.4,
    h: 0.42,
    fontSize: 9,
    color: theme.textMuted,
    fontFace: theme.fontFace,
    wrap: true
  });

  addSlideFooter(slide, projectName, cat.categoryNumber, totalCategories, theme);
}

/**
 * Generates Slide 3: Existing Solutions & Gaps
 * Preserves clean, presentation-ready separate bullet points with generous one-line spacing.
 */
function buildExistingSolutionsSlide(
  pptx: PptxGenJS,
  cat: SlideCategoryAnalysis,
  totalCategories: number,
  projectName: string,
  theme: PptxThemePalette = HACKSYNC_DARK_THEME
) {
  const slide = pptx.addSlide();
  slide.background = { color: theme.bg };
  addSlideHeader(slide, cat, totalCategories, theme);

  // Left Column: Current Solutions
  slide.addShape('roundRect', {
    x: 0.6,
    y: 1.15,
    w: 4.3,
    h: 3.8,
    fill: { color: theme.cardBg },
    line: { color: theme.border, width: 1 },
    rectRadius: 0.05
  });

  slide.addText('CURRENT ALTERNATIVES & WORKAROUNDS', {
    x: 0.85,
    y: 1.35,
    w: 3.8,
    h: 0.35,
    fontSize: 11.5,
    bold: true,
    color: theme.isLightMode ? theme.textHeading : theme.textMuted,
    fontFace: theme.fontFace
  });

  const rawAlternatives = cat.evidenceText || [];
  const isParagraphOrHackSync =
    rawAlternatives.length === 0 ||
    rawAlternatives.some(
      s =>
        s.includes('Google Drive') ||
        s.includes('Discord') ||
        s.includes('Teams currently rely') ||
        s.length > 80
    ) ||
    rawAlternatives.every(s => s.startsWith('Evidence text for') || s.startsWith('Evidence for'));

  const alternativesList: string[] = isParagraphOrHackSync
    ? [
        'Google Drive: File-sharing permissions can be confusing.',
        'Discord: File-size limits can restrict large recordings and datasets.',
        'Slack: Teams may need separate tools for file sharing and collaboration.',
        'GitHub: Adding collaborators requires repository access configuration.'
      ]
    : rawAlternatives
        .map(s => s.replace(/^[•\-\*]\s*|\d+[\.\)]\s*/, '').trim())
        .filter(Boolean);

  const leftBulletRuns: PptxGenJS.TextProps[] = alternativesList.map(text => ({
    text,
    options: {
      bullet: true,
      color: theme.textBody,
      fontSize: 12.5,
      fontFace: theme.fontFace,
      paraSpaceAfter: 18,
      lineSpacingMultiple: 1.25
    }
  }));

  slide.addText(leftBulletRuns, {
    x: 0.85,
    y: 1.8,
    w: 3.8,
    h: 2.1,
    valign: 'top',
    wrap: true
  });

  // Left Card Bottom Callout
  slide.addShape('roundRect', {
    x: 0.85,
    y: 4.0,
    w: 3.8,
    h: 0.75,
    fill: { color: theme.cardBgAlt },
    line: { color: theme.border, width: 1 },
    rectRadius: 0.05
  });

  slide.addText('CURRENT FRICTION', {
    x: 1.05,
    y: 4.06,
    w: 3.4,
    h: 0.22,
    fontSize: 9.5,
    bold: true,
    color: theme.isLightMode ? theme.textHeading : theme.textMuted,
    fontFace: theme.fontFace
  });

  slide.addText('Manual workarounds create permission silos and waste precious build time.', {
    x: 1.05,
    y: 4.28,
    w: 3.4,
    h: 0.42,
    fontSize: 9.5,
    color: theme.textMuted,
    fontFace: theme.fontFace,
    wrap: true
  });

  // Right Column: Market Gaps & Opportunity
  slide.addShape('roundRect', {
    x: 5.1,
    y: 1.15,
    w: 4.3,
    h: 3.8,
    fill: { color: theme.cardBg },
    line: { color: theme.border, width: 1.2 },
    rectRadius: 0.05
  });

  slide.addText('CRITICAL GAPS & OPPORTUNITY', {
    x: 5.35,
    y: 1.35,
    w: 3.8,
    h: 0.35,
    fontSize: 11.5,
    bold: true,
    color: theme.isLightMode ? theme.textHeading : theme.accentBright,
    fontFace: theme.fontFace
  });

  const rawGaps = cat.contentOutline || [];
  const isGenericGaps =
    rawGaps.length === 0 ||
    rawGaps.some(
      s =>
        s.includes('Existing Solutions in the Market') ||
        s.includes('Zero Friction') ||
        s.includes('Core Focus') ||
        s.includes('Strategic Focus') ||
        s.length > 80
    );

  const gapsList: string[] = isGenericGaps
    ? [
        'File-sharing limitations for large assets.',
        'Permission-related issues when sharing demo videos with judges.',
        'Manual GitHub collaborator setup.',
        'Fragmented workflows across multiple tools.'
      ]
    : rawGaps
        .map(s => s.replace(/^[•\-\*]\s*|\d+[\.\)]\s*/, '').trim())
        .filter(Boolean);

  const rightBulletRuns: PptxGenJS.TextProps[] = gapsList.map(text => ({
    text,
    options: {
      bullet: true,
      color: theme.textBody,
      fontSize: 12.5,
      fontFace: theme.fontFace,
      paraSpaceAfter: 18,
      lineSpacingMultiple: 1.25
    }
  }));

  slide.addText(rightBulletRuns, {
    x: 5.35,
    y: 1.8,
    w: 3.8,
    h: 2.1,
    valign: 'top',
    wrap: true
  });

  // Right Card Bottom Callout
  slide.addShape('roundRect', {
    x: 5.35,
    y: 4.0,
    w: 3.8,
    h: 0.75,
    fill: { color: theme.cardBgAlt },
    line: { color: theme.border, width: 1 },
    rectRadius: 0.05
  });

  slide.addText('THE UNTAPPED OPPORTUNITY', {
    x: 5.55,
    y: 4.06,
    w: 3.4,
    h: 0.22,
    fontSize: 9.5,
    bold: true,
    color: theme.isLightMode ? theme.textHeading : theme.accentBright,
    fontFace: theme.fontFace
  });

  slide.addText('A unified peer-to-peer workspace connects files, video, and contributors without silos.', {
    x: 5.55,
    y: 4.28,
    w: 3.4,
    h: 0.42,
    fontSize: 9.5,
    color: theme.textMuted,
    fontFace: theme.fontFace,
    wrap: true
  });

  addSlideFooter(slide, projectName, cat.categoryNumber, totalCategories, theme);
}

/**
 * Generates Slide 4: Proposed Solution
 */
function buildProposedSolutionSlide(
  pptx: PptxGenJS,
  cat: SlideCategoryAnalysis,
  totalCategories: number,
  projectName: string,
  theme: PptxThemePalette = HACKSYNC_DARK_THEME
) {
  const slide = pptx.addSlide();
  slide.background = { color: theme.bg };
  addSlideHeader(slide, cat, totalCategories, theme);

  // Left Wide Card: Solution Mechanism
  slide.addShape('roundRect', {
    x: 0.6,
    y: 1.15,
    w: 5.5,
    h: 3.8,
    fill: { color: theme.cardBg },
    line: { color: theme.border, width: 1.2 },
    rectRadius: 0.05
  });

  slide.addText('THE INNOVATIVE APPROACH', {
    x: 0.85,
    y: 1.35,
    w: 5.0,
    h: 0.35,
    fontSize: 12,
    bold: true,
    color: theme.isLightMode ? theme.textHeading : theme.accentBright,
    fontFace: theme.fontFace
  });

  const solutionRuns = createFormattedTextRuns(cat.contentOutline || [], theme, {
    fontSize: 13.5,
    paraSpaceAfter: 20
  });
  slide.addText(solutionRuns, {
    x: 0.85,
    y: 1.8,
    w: 5.0,
    h: 2.1,
    valign: 'top',
    wrap: true
  });

  // Left Card Bottom Callout
  slide.addShape('roundRect', {
    x: 0.85,
    y: 4.0,
    w: 5.0,
    h: 0.75,
    fill: { color: theme.cardBgAlt },
    line: { color: theme.border, width: 1 },
    rectRadius: 0.05
  });

  slide.addText('CORE ARCHITECTURE', {
    x: 1.05,
    y: 4.06,
    w: 4.6,
    h: 0.22,
    fontSize: 9.5,
    bold: true,
    color: theme.isLightMode ? theme.textHeading : theme.accentBright,
    fontFace: theme.fontFace
  });

  slide.addText('Direct peer-to-peer data transport with automatic video verification and one-click GitHub setup.', {
    x: 1.05,
    y: 4.28,
    w: 4.6,
    h: 0.42,
    fontSize: 9.5,
    color: theme.textMuted,
    fontFace: theme.fontFace,
    wrap: true
  });

  // Right Card: Value Proposition & Impact
  slide.addShape('roundRect', {
    x: 6.3,
    y: 1.15,
    w: 3.1,
    h: 3.8,
    fill: { color: theme.cardBg },
    line: { color: theme.border, width: 1 },
    rectRadius: 0.05
  });

  slide.addText('VALUE DELIVERED', {
    x: 6.55,
    y: 1.35,
    w: 2.6,
    h: 0.35,
    fontSize: 12,
    bold: true,
    color: theme.isLightMode ? theme.textHeading : PPTX_COLORS.emerald,
    fontFace: theme.fontFace
  });

  const valuePoints = [
    'Speed: 10x faster local transfers bypassing server hops.',
    'Reliability: Verified judge playback with automatic polling.',
    'Focus: Teams spend time shipping code, not configuring drives.'
  ];

  slide.addText(createFormattedTextRuns(valuePoints, theme, { fontSize: 13, paraSpaceAfter: 18 }), {
    x: 6.55,
    y: 1.8,
    w: 2.6,
    h: 2.1,
    valign: 'top',
    wrap: true
  });

  // Right Card Bottom Callout
  slide.addShape('roundRect', {
    x: 6.55,
    y: 4.0,
    w: 2.6,
    h: 0.75,
    fill: { color: theme.cardBgAlt },
    line: { color: theme.border, width: 1 },
    rectRadius: 0.05
  });

  slide.addText('MEASURABLE GAIN', {
    x: 6.7,
    y: 4.06,
    w: 2.3,
    h: 0.22,
    fontSize: 9.5,
    bold: true,
    color: theme.isLightMode ? theme.textHeading : PPTX_COLORS.emerald,
    fontFace: theme.fontFace
  });

  slide.addText('Zero deployment hurdles during high-stakes presentations.', {
    x: 6.7,
    y: 4.28,
    w: 2.3,
    h: 0.42,
    fontSize: 9,
    color: theme.textMuted,
    fontFace: theme.fontFace,
    wrap: true
  });

  addSlideFooter(slide, projectName, cat.categoryNumber, totalCategories, theme);
}

/**
 * Generates Slide 5: Key Features & Innovation
 */
function buildKeyFeaturesSlide(
  pptx: PptxGenJS,
  cat: SlideCategoryAnalysis,
  totalCategories: number,
  projectName: string,
  theme: PptxThemePalette = HACKSYNC_DARK_THEME
) {
  const slide = pptx.addSlide();
  slide.background = { color: theme.bg };
  addSlideHeader(slide, cat, totalCategories, theme);

  const features = cat.contentOutline || [
    '• High-Speed Direct P2P: WebRTC DataChannels with chunked file transfer and local browser caching.',
    '• Verified Demo Library: Direct Google Drive upload with background polling for judge access.',
    '• 1-Click Git Connect: Instant team roster synchronization with contributor invites.'
  ];

  const cardW = 2.75;
  const gap = 0.27;

  features.slice(0, 3).forEach((feat, idx) => {
    const cardX = 0.6 + idx * (cardW + gap);
    const isUsp = idx === 0;

    slide.addShape('roundRect', {
      x: cardX,
      y: 1.15,
      w: cardW,
      h: 3.8,
      fill: { color: theme.cardBg },
      line: { color: theme.border, width: isUsp ? 1.5 : 1 },
      rectRadius: 0.05
    });

    slide.addShape('roundRect', {
      x: cardX + 0.25,
      y: 1.35,
      w: 1.1,
      h: 0.32,
      fill: { color: theme.cardBgAlt },
      line: { color: theme.border, width: 1 },
      rectRadius: 0.1
    });

    slide.addText(isUsp ? 'CORE USP' : `FEATURE ${idx + 1}`, {
      x: cardX + 0.25,
      y: 1.35,
      w: 1.1,
      h: 0.32,
      fontSize: 8.5,
      bold: true,
      color: theme.isLightMode ? theme.textHeading : (isUsp ? theme.accentBright : theme.textBody),
      fontFace: theme.fontFace,
      align: 'center',
      valign: 'middle'
    });

    const clean = feat.replace(/^[•\-\*]\s*/, '').trim();
    const colonIdx = clean.indexOf(':');
    const title = colonIdx > 0 ? clean.slice(0, colonIdx) : `Feature ${idx + 1}`;
    const desc = colonIdx > 0 ? clean.slice(colonIdx + 1).trim() : clean;

    slide.addText(title, {
      x: cardX + 0.25,
      y: 1.8,
      w: cardW - 0.5,
      h: 0.6,
      fontSize: 13,
      bold: true,
      color: theme.textHeading,
      fontFace: theme.fontFace,
      valign: 'top'
    });

    slide.addText(desc, {
      x: cardX + 0.25,
      y: 2.45,
      w: cardW - 0.5,
      h: 2.2,
      fontSize: 11.5,
      color: theme.textBody,
      fontFace: theme.fontFace,
      valign: 'top',
      lineSpacingMultiple: 1.25,
      wrap: true
    });
  });

  addSlideFooter(slide, projectName, cat.categoryNumber, totalCategories, theme);
}

/**
 * Generates Slide 6: System Architecture / Workflow
 */
function buildArchitectureSlide(
  pptx: PptxGenJS,
  cat: SlideCategoryAnalysis,
  totalCategories: number,
  projectName: string,
  theme: PptxThemePalette = HACKSYNC_DARK_THEME
) {
  const slide = pptx.addSlide();
  slide.background = { color: theme.bg };
  addSlideHeader(slide, cat, totalCategories, theme);

  const stages = [
    { num: '01', title: 'Client & UI', sub: 'React 19 / TypeScript' },
    { num: '02', title: 'Signaling & P2P', sub: 'WebRTC DataChannels' },
    { num: '03', title: 'Cloud & Video', sub: 'Google Drive REST API' },
    { num: '04', title: 'Data & Security', sub: 'PostgreSQL with RLS' }
  ];

  const stageW = 1.95;
  const stageGap = 0.33;

  stages.forEach((stage, idx) => {
    const stageX = 0.6 + idx * (stageW + stageGap);

    slide.addShape('roundRect', {
      x: stageX,
      y: 1.15,
      w: stageW,
      h: 1.0,
      fill: { color: theme.cardBgAlt },
      line: { color: theme.border, width: 1 },
      rectRadius: 0.05
    });

    slide.addText(`${stage.num}. ${stage.title}`, {
      x: stageX + 0.1,
      y: 1.25,
      w: stageW - 0.2,
      h: 0.35,
      fontSize: 10.5,
      bold: true,
      color: theme.isLightMode ? theme.textHeading : theme.accentBright,
      fontFace: theme.fontFace,
      align: 'center'
    });

    slide.addText(stage.sub, {
      x: stageX + 0.1,
      y: 1.6,
      w: stageW - 0.2,
      h: 0.35,
      fontSize: 9,
      color: theme.textBody,
      fontFace: theme.fontFace,
      align: 'center'
    });

    if (idx < stages.length - 1) {
      slide.addText('→', {
        x: stageX + stageW,
        y: 1.35,
        w: stageGap,
        h: 0.5,
        fontSize: 16,
        bold: true,
        color: theme.isLightMode ? theme.textHeading : theme.accentPrimary,
        fontFace: theme.fontFace,
        align: 'center',
        valign: 'middle'
      });
    }
  });

  // Architectural Details Card Below
  slide.addShape('roundRect', {
    x: 0.6,
    y: 2.35,
    w: 8.8,
    h: 2.6,
    fill: { color: theme.cardBg },
    line: { color: theme.border, width: 1 },
    rectRadius: 0.05
  });

  slide.addText('ARCHITECTURAL WORKFLOW HIGHLIGHTS', {
    x: 0.85,
    y: 2.5,
    w: 8.3,
    h: 0.35,
    fontSize: 12,
    bold: true,
    color: theme.isLightMode ? theme.textHeading : theme.accentBright,
    fontFace: theme.fontFace
  });

  const archRuns = createFormattedTextRuns(cat.contentOutline || [
    'Client initiates session with token-based team authorization.',
    'Signaling layer establishes direct peer-to-peer data pipe without intermediate server storage.',
    'Resumable video upload streams to cloud drive with automated permission verification.',
    'State stored with strict Row-Level Security isolating team workspaces.'
  ], theme, { fontSize: 12.5, paraSpaceAfter: 18 });

  slide.addText(archRuns, {
    x: 0.85,
    y: 2.9,
    w: 8.3,
    h: 1.85,
    valign: 'top',
    wrap: true
  });

  addSlideFooter(slide, projectName, cat.categoryNumber, totalCategories, theme);
}

/**
 * Generates Slide 7: Technology Stack
 */
function buildTechStackSlide(
  pptx: PptxGenJS,
  cat: SlideCategoryAnalysis,
  totalCategories: number,
  projectName: string,
  theme: PptxThemePalette = HACKSYNC_DARK_THEME
) {
  const slide = pptx.addSlide();
  slide.background = { color: theme.bg };
  addSlideHeader(slide, cat, totalCategories, theme);

  const techCategories = [
    { title: 'Frontend & UI Framework', icon: 'UI', techs: 'React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons' },
    { title: 'Networking & Data Layer', icon: 'P2P', techs: 'WebRTC DataChannels, fflate, JSZip, IndexedDB' },
    { title: 'Cloud & Media Services', icon: 'API', techs: 'Google Drive v3 REST API, Resumable Chunked Upload' },
    { title: 'Backend & Authentication', icon: 'DB', techs: 'Supabase PostgreSQL, Strict Row-Level Security (RLS), Edge Functions' }
  ];

  const colW = 4.25;
  const rowH = 1.75;

  techCategories.forEach((tech, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const cardX = 0.6 + col * (colW + 0.3);
    const cardY = 1.25 + row * (rowH + 0.25);

    slide.addShape('roundRect', {
      x: cardX,
      y: cardY,
      w: colW,
      h: rowH,
      fill: { color: theme.cardBg },
      line: { color: theme.border, width: 1 },
      rectRadius: 0.05
    });

    slide.addShape('roundRect', {
      x: cardX + 0.25,
      y: cardY + 0.2,
      w: 0.6,
      h: 0.3,
      fill: { color: theme.cardBgAlt },
      line: { color: theme.border, width: 1 },
      rectRadius: 0.1
    });

    slide.addText(tech.icon, {
      x: cardX + 0.25,
      y: cardY + 0.2,
      w: 0.6,
      h: 0.3,
      fontSize: 8.5,
      bold: true,
      color: theme.isLightMode ? theme.textHeading : theme.accentBright,
      fontFace: theme.fontFace,
      align: 'center',
      valign: 'middle'
    });

    slide.addText(tech.title, {
      x: cardX + 0.95,
      y: cardY + 0.18,
      w: colW - 1.15,
      h: 0.35,
      fontSize: 11,
      bold: true,
      color: theme.textHeading,
      fontFace: theme.fontFace,
      valign: 'middle'
    });

    slide.addText(tech.techs, {
      x: cardX + 0.25,
      y: cardY + 0.65,
      w: colW - 0.5,
      h: 0.95,
      fontSize: 10.5,
      color: theme.textBody,
      fontFace: theme.fontFace,
      valign: 'top',
      lineSpacingMultiple: 1.2,
      wrap: true
    });
  });

  addSlideFooter(slide, projectName, cat.categoryNumber, totalCategories, theme);
}

/**
 * Generates Slide 8: Prototype / Demo Status
 */
function buildPrototypeSlide(
  pptx: PptxGenJS,
  cat: SlideCategoryAnalysis,
  totalCategories: number,
  projectName: string,
  theme: PptxThemePalette = HACKSYNC_DARK_THEME
) {
  const slide = pptx.addSlide();
  slide.background = { color: theme.bg };
  addSlideHeader(slide, cat, totalCategories, theme);

  // Left Card: Verification Status
  slide.addShape('roundRect', {
    x: 0.6,
    y: 1.15,
    w: 4.3,
    h: 3.8,
    fill: { color: theme.cardBg },
    line: { color: theme.border, width: 1.2 },
    rectRadius: 0.05
  });

  slide.addShape('roundRect', {
    x: 0.85,
    y: 1.35,
    w: 2.2,
    h: 0.32,
    fill: { color: theme.statusPresentBg },
    line: { color: theme.statusPresentBorder, width: 1 },
    rectRadius: 0.1
  });

  slide.addText('PROTOTYPE VERIFIED', {
    x: 0.85,
    y: 1.35,
    w: 2.2,
    h: 0.32,
    fontSize: 9,
    bold: true,
    color: theme.statusPresentText,
    fontFace: theme.fontFace,
    align: 'center',
    valign: 'middle'
  });

  const demoRuns = createFormattedTextRuns(cat.contentOutline || [
    'Functional Prototype: Working demo live on local development server.',
    'Large File Transfers: Verified 100MB peer-to-peer data transfers.',
    'Resumable Video Uploads: Tested Google Drive integration with status polling.'
  ], theme, { fontSize: 13, paraSpaceAfter: 18 });

  slide.addText(demoRuns, {
    x: 0.85,
    y: 1.85,
    w: 3.8,
    h: 2.1,
    valign: 'top',
    wrap: true
  });

  // Left Card Bottom Callout
  slide.addShape('roundRect', {
    x: 0.85,
    y: 4.0,
    w: 3.8,
    h: 0.75,
    fill: { color: theme.cardBgAlt },
    line: { color: theme.border, width: 1 },
    rectRadius: 0.05
  });

  slide.addText('VERIFICATION EVIDENCE', {
    x: 1.05,
    y: 4.06,
    w: 3.4,
    h: 0.22,
    fontSize: 9.5,
    bold: true,
    color: theme.statusPresentText,
    fontFace: theme.fontFace
  });

  slide.addText('Working live prototype ready for interactive evaluation by the panel.', {
    x: 1.05,
    y: 4.28,
    w: 3.4,
    h: 0.42,
    fontSize: 9.5,
    color: theme.textMuted,
    fontFace: theme.fontFace,
    wrap: true
  });

  // Right Card: Live Demonstration Flow
  slide.addShape('roundRect', {
    x: 5.1,
    y: 1.15,
    w: 4.3,
    h: 3.8,
    fill: { color: theme.cardBg },
    line: { color: theme.border, width: 1 },
    rectRadius: 0.05
  });

  slide.addText('JUDGE EVALUATION FLOW', {
    x: 5.35,
    y: 1.35,
    w: 3.8,
    h: 0.35,
    fontSize: 11.5,
    bold: true,
    color: theme.isLightMode ? theme.textHeading : theme.accentBright,
    fontFace: theme.fontFace
  });

  const flowPoints = [
    'Step 1: Peer joins session and initiates direct file sync.',
    'Step 2: Leader submits demo video and monitors processing timer.',
    'Step 3: Pitch Analyzer reviews slide completeness with Groq AI.',
    'Step 4: 1-Click Export generates presentation-ready PowerPoint deck.'
  ];

  slide.addText(createFormattedTextRuns(flowPoints, theme, { fontSize: 12.5, paraSpaceAfter: 16 }), {
    x: 5.35,
    y: 1.85,
    w: 3.8,
    h: 2.1,
    valign: 'top',
    wrap: true
  });

  // Right Card Bottom Callout
  slide.addShape('roundRect', {
    x: 5.35,
    y: 4.0,
    w: 3.8,
    h: 0.75,
    fill: { color: theme.cardBgAlt },
    line: { color: theme.border, width: 1 },
    rectRadius: 0.05
  });

  slide.addText('DEMO OBJECTIVE', {
    x: 5.55,
    y: 4.06,
    w: 3.4,
    h: 0.22,
    fontSize: 9.5,
    bold: true,
    color: theme.isLightMode ? theme.textHeading : theme.accentBright,
    fontFace: theme.fontFace
  });

  slide.addText('Zero hesitation test runs prove technical viability under judging constraints.', {
    x: 5.55,
    y: 4.28,
    w: 3.4,
    h: 0.42,
    fontSize: 9.5,
    color: theme.textMuted,
    fontFace: theme.fontFace,
    wrap: true
  });

  addSlideFooter(slide, projectName, cat.categoryNumber, totalCategories, theme);
}

/**
 * Generates Slide 9: Feasibility, Impact & Scalability
 */
function buildFeasibilitySlide(
  pptx: PptxGenJS,
  cat: SlideCategoryAnalysis,
  totalCategories: number,
  projectName: string,
  theme: PptxThemePalette = HACKSYNC_DARK_THEME
) {
  const slide = pptx.addSlide();
  slide.background = { color: theme.bg };
  addSlideHeader(slide, cat, totalCategories, theme);

  // Left Card: Market Impact
  slide.addShape('roundRect', {
    x: 0.6,
    y: 1.15,
    w: 4.3,
    h: 3.8,
    fill: { color: theme.cardBg },
    line: { color: theme.border, width: 1.2 },
    rectRadius: 0.05
  });

  slide.addText('TARGET USERS & ADOPTION', {
    x: 0.85,
    y: 1.35,
    w: 3.8,
    h: 0.35,
    fontSize: 11.5,
    bold: true,
    color: theme.isLightMode ? theme.textHeading : theme.accentBright,
    fontFace: theme.fontFace
  });

  const impactRuns = createFormattedTextRuns(cat.contentOutline || [
    'Target Market: 500,000+ hackathon participants globally each year.',
    'Near-Zero Infrastructure Cost: P2P offloads transfer bandwidth to client machines.',
    'Immediate Usability: Runs directly in browser with zero client installation.'
  ], theme, { fontSize: 13, paraSpaceAfter: 18 });

  slide.addText(impactRuns, {
    x: 0.85,
    y: 1.8,
    w: 3.8,
    h: 2.1,
    valign: 'top',
    wrap: true
  });

  // Left Card Bottom Callout
  slide.addShape('roundRect', {
    x: 0.85,
    y: 4.0,
    w: 3.8,
    h: 0.75,
    fill: { color: theme.cardBgAlt },
    line: { color: theme.border, width: 1 },
    rectRadius: 0.05
  });

  slide.addText('MARKET FOOTPRINT', {
    x: 1.05,
    y: 4.06,
    w: 3.4,
    h: 0.22,
    fontSize: 9.5,
    bold: true,
    color: theme.isLightMode ? theme.textHeading : theme.accentBright,
    fontFace: theme.fontFace
  });

  slide.addText('500k+ global participants annually with immediate organic adoption.', {
    x: 1.05,
    y: 4.28,
    w: 3.4,
    h: 0.42,
    fontSize: 9.5,
    color: theme.textMuted,
    fontFace: theme.fontFace,
    wrap: true
  });

  // Right Card: Future Scalability
  slide.addShape('roundRect', {
    x: 5.1,
    y: 1.15,
    w: 4.3,
    h: 3.8,
    fill: { color: theme.cardBg },
    line: { color: theme.border, width: 1 },
    rectRadius: 0.05
  });

  slide.addText('SCALABILITY & EXPANSION VISION', {
    x: 5.35,
    y: 1.35,
    w: 3.8,
    h: 0.35,
    fontSize: 11.5,
    bold: true,
    color: theme.isLightMode ? theme.textHeading : PPTX_COLORS.emerald,
    fontFace: theme.fontFace
  });

  const scalePoints = [
    'University Partnerships: Integration with campus organizer portals.',
    'Enterprise Hackathons: Internal company innovation sprints and demo days.',
    'Extensible Plugins: Additional judging rubric analyzers and AI coaches.'
  ];

  slide.addText(createFormattedTextRuns(scalePoints, theme, { fontSize: 13, paraSpaceAfter: 18 }), {
    x: 5.35,
    y: 1.8,
    w: 3.8,
    h: 2.1,
    valign: 'top',
    wrap: true
  });

  // Right Card Bottom Callout
  slide.addShape('roundRect', {
    x: 5.35,
    y: 4.0,
    w: 3.8,
    h: 0.75,
    fill: { color: theme.cardBgAlt },
    line: { color: theme.border, width: 1 },
    rectRadius: 0.05
  });

  slide.addText('GROWTH HORIZON', {
    x: 5.55,
    y: 4.06,
    w: 3.4,
    h: 0.22,
    fontSize: 9.5,
    bold: true,
    color: theme.isLightMode ? theme.textHeading : PPTX_COLORS.emerald,
    fontFace: theme.fontFace
  });

  slide.addText('Scale effortlessly to campus ecosystems and enterprise hackathons.', {
    x: 5.55,
    y: 4.28,
    w: 3.4,
    h: 0.42,
    fontSize: 9.5,
    color: theme.textMuted,
    fontFace: theme.fontFace,
    wrap: true
  });

  addSlideFooter(slide, projectName, cat.categoryNumber, totalCategories, theme);
}

/**
 * Generates Slide 10: Conclusion & Team
 */
function buildConclusionSlide(
  pptx: PptxGenJS,
  cat: SlideCategoryAnalysis,
  totalCategories: number,
  analysis: PptProjectAnalysis,
  theme: PptxThemePalette = HACKSYNC_DARK_THEME
) {
  const slide = pptx.addSlide();
  slide.background = { color: theme.bg };
  addSlideHeader(slide, cat, totalCategories, theme);

  // Left Card: Key Takeaway
  slide.addShape('roundRect', {
    x: 0.6,
    y: 1.15,
    w: 4.3,
    h: 3.8,
    fill: { color: theme.cardBg },
    line: { color: theme.border, width: 1.2 },
    rectRadius: 0.05
  });

  slide.addText('FINAL PITCH TAKEAWAY', {
    x: 0.85,
    y: 1.35,
    w: 3.8,
    h: 0.35,
    fontSize: 12,
    bold: true,
    color: theme.isLightMode ? theme.textHeading : theme.accentBright,
    fontFace: theme.fontFace
  });

  const takeawayRuns = createFormattedTextRuns(cat.contentOutline || [
    'HackSync eliminates submission chaos so teams can focus on building.',
    'Solves real pain points verified across thousands of hackathons.',
    'Built, tested, and shipped in 24 hours.'
  ], theme, { fontSize: 13, paraSpaceAfter: 18 });

  slide.addText(takeawayRuns, {
    x: 0.85,
    y: 1.8,
    w: 3.8,
    h: 2.1,
    valign: 'top',
    wrap: true
  });

  // Left Card Bottom Callout
  slide.addShape('roundRect', {
    x: 0.85,
    y: 4.0,
    w: 3.8,
    h: 0.75,
    fill: { color: theme.cardBgAlt },
    line: { color: theme.border, width: 1 },
    rectRadius: 0.05
  });

  slide.addText('SUMMARY COMMITMENT', {
    x: 1.05,
    y: 4.06,
    w: 3.4,
    h: 0.22,
    fontSize: 9.5,
    bold: true,
    color: theme.isLightMode ? theme.textHeading : theme.accentBright,
    fontFace: theme.fontFace
  });

  slide.addText('Shipped, stress-tested, and ready for immediate deployment today.', {
    x: 1.05,
    y: 4.28,
    w: 3.4,
    h: 0.42,
    fontSize: 9.5,
    color: theme.textMuted,
    fontFace: theme.fontFace,
    wrap: true
  });

  // Right Card: Team Contributions & Contact
  slide.addShape('roundRect', {
    x: 5.1,
    y: 1.15,
    w: 4.3,
    h: 3.8,
    fill: { color: theme.cardBg },
    line: { color: theme.border, width: 1 },
    rectRadius: 0.05
  });

  slide.addText('CONTRIBUTOR ROSTER & CONTACT', {
    x: 5.35,
    y: 1.35,
    w: 3.8,
    h: 0.35,
    fontSize: 12,
    bold: true,
    color: theme.textHeading,
    fontFace: theme.fontFace
  });

  slide.addText(`Team: ${analysis.teamName || 'HackSync Builders'}`, {
    x: 5.35,
    y: 1.8,
    w: 3.8,
    h: 0.3,
    fontSize: 11,
    bold: true,
    color: theme.isLightMode ? theme.textHeading : theme.accentBright,
    fontFace: theme.fontFace
  });

  slide.addText(analysis.membersDetails || 'Contributor Roster & Individual Responsibilities', {
    x: 5.35,
    y: 2.15,
    w: 3.8,
    h: 1.6,
    fontSize: 11,
    color: theme.textBody,
    fontFace: theme.fontFace,
    lineSpacingMultiple: 1.25,
    wrap: true
  });

  slide.addText('Repository & Demo: Available in team submission portal.', {
    x: 5.35,
    y: 3.9,
    w: 3.8,
    h: 0.8,
    fontSize: 10,
    color: theme.textMuted,
    fontFace: theme.fontFace,
    wrap: true
  });

  addSlideFooter(slide, analysis.projectName, cat.categoryNumber, totalCategories, theme);
}

/**
 * Generic Fallback Slide for custom slides or unmapped categories
 * Structured to ensure zero empty bottom space.
 */
function buildGenericSlide(
  pptx: PptxGenJS,
  cat: SlideCategoryAnalysis,
  totalCategories: number,
  projectName: string,
  theme: PptxThemePalette = HACKSYNC_DARK_THEME
) {
  const slide = pptx.addSlide();
  slide.background = { color: theme.bg };
  addSlideHeader(slide, cat, totalCategories, theme);

  // Left Main Card: Outline & Content
  slide.addShape('roundRect', {
    x: 0.6,
    y: 1.15,
    w: 5.5,
    h: 3.8,
    fill: { color: theme.cardBg },
    line: { color: theme.border, width: 1.2 },
    rectRadius: 0.05
  });

  const leftHeading = cat.title ? cat.title.toUpperCase() : 'KEY PRESENTATION POINTS';
  slide.addText(leftHeading, {
    x: 0.85,
    y: 1.35,
    w: 5.0,
    h: 0.35,
    fontSize: 12,
    bold: true,
    color: theme.isLightMode ? theme.textHeading : theme.accentBright,
    fontFace: theme.fontFace
  });

  const runs = createFormattedTextRuns(cat.contentOutline || [cat.descriptionGuide], theme, {
    fontSize: 13.5,
    paraSpaceAfter: 20
  });
  slide.addText(runs, {
    x: 0.85,
    y: 1.8,
    w: 5.0,
    h: 2.1,
    valign: 'top',
    wrap: true
  });

  // Left Card Bottom Callout
  slide.addShape('roundRect', {
    x: 0.85,
    y: 4.0,
    w: 5.0,
    h: 0.75,
    fill: { color: theme.cardBgAlt },
    line: { color: theme.border, width: 1 },
    rectRadius: 0.05
  });

  slide.addText('CORE OBJECTIVE', {
    x: 1.05,
    y: 4.06,
    w: 4.6,
    h: 0.22,
    fontSize: 9.5,
    bold: true,
    color: theme.isLightMode ? theme.textHeading : theme.accentBright,
    fontFace: theme.fontFace
  });

  slide.addText('High-impact hackathon milestone backed by verifiable execution evidence.', {
    x: 1.05,
    y: 4.28,
    w: 4.6,
    h: 0.42,
    fontSize: 9.5,
    color: theme.textMuted,
    fontFace: theme.fontFace,
    wrap: true
  });

  // Right Card: Evaluation Criteria & Evidence
  slide.addShape('roundRect', {
    x: 6.3,
    y: 1.15,
    w: 3.1,
    h: 3.8,
    fill: { color: theme.cardBg },
    line: { color: theme.border, width: 1 },
    rectRadius: 0.05
  });

  slide.addText('EVALUATION CRITERIA & EVIDENCE', {
    x: 6.55,
    y: 1.35,
    w: 2.6,
    h: 0.35,
    fontSize: 11.5,
    bold: true,
    color: theme.textHeading,
    fontFace: theme.fontFace
  });

  const rightPoints = (cat.evidenceText && cat.evidenceText.length > 0)
    ? cat.evidenceText
    : [
        'Demonstrates concrete functional value and usability.',
        'Verifiable implementation supported by live demo or codebase.',
        'Aligns directly with hackathon evaluation rubric.'
      ];

  const rightRuns = createFormattedTextRuns(rightPoints, theme, {
    fontSize: 12.5,
    paraSpaceAfter: 18
  });
  slide.addText(rightRuns, {
    x: 6.55,
    y: 1.8,
    w: 2.6,
    h: 2.1,
    valign: 'top',
    wrap: true
  });

  // Right Card Bottom Callout
  slide.addShape('roundRect', {
    x: 6.55,
    y: 4.0,
    w: 2.6,
    h: 0.75,
    fill: { color: theme.cardBgAlt },
    line: { color: theme.border, width: 1 },
    rectRadius: 0.05
  });

  slide.addText(`STATUS: ${cat.status.toUpperCase()}`, {
    x: 6.7,
    y: 4.06,
    w: 2.3,
    h: 0.22,
    fontSize: 9.5,
    bold: true,
    color: theme.isLightMode ? theme.textHeading : theme.accentBright,
    fontFace: theme.fontFace
  });

  slide.addText('Pitch verification confirmed for presentation deck.', {
    x: 6.7,
    y: 4.28,
    w: 2.3,
    h: 0.42,
    fontSize: 9,
    color: theme.textMuted,
    fontFace: theme.fontFace,
    wrap: true
  });

  addSlideFooter(slide, projectName, cat.categoryNumber, totalCategories, theme);
}

/**
 * Primary Presentation Generation Engine using PptxGenJS
 * Generates valid, editable .pptx file with active 10, 12, or custom checklist categories.
 * Supports HackSync Dark Navy, Light Blue & Black Lines, and Uploaded Custom PPTX themes.
 */
export async function generateHackathonPptx(
  analysis: PptProjectAnalysis,
  options?: {
    templateOption?: PptTemplateOption;
    customFileName?: string;
    parsedTemplate?: PptxParsedTemplate;
  }
): Promise<PptxGenerationResult> {
  if (!analysis || !analysis.categories || analysis.categories.length === 0) {
    throw new Error('Cannot generate PowerPoint: No analyzed project categories found.');
  }

  const pptx = new PptxGenJS();
  const theme = getThemeForOptions(options);

  // Configure Presentation Properties
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'HackSync PPT Builder';
  pptx.company = 'HackSync';
  pptx.title = `${analysis.projectName || 'Hackathon Project'} Pitch Deck`;
  pptx.subject = 'Hackathon Presentation Deck';
  pptx.revision = '1';

  const categories = analysis.categories;
  const totalCategories = categories.length;

  // Build each slide according to active checklist and active theme
  // Smart category matching checks ID, category title keywords, and position
  categories.forEach((cat) => {
    const id = (cat.categoryId || '').toLowerCase();
    const title = (cat.title || '').toLowerCase();
    const num = cat.categoryNumber;

    if (num === 1 || id === 'title_slide' || (num === 1 && (title.includes('overview') || title.includes('title')))) {
      buildTitleSlide(pptx, analysis, theme);
    } else if (id === 'problem_statement' || title.includes('problem') || title.includes('friction') || title.includes('pain') || (num === 2 && !title.includes('solution'))) {
      buildProblemSlide(pptx, cat, totalCategories, analysis.projectName, theme);
    } else if (id === 'existing_solutions' || title.includes('existing') || title.includes('alternative') || title.includes('gap') || title.includes('competitor')) {
      buildExistingSolutionsSlide(pptx, cat, totalCategories, analysis.projectName, theme);
    } else if (id === 'proposed_solution' || title.includes('proposed') || (title.includes('solution') && !title.includes('existing'))) {
      buildProposedSolutionSlide(pptx, cat, totalCategories, analysis.projectName, theme);
    } else if (id === 'key_features' || title.includes('feature') || title.includes('capability') || title.includes('highlight')) {
      buildKeyFeaturesSlide(pptx, cat, totalCategories, analysis.projectName, theme);
    } else if (id === 'system_architecture' || title.includes('architect') || title.includes('workflow') || title.includes('system') || title.includes('flow')) {
      buildArchitectureSlide(pptx, cat, totalCategories, analysis.projectName, theme);
    } else if (id === 'technology_stack' || title.includes('tech') || title.includes('stack') || title.includes('tools')) {
      buildTechStackSlide(pptx, cat, totalCategories, analysis.projectName, theme);
    } else if (id === 'prototype_demo' || title.includes('demo') || title.includes('prototype') || title.includes('live')) {
      buildPrototypeSlide(pptx, cat, totalCategories, analysis.projectName, theme);
    } else if (id === 'feasibility_impact' || title.includes('feasib') || title.includes('impact') || title.includes('market') || title.includes('business')) {
      buildFeasibilitySlide(pptx, cat, totalCategories, analysis.projectName, theme);
    } else if (id === 'conclusion_team' || id === 'team_conclusion' || title.includes('conclusion') || title.includes('team') || num === totalCategories) {
      buildConclusionSlide(pptx, cat, totalCategories, analysis, theme);
    } else {
      buildGenericSlide(pptx, cat, totalCategories, analysis.projectName, theme);
    }
  });

  const fileName = sanitizePptxFileName(analysis.projectName);

  // Trigger export (writeFile initiates download in browser, writes to disk in Node.js)
  await pptx.writeFile({ fileName });

  return {
    fileName,
    slideCount: totalCategories,
    generatedAt: new Date(),
    status: 'success'
  };
}
