import type { BaseSignalingMessage } from './types';

// Standard ICE servers. Includes Google's public STUN.
// TURN server should be injected from environment variables if available.
export const getIceServers = (): RTCIceServer[] => {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ];

  // TURN server should be provisioned via a secure backend API (e.g., Edge Function)
  // that returns short-lived credentials, rather than exposing static credentials
  // in client-visible environment variables.

  return servers;
};

export class PeerConnectionManager {
  public remotePeerId: string;
  private localPeerId: string;
  public connection: RTCPeerConnection;
  public dataChannel: RTCDataChannel | null = null;
  
  private onSignal: (msg: BaseSignalingMessage) => void;
  public onDataChannelOpen?: () => void;
  private dataChannelOpenCallbacks: (() => void)[] = [];
  public onDataChannelMessage?: (data: ArrayBuffer | string) => void;
  public onDataChannelClose?: () => void;
  public onConnectionStateChange?: (state: RTCPeerConnectionState) => void;

  private pendingCandidates: RTCIceCandidateInit[] = [];

  constructor(
    localPeerId: string, 
    remotePeerId: string, 
    onSignal: (msg: BaseSignalingMessage) => void,
    isInitiator: boolean
  ) {
    this.localPeerId = localPeerId;
    this.remotePeerId = remotePeerId;
    this.onSignal = onSignal;

    this.connection = new RTCPeerConnection({
      iceServers: getIceServers(),
    });

    this.connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.onSignal({
          type: 'webrtc-ice',
          senderId: this.localPeerId,
          targetId: this.remotePeerId,
          payload: { candidate: event.candidate.toJSON() }
        });
      }
    };

    this.connection.onconnectionstatechange = () => {
      this.onConnectionStateChange?.(this.connection.connectionState);
    };

    if (isInitiator) {
      this.dataChannel = this.connection.createDataChannel('file-transfer-channel', {
        ordered: true,
      });
      this.setupDataChannel(this.dataChannel);
    } else {
      this.connection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel(this.dataChannel);
      };
    }
  }

  private setupDataChannel(channel: RTCDataChannel) {
    channel.binaryType = 'arraybuffer';
    
    const handleOpen = () => {
      this.onDataChannelOpen?.();
      this.dataChannelOpenCallbacks.forEach(cb => cb());
      this.dataChannelOpenCallbacks = [];
    };

    if (channel.readyState === 'open') {
      setTimeout(handleOpen, 0);
    } else {
      channel.onopen = handleOpen;
    }
    
    channel.onclose = () => this.onDataChannelClose?.();
    channel.onmessage = (event) => this.onDataChannelMessage?.(event.data);
  }

  public addDataChannelOpenListener(cb: () => void): () => void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      cb();
      return () => {};
    } else {
      if (!this.dataChannel || this.dataChannel.readyState === 'closed' || this.dataChannel.readyState === 'closing') {
        try {
          this.dataChannel = this.connection.createDataChannel('file-transfer-channel', { ordered: true });
          this.setupDataChannel(this.dataChannel);
        } catch (e) {
          console.warn('Failed to recreate data channel on active peer', e);
        }
      }
      this.dataChannelOpenCallbacks.push(cb);
      return () => {
        this.dataChannelOpenCallbacks = this.dataChannelOpenCallbacks.filter(c => c !== cb);
      };
    }
  }

  public async createOffer() {
    try {
      const offer = await this.connection.createOffer();
      await this.connection.setLocalDescription(offer);
      this.onSignal({
        type: 'webrtc-offer',
        senderId: this.localPeerId,
        targetId: this.remotePeerId,
        payload: { sdp: offer }
      });
    } catch (err) {
      console.error('Failed to create offer', err);
    }
  }

  public async handleOffer(sdp: RTCSessionDescriptionInit) {
    try {
      if (this.connection.signalingState !== 'stable') {
        if (this.connection.signalingState === 'have-local-offer') {
          // Glare: rollback local offer to accept remote offer
          await this.connection.setLocalDescription({ type: 'rollback' } as any);
        } else {
          return;
        }
      }
      await this.connection.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await this.connection.createAnswer();
      await this.connection.setLocalDescription(answer);
      this.onSignal({
        type: 'webrtc-answer',
        senderId: this.localPeerId,
        targetId: this.remotePeerId,
        payload: { sdp: answer }
      });
      
      // Process any candidates that arrived while setting remote description
      this.processPendingCandidates();
    } catch (err) {
      console.warn('Failed to handle offer', err);
    }
  }

  public async handleAnswer(sdp: RTCSessionDescriptionInit) {
    try {
      if (this.connection.signalingState !== 'have-local-offer') {
        return; // Ignore stale or redundant answer
      }
      await this.connection.setRemoteDescription(new RTCSessionDescription(sdp));
      this.processPendingCandidates();
    } catch (err) {
      console.warn('Failed to handle answer', err);
    }
  }

  public async handleIceCandidate(candidate: RTCIceCandidateInit) {
    if (this.connection.remoteDescription && this.connection.remoteDescription.type) {
      try {
        await this.connection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Failed to add ICE candidate', err);
      }
    } else {
      // Queue candidate until remote description is set
      this.pendingCandidates.push(candidate);
    }
  }

  private async processPendingCandidates() {
    for (const candidate of this.pendingCandidates) {
      try {
        await this.connection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Failed to add queued ICE candidate', err);
      }
    }
    this.pendingCandidates = [];
  }

  public send(data: string | ArrayBuffer) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      if (typeof data === 'string') {
        this.dataChannel.send(data);
      } else {
        this.dataChannel.send(data);
      }
      return true;
    }
    return false;
  }

  public getBufferedAmount() {
    return this.dataChannel?.bufferedAmount || 0;
  }

  public setBufferedAmountLowCallback(threshold: number, callback: () => void) {
    if (this.dataChannel) {
      this.dataChannel.bufferedAmountLowThreshold = threshold;
      this.dataChannel.onbufferedamountlow = callback;
    }
  }

  public close() {
    if (this.dataChannel) {
      this.dataChannel.close();
    }
    this.connection.close();
  }
}
