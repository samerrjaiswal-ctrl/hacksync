import type { FileChunkHeader } from './types';

const CHUNK_SIZE = 16 * 1024; // 16KB chunks (optimal across all WebRTC implementations)
const MAX_BUFFERED_AMOUNT = 256 * 1024; // 256KB backpressure threshold

export class FileSender {
  private file: File;
  private transferId: string;
  private sendData: (data: string | ArrayBuffer) => boolean;
  private getBufferedAmount: () => number;
  private onProgress: (progress: number) => void;
  private onComplete: () => void;
  private onError: (err: string) => void;

  private offset = 0;
  private isCancelled = false;
  private idBytes: Uint8Array;
  private retryCount = 0;
  private throttleTimer: any = null;
  private retryTimer: any = null;

  constructor(
    file: File,
    transferId: string,
    sendData: (data: string | ArrayBuffer) => boolean,
    getBufferedAmount: () => number,
    onProgress: (progress: number) => void,
    onComplete: () => void,
    onError: (err: string) => void
  ) {
    this.file = file;
    this.transferId = transferId;
    this.sendData = sendData;
    this.getBufferedAmount = getBufferedAmount;
    this.onProgress = onProgress;
    this.onComplete = onComplete;
    this.onError = onError;

    // Pre-encode transferId once (padded to 36 bytes for UUID)
    const encoder = new TextEncoder();
    this.idBytes = encoder.encode(this.transferId.padEnd(36, ' '));
  }

  public start() {
    this.readNextChunk();
  }

  public cancel() {
    this.isCancelled = true;
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    const cancelMsg: FileChunkHeader = { transferId: this.transferId, type: 'cancel' };
    this.sendData(JSON.stringify(cancelMsg));
  }

  private async readNextChunk() {
    if (this.isCancelled) return;

    if (this.offset >= this.file.size) {
      this.onProgress(1);
      const completeMsg: FileChunkHeader = { transferId: this.transferId, type: 'complete' };
      this.sendData(JSON.stringify(completeMsg));
      this.onComplete();
      return;
    }

    try {
      const slice = this.file.slice(this.offset, this.offset + CHUNK_SIZE);
      const buffer = await slice.arrayBuffer();
      this.sendChunk(buffer);
    } catch (e: any) {
      const errMsg = 'Error reading file: ' + e.message;
      try {
        const errorMsg: FileChunkHeader = { transferId: this.transferId, type: 'error', error: errMsg };
        this.sendData(JSON.stringify(errorMsg));
      } catch (_) {}
      this.onError(errMsg);
    }
  }

  private sendChunk(buffer: ArrayBuffer) {
    if (this.isCancelled) return;

    // Handle backpressure when SCTP queue builds up
    if (this.getBufferedAmount() > MAX_BUFFERED_AMOUNT) {
      this.throttleTimer = setTimeout(() => {
        this.throttleTimer = null;
        this.sendChunk(buffer);
      }, 15);
      return;
    }

    // Combine 36-byte transfer ID header + raw chunk bytes
    const combined = new Uint8Array(36 + buffer.byteLength);
    combined.set(this.idBytes, 0);
    combined.set(new Uint8Array(buffer), 36);

    try {
      const sent = this.sendData(combined.buffer);
      if (!sent) {
        this.retryCount++;
        if (this.retryCount > 100) { // 5 seconds of retrying
          const errMsg = 'Data channel closed or timed out';
          try {
            const errorMsg: FileChunkHeader = { transferId: this.transferId, type: 'error', error: errMsg };
            this.sendData(JSON.stringify(errorMsg));
          } catch (_) {}
          this.onError(errMsg);
          return;
        }
        this.retryTimer = setTimeout(() => {
          this.retryTimer = null;
          this.sendChunk(buffer);
        }, 50);
        return;
      }
      this.retryCount = 0;
    } catch (e: any) {
      const errMsg = 'Failed to send chunk: ' + e.message;
      try {
        const errorMsg: FileChunkHeader = { transferId: this.transferId, type: 'error', error: errMsg };
        this.sendData(JSON.stringify(errorMsg));
      } catch (_) {}
      this.onError(errMsg);
      return;
    }

    this.offset += buffer.byteLength;
    this.onProgress(this.file.size > 0 ? this.offset / this.file.size : 1);
    this.readNextChunk();
  }
}

