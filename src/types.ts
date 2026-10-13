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
}

export interface GoogleDriveStatus {
  isConnected: boolean;
  googleEmail: string | null;
  isConfigured: boolean;
  isLeader: boolean;
  lastUpdated?: string | null;
}
