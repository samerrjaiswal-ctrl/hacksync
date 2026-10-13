export type SignalingMessageType = 
  | 'peer-announce'
  | 'webrtc-offer'
  | 'webrtc-answer'
  | 'webrtc-ice'
  | 'file-discover'
  | 'file-offer'
  | 'file-request'
  | 'file-accept'
  | 'file-reject'
  | 'leader-ping';

export interface BaseSignalingMessage {
  type: SignalingMessageType;
  senderId: string;
  targetId?: string; // Optional, if meant for a specific peer
  payload: any;
}

export interface PeerAnnouncePayload {}

export interface WebRTCOfferPayload {
  sdp: RTCSessionDescriptionInit;
}

export interface WebRTCAnswerPayload {
  sdp: RTCSessionDescriptionInit;
}

export interface WebRTCICEPayload {
  candidate: RTCIceCandidateInit;
}

export interface FileDiscoverPayload {
  transferId: string;
  fileId: string;
}

export interface FileOfferPayload {
  transferId: string;
  fileId: string;
}

export interface FileRequestPayload {
  transferId: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface FileAcceptPayload {
  transferId: string;
}

export interface FileRejectPayload {
  transferId: string;
  reason: string;
}

export type TransferState = 
  | 'idle'
  | 'requesting'
  | 'awaiting-acceptance'
  | 'connecting'
  | 'transferring'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface TransferContext {
  transferId: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  senderId: string;
  receiverId: string;
  state: TransferState;
  progress: number;
  chunksReceived: number;
  totalChunks: number;
  error?: string;
  isAutoSync?: boolean; // New flag to prevent auto-downloading auto-synced files
}


export interface FileChunkHeader {
  transferId: string;
  type: 'chunk' | 'complete' | 'cancel' | 'error';
  chunkIndex?: number;
  data?: ArrayBuffer;
  error?: string;
}