export class FileReceiver {
  private transferId: string;
  private expectedSize: number;
  private mimeType: string;

  private onProgress: (progress: number) => void;
  private onComplete: (blob: Blob) => void;
  private onError: (err: string) => void;

  private chunks: Uint8Array[] = [];
  private receivedBytes = 0;
  private isCancelled = false;
  private isFinished = false;

  constructor(
    transferId: string,
    expectedSize: number,
    mimeType: string,
    onProgress: (progress: number) => void,
    onComplete: (blob: Blob | File) => void,
    onError: (err: string) => void
  ) {
    this.transferId = transferId;
    this.expectedSize = expectedSize;
    this.mimeType = mimeType;
    this.onProgress = onProgress;
    this.onComplete = onComplete;
    this.onError = onError;
  }

  public handleData(data: ArrayBuffer | string) {
    if (this.isCancelled || this.isFinished) return;

    if (typeof data === 'string') {
      try {
        const msg = JSON.parse(data) as FileChunkHeader;
        if (msg.transferId !== this.transferId) return;

        if (msg.type === 'complete') {
          this.finish();
        } else if (msg.type === 'cancel') {
          this.isCancelled = true;
          this.onError('Transfer cancelled by sender');
        } else if (msg.type === 'error') {
          this.isCancelled = true;
          this.onError(msg.error || 'Unknown sender error');
        }
      } catch (e) {
        // Not a JSON message, ignore
      }
      return;
    }

    // Binary chunk: first 36 bytes are transfer ID
    if (data.byteLength < 36) return;

    const decoder = new TextDecoder();
    const idBytes = new Uint8Array(data, 0, 36);
    const chunkId = decoder.decode(idBytes).trim();

    if (chunkId !== this.transferId) return; // ignore chunks for other transfers

    // Extract exact sliced chunk bytes (skip the 36-byte header)
    const chunkData = new Uint8Array(data, 36);
    
    // Strict overflow check: reject any chunks that would cause receivedBytes to exceed expectedSize
    if (this.receivedBytes + chunkData.byteLength > this.expectedSize) {
      this.isCancelled = true;
      this.onError(`Unexpected extra bytes: received ${this.receivedBytes + chunkData.byteLength} bytes, exceeding expected ${this.expectedSize}`);
      return;
    }

    this.receivedBytes += chunkData.byteLength;
    this.chunks.push(chunkData);
    
    if (this.expectedSize > 0) {
      const prog = Math.min(1, this.receivedBytes / this.expectedSize);
      this.onProgress(prog);

      // Finish immediately when exact expected byte count is reached
      if (this.receivedBytes === this.expectedSize) {
        this.finish();
      }
    }
  }

  private finish() {
    if (this.isFinished || this.isCancelled) return;

    // Strict validation: do not accept truncated, malformed, or mismatched files
    if (this.receivedBytes !== this.expectedSize) {
      this.isCancelled = true;
      this.onError(`Size mismatch upon completion: received ${this.receivedBytes} bytes, expected ${this.expectedSize} bytes`);
      return;
    }

    this.isFinished = true;
    this.onProgress(1);

    // Pass Uint8Array[] directly to Blob to preserve exact byteOffset without 36-byte header corruption
    const blob = new Blob(this.chunks as unknown as BlobPart[], { type: this.mimeType || 'application/octet-stream' });
    this.chunks = []; // free memory immediately
    this.onComplete(blob);
  }

  public cancel() {
    this.isCancelled = true;
    this.chunks = [];
  }
}
