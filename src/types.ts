export interface FileData {
  id: string;
  name: string;
  size: number;
  type: "archive" | "doc" | "media" | "code" | "sheet" | "unknown";
  uploader: string;
  uploaderId?: string;
  uploadedAt: Date;
}

export interface MemberData {
  id: string;
  name: string;
  initials: string;
  colorClass: string;
  role?: 'owner' | 'member';
}

export type VideoSharingAccess = 'restricted' | 'anyone_with_link';

export interface DemoVideoData {
  id: string;
  teamId: string;
  uploaderId: string;
  uploaderName: string;
  title: string;
  description?: string;
  googleFileId: string;
  webViewLink: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: Date;
  sharingAccess: VideoSharingAccess;
}

export interface GoogleDriveStatus {
  isConnected: boolean;
  googleEmail: string | null;
  isConfigured: boolean;
  isLeader: boolean;
  lastUpdated?: string | null;
}

export type VideoProcessingPhase = 
  | 'uploading' 
  | 'processing' 
  | 'ready_to_test' 
  | 'playback_verified' 
  | 'error';

export interface VideoProcessingState {
  phase: VideoProcessingPhase;
  isProcessing: boolean;
  isChecking: boolean;
  uploadFinishedAt?: number;
  elapsedSeconds: number;
  message?: string;
  thumbnailLink?: string | null;
  videoMediaMetadata?: any | null;
  verifiedAt?: number | null;
  lastCheckedAt?: number | null;
  error?: string | null;
}

// Git Connect Feature Types
export interface GitRepositoryData {
  teamId: string;
  repoUrl: string;
  owner: string;
  name: string;
  defaultBranch: string;
  visibility: 'public' | 'private';
  connectedBy: string;
  connectedAt: Date;
  description?: string;
  openIssuesCount?: number;
  starsCount?: number;
}

export type ContributorInvitationStatus = 
  | 'not_connected' 
  | 'pending_invitation' 
  | 'invitation_sent' 
  | 'already_collaborator' 
  | 'permission_denied'
  | 'invalid_username'
  | 'failed';

export interface GitMemberProfile {
  userId: string;
  teamId: string;
  githubUsername: string;
  githubProfileUrl: string;
  invitationStatus: ContributorInvitationStatus;
  invitationStatusDetail?: string;
  invitationSentAt?: Date | null;
  updatedAt: Date;
}

export interface ContributorInviteResult {
  userId: string;
  memberName: string;
  githubUsername: string;
  status: 'already_collaborator' | 'invitation_sent' | 'invitation_pending' | 'permission_denied' | 'invalid_username' | 'failed';
  message: string;
  invitationUrl?: string;
}

export interface GitConnectStatus {
  isConnected: boolean;
  repo: GitRepositoryData | null;
  isLeaderAuthorized: boolean;
  authorizedAccount?: string | null;
  isConfigured: boolean;
}

// ==========================================
// PPT Builder Feature Types (10-Slide Pitch)
// ==========================================

export type SlideCategoryId = 
  | 'title_slide'
  | 'problem_statement'
  | 'existing_solutions'
  | 'proposed_solution'
  | 'key_features'
  | 'system_architecture'
  | 'technology_stack'
  | 'prototype_demo'
  | 'feasibility_impact'
  | 'conclusion_team'
  | (string & {});

export type SlideCoverageStatus = 
  | 'missing' 
  | 'partially_covered' 
  | 'present' 
  | 'needs_verification';

export interface SlideChecklistItem {
  id: string;
  number: number;
  title: string;
  descriptionGuide: string;
  defaultQuestion?: string;
}

export interface SlideCategoryAnalysis {
  categoryId: SlideCategoryId;
  categoryNumber: number;
  title: string;
  descriptionGuide: string;
  status: SlideCoverageStatus;
  evidenceText: string[];
  missingDetails: string[];
  notes: string;
  contentOutline?: string[];
  targetedQuestion?: string;
  // Enhanced Groq AI structured analysis properties
  evidenceFromUserInput?: string[];
  coveredPoints?: string[];
  missingPoints?: string[];
  followUpQuestions?: string[];
  proposedOutline?: string[];
  verificationNotes?: string;
}

export interface ProjectAnalysisInput {
  description: string;
  projectName?: string;
  hackathonName?: string;
  teamName?: string;
  membersDetails?: string;
  customSlides?: SlideChecklistItem[];
  checklistText?: string;
}


export interface PptProjectAnalysis {
  projectName: string;
  hackathonName?: string;
  teamName?: string;
  membersDetails?: string;
  rawDescription: string;
  categories: SlideCategoryAnalysis[];
  totalCovered: number;
  totalPresent: number;
  totalPartiallyCovered: number;
  totalMissing: number;
  totalNeedsVerification: number;
  completionPercentage: number;
  isReadyForTemplateSelection: boolean;
  unresolvedQuestions: string[];
  analyzedAt: Date | string;
  // Extended summary and readiness fields
  totalCategories?: number;
  presentCount?: number;
  partiallyCoveredCount?: number;
  missingCount?: number;
  needsVerificationCount?: number;
  overallSummary?: string;
  readinessStatus?: 'needs_work' | 'almost_ready' | 'ready_for_pitch';
  modelUsed?: string;
  isAiGenerated?: boolean;
}

export type PptTemplateOption = 'default_hacksync' | 'light_blue' | 'custom_upload';

export interface PptxParsedTemplate {
  isTemplateValid: boolean;
  themeName?: string;
  colors?: {
    background: string;     // Hex without #
    cardBackground: string; // Hex without #
    border: string;         // Hex without #
    textPrimary: string;    // Hex without #
    textSecondary: string;  // Hex without #
    accentPrimary: string;  // Hex without #
    accentSecondary: string;// Hex without #
  };
  fonts?: {
    heading: string;
    body: string;
  };
  slideCount?: number;
  layoutNames?: string[];
  mediaFilesCount?: number;
  fileName?: string;
  fileSize?: number;
  isLightMode?: boolean;
}

export interface SelectedPptTemplate {
  option: PptTemplateOption;
  customFileName?: string;
  customFileSize?: number;
  parsedTemplate?: PptxParsedTemplate;
  selectedAt: Date;
  status: 'selected_generation_pending' | 'generating' | 'generated' | 'failed';
}

export interface PptxGenerationResult {
  fileName: string;
  slideCount: number;
  generatedAt: Date;
  status: 'success' | 'failed';
  error?: string;
}

export interface GroqAiConfig {
  provider: 'groq';
  defaultModel: string; // 'openai/gpt-oss-20b'
  isConfigured: boolean;
  activeModel?: string;
}

export interface GroqAnalyzeApiRequest extends ProjectAnalysisInput {}

export interface GroqAnalyzeApiResponse {
  success: boolean;
  analysis?: PptProjectAnalysis;
  error?: string;
  code?: string;
  modelUsed?: string;
}

