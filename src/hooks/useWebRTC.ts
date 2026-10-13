import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { 
  BaseSignalingMessage, 
  TransferContext, 
  FileRequestPayload, 
  FileRejectPayload
} from '../lib/webrtc/types';
import { PeerConnectionManager } from '../lib/webrtc/PeerConnectionManager';
import { FileSender, FileReceiver } from '../lib/webrtc/fileTransfer';

// How long the sender waits for the data channel to open before giving up
const CHANNEL_OPEN_TIMEOUT_MS = 15000;
// If a receiving transfer makes no progress for this long, fail it instead of hanging forever
const STALL_TIMEOUT_MS = 20000;

export function useWebRTC(
  teamId: string, 
  currentUserId: string | null, 
  isLeader: boolean,
  leaderId: string | null,
  getFileForTransfer: (fileId: string) => Promise<File | undefined>,
  onFileReceived?: (fileId: string, file: File) => void
) {
  const [peers, setPeers] = useState<string[]>([]);
  const [transfers, setTransfers] = useState<Record<string, TransferContext>>({});
  const [isLeaderOffline, setIsLeaderOffline] = useState(false);
  const lastPingRef = useRef<number>(Date.now());
  
  const peersRef = useRef<Map<string, PeerConnectionManager>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  
  const sendersRef = useRef<Map<string, FileSender>>(new Map());
  const receiversRef = useRef<Map<string, FileReceiver>>(new Map());
  const pendingRequestsRef = useRef<Map<string, any>>(new Map());
  // Last activity timestamp per receiving transfer (for stall detection)
  const lastActivityRef = useRef<Map<string, number>>(new Map());
  // Last reported whole-percent per transfer (to throttle React state updates)
  const lastPctRef = useRef<Map<string, number>>(new Map());

  // Keep latest callbacks in refs so the long-lived channel handlers never use stale closures
  const getFileRef = useRef(getFileForTransfer);
  const onFileReceivedRef = useRef(onFileReceived);
  useEffect(() => { getFileRef.current = getFileForTransfer; }, [getFileForTransfer]);
  useEffect(() => { onFileReceivedRef.current = onFileReceived; }, [onFileReceived]);

  // Helper to send signaling messages via Supabase Realtime broadcast
  const sendSignal = useCallback((msg: BaseSignalingMessage) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: msg.type,
        payload: msg
      });
    }
  }, []);

  const updateTransferState = useCallback((id: string, updates: Partial<TransferContext>) => {
    setTransfers(prev => {
      if (!prev[id]) return prev;
      return { ...prev, [id]: { ...prev[id], ...updates } };
    });
  }, []);

  // Only push progress into React state when the whole percent changes.
  // Updating on every 16KB chunk caused thousands of re-renders and slowed big transfers.
  const reportProgress = useCallback((id: string, progress: number) => {
    lastActivityRef.current.set(id, Date.now());
    const pct = Math.min(100, Math.floor(progress * 100));
    if (lastPctRef.current.get(id) === pct) return;
    lastPctRef.current.set(id, pct);
    updateTransferState(id, { progress: pct / 100 });
  }, [updateTransferState]);

  const cleanupTransferRefs = (id: string) => {
    receiversRef.current.delete(id);
    sendersRef.current.delete(id);
    lastActivityRef.current.delete(id);
    lastPctRef.current.delete(id);
  };

  const isPeerUsable = (peer: PeerConnectionManager | undefined) => {
    if (!peer) return false;
    const s = peer.connection.connectionState;
    if (s === 'failed' || s === 'closed' || s === 'disconnected') return false;
    if (peer.dataChannel && peer.dataChannel.readyState === 'closed') return false;
    return true;
  };

  const destroyPeer = (remoteId: string) => {
    const old = peersRef.current.get(remoteId);
    if (!old) return;
    old.onConnectionStateChange = undefined;
    old.onDataChannelMessage = undefined;
    try { old.close(); } catch (e) { /* ignore */ }
    peersRef.current.delete(remoteId);
  };

  const getOrCreatePeer = useCallback((remoteId: string, isInitiator: boolean, forceNew: boolean = false) => {
    if (!currentUserId) return null;
    if (forceNew) {
      destroyPeer(remoteId);
    } else if (peersRef.current.has(remoteId)) {
      return peersRef.current.get(remoteId)!;
    }

    const peer = new PeerConnectionManager(
      currentUserId,
      remoteId,
      sendSignal,
      isInitiator
    );

    peer.onConnectionStateChange = (state) => {
      console.log(`Peer ${remoteId} state: ${state}`);
      // Ignore events from a peer object that has since been replaced
      if (peersRef.current.get(remoteId) !== peer) return;
      if (state === 'failed' || state === 'closed' || state === 'disconnected') {
        setPeers(prev => prev.filter(id => id !== remoteId));
        if (state === 'failed' || state === 'closed') {
          peersRef.current.delete(remoteId);
        }
        // Fail any active receiving or sending transfer associated with this peer immediately
        setTransfers(prev => {
          let updated = false;
          const next = { ...prev };
          Object.values(next).forEach(t => {
            if ((t.senderId === remoteId || t.receiverId === remoteId) && (t.state === 'transferring' || t.state === 'requesting')) {
              t.state = 'failed';
              t.error = `Peer connection ${state}`;
              receiversRef.current.get(t.transferId)?.cancel();
              sendersRef.current.get(t.transferId)?.cancel();
              cleanupTransferRefs(t.transferId);
              updated = true;
            }
          });
          return updated ? next : prev;
        });
      } else if (state === 'connected') {
        setPeers(prev => prev.includes(remoteId) ? prev : [...prev, remoteId]);
      }
    };

    peer.onDataChannelOpen = () => {
      setPeers(prev => prev.includes(remoteId) ? prev : [...prev, remoteId]);
    };

    peer.onDataChannelClose = () => {
      setTransfers(prev => {
        let updated = false;
        const next = { ...prev };
        Object.values(next).forEach(t => {
          if ((t.senderId === remoteId || t.receiverId === remoteId) && t.state === 'transferring') {
            t.state = 'failed';
            t.error = 'Data channel closed unexpectedly';
            receiversRef.current.get(t.transferId)?.cancel();
            sendersRef.current.get(t.transferId)?.cancel();
            cleanupTransferRefs(t.transferId);
            updated = true;
          }
        });
        return updated ? next : prev;
      });
    };

    peer.onDataChannelMessage = (data) => {
      if (typeof data === 'string') {
        // JSON control messages ('complete' / 'cancel' / 'error') — each receiver filters by transferId
        receiversRef.current.forEach(receiver => receiver.handleData(data));
      } else {
        // Binary data: first 36 bytes are the transfer id
        const decoder = new TextDecoder();
        const idBytes = new Uint8Array(data, 0, 36);
        const transferId = decoder.decode(idBytes).trim();
        const receiver = receiversRef.current.get(transferId);
        if (receiver) {
          receiver.handleData(data);
        }
      }
    };

    peersRef.current.set(remoteId, peer);
    return peer;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, sendSignal]);

  // Returns a live peer for remoteId; if none / dead, creates a fresh one and starts negotiation.
  const ensureLivePeer = useCallback((remoteId: string) => {
    const existing = peersRef.current.get(remoteId);
    if (isPeerUsable(existing)) return existing!;
    const peer = getOrCreatePeer(remoteId, true, true);
    peer?.createOffer();
    return peer;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getOrCreatePeer]);

  useEffect(() => {
    if (!teamId || !currentUserId) return;

    const channel = supabase.channel(`workspace-${teamId}`);
    channelRef.current = channel;

    channel.on('broadcast', { event: 'peer-announce' }, (payload) => {
      const msg = payload.payload as BaseSignalingMessage;
      if (msg.senderId !== currentUserId) {
        const existing = peersRef.current.get(msg.senderId);
        // If we already have a healthy connected or connecting peer, NEVER tear it down!
        if (existing && isPeerUsable(existing) && (existing.connection.connectionState === 'connected' || existing.connection.connectionState === 'connecting')) {
          setPeers(prev => prev.includes(msg.senderId) ? prev : [...prev, msg.senderId]);
          return;
        }

        // If not connected, negotiate.
        // Use tie-breaker on heartbeats so both peers don't create simultaneous offers
        const isHeartbeat = Boolean((msg.payload as any)?.heartbeat);
        if (!isHeartbeat || currentUserId > msg.senderId) {
          const peer = getOrCreatePeer(msg.senderId, true, true);
          peer?.createOffer();
        }
      }
    });

    channel.on('broadcast', { event: 'webrtc-offer' }, async (payload) => {
      const msg = payload.payload as BaseSignalingMessage;
      if (msg.targetId !== currentUserId) return;

      const existing = peersRef.current.get(msg.senderId);
      if (existing && existing.connection.signalingState === 'have-local-offer') {
        // Glare: both sides offered at once. The peer with the larger id wins and keeps its offer.
        if (currentUserId > msg.senderId) return;
      }
      // Remote started a new negotiation — replace whatever we had with a fresh answerer
      const peer = getOrCreatePeer(msg.senderId, false, true);
      await peer?.handleOffer(msg.payload.sdp);
    });

    channel.on('broadcast', { event: 'webrtc-answer' }, async (payload) => {
      const msg = payload.payload as BaseSignalingMessage;
      if (msg.targetId === currentUserId) {
        const peer = peersRef.current.get(msg.senderId);
        if (peer && peer.connection.signalingState === 'have-local-offer') {
          await peer.handleAnswer(msg.payload.sdp);
        }
      }
    });

    channel.on('broadcast', { event: 'webrtc-ice' }, async (payload) => {
      const msg = payload.payload as BaseSignalingMessage;
      if (msg.targetId === currentUserId) {
        const peer = peersRef.current.get(msg.senderId);
        await peer?.handleIceCandidate(msg.payload.candidate);
      }
    });

    channel.on('broadcast', { event: 'file-discover' }, async (payload) => {
      const msg = payload.payload as BaseSignalingMessage;
      if (msg.senderId === currentUserId) return;
      const { transferId, fileId } = msg.payload as any;

      const file = await getFileRef.current(fileId);
      if (file) {
        sendSignal({
          type: 'file-offer',
          senderId: currentUserId,
          targetId: msg.senderId,
          payload: { transferId, fileId }
        });
      }
    });

    channel.on('broadcast', { event: 'file-offer' }, (payload) => {
      const msg = payload.payload as BaseSignalingMessage;
      if (msg.targetId !== currentUserId) return;
      const { transferId, fileId } = msg.payload as any;
      
      const req = pendingRequestsRef.current.get(transferId);
      if (!req) return; // someone else already offered this file
      pendingRequestsRef.current.delete(transferId);
      
      setTransfers(prev => {
        const t = prev[transferId];
        if (t) {
          return { ...prev, [transferId]: { ...t, senderId: msg.senderId } };
        }
        return prev;
      });

      // Set up receiver before asking, so we don't miss chunks if WebRTC is faster than signaling
      const receiver = new FileReceiver(
        transferId,
        req.fileSize,
        req.mimeType,
        (progress) => reportProgress(transferId, progress),
        async (blob) => {
          cleanupTransferRefs(transferId);
          updateTransferState(transferId, { state: 'completed', progress: 1 });
          
          const fileObj = new File([blob], req.fileName, { type: req.mimeType || 'application/octet-stream' });
          try {
            if (fileObj.size < 50 * 1024 * 1024) {
              const { storeFile } = await import('../lib/indexedDB');
              await storeFile(fileId, fileObj);
            }
          } catch (e) {
            console.error('Failed to store received file locally:', e);
          }
          onFileReceivedRef.current?.(fileId, fileObj);

          if (!req.isAutoSync) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = req.fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 10000);
          }
        },
        (err) => {
          cleanupTransferRefs(transferId);
          updateTransferState(transferId, { state: 'failed', error: err });
          alert(`Download failed: ${err}`);
        }
      );

      receiversRef.current.set(transferId, receiver);
      lastActivityRef.current.set(transferId, Date.now());
      updateTransferState(transferId, { state: 'transferring' });

      sendSignal({
        type: 'file-request',
        senderId: currentUserId,
        targetId: msg.senderId,
        payload: { transferId, fileId, fileName: req.fileName, fileSize: req.fileSize, mimeType: req.mimeType }
      });
    });

    channel.on('broadcast', { event: 'file-request' }, async (payload) => {
      const msg = payload.payload as BaseSignalingMessage;
      if (msg.targetId !== currentUserId) return;
      const req = msg.payload as FileRequestPayload;

      const rejectToReceiver = (reason: string) => sendSignal({
        type: 'file-reject',
        senderId: currentUserId,
        targetId: msg.senderId,
        payload: { transferId: req.transferId, reason }
      });
      
      const file = await getFileRef.current(req.fileId);
      if (!file) {
        rejectToReceiver('File no longer available locally');
        return;
      }

      // Make sure we have a *live* connection to the requester (creates + negotiates if stale)
      const peer = ensureLivePeer(msg.senderId);
      if (!peer) return;

      const sender = new FileSender(
        file,
        req.transferId,
        (data) => peer.send(data),
        () => peer.getBufferedAmount(),
        (progress) => reportProgress(req.transferId, progress),
        () => {
          cleanupTransferRefs(req.transferId);
          updateTransferState(req.transferId, { state: 'completed', progress: 1 });
        },
        (err) => {
          cleanupTransferRefs(req.transferId);
          updateTransferState(req.transferId, { state: 'failed', error: err });
          rejectToReceiver(err);
        }
      );
      sendersRef.current.set(req.transferId, sender);

      // Sender-side record (used for cancel). The UI filters these out so the sender never sees a download.
      setTransfers(prev => ({
        ...prev,
        [req.transferId]: {
          transferId: req.transferId,
          fileId: req.fileId,
          fileName: req.fileName,
          fileSize: req.fileSize,
          mimeType: req.mimeType,
          senderId: currentUserId,
          receiverId: msg.senderId,
          state: 'transferring',
          progress: 0,
          chunksReceived: 0,
          totalChunks: 0
        }
      }));

      sendSignal({
        type: 'file-accept',
        senderId: currentUserId,
        targetId: msg.senderId,
        payload: { transferId: req.transferId }
      });

      let started = false;
      let removeListener: (() => void) | undefined;
      const openTimeout = setTimeout(() => {
        if (started) return;
        removeListener?.();
        sender.cancel();
        cleanupTransferRefs(req.transferId);
        updateTransferState(req.transferId, { state: 'failed', error: 'Could not connect to peer' });
        rejectToReceiver('Could not establish a connection with the sender. Please try again.');
      }, CHANNEL_OPEN_TIMEOUT_MS);

      removeListener = peer.addDataChannelOpenListener(() => {
        if (started) return;
        started = true;
        clearTimeout(openTimeout);
        sender.start();
      });
    });

    channel.on('broadcast', { event: 'file-accept' }, () => {
      // Receiver is already set up and waiting, just an acknowledgment.
    });

    channel.on('broadcast', { event: 'file-reject' }, (payload) => {
      const msg = payload.payload as BaseSignalingMessage;
      if (msg.targetId !== currentUserId) return;
      const rej = msg.payload as FileRejectPayload;
      receiversRef.current.get(rej.transferId)?.cancel();
      sendersRef.current.get(rej.transferId)?.cancel();
      cleanupTransferRefs(rej.transferId);
      setTransfers(prev => {
        const t = prev[rej.transferId];
        if (!t || t.state === 'completed') return prev;
        return { ...prev, [rej.transferId]: { ...t, state: 'failed', error: rej.reason } };
      });
      alert(`Download failed: ${rej.reason || 'Peer rejected request'}`);
    });

    channel.on('broadcast', { event: 'leader-ping' }, (payload) => {
      const msg = payload.payload as BaseSignalingMessage;
      if (msg.senderId === leaderId) {
        lastPingRef.current = Date.now();
        setIsLeaderOffline(false);
      }
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        sendSignal({
          type: 'peer-announce',
          senderId: currentUserId,
          payload: {}
        });
      }
    });

    // Stall watchdog: a receiving transfer that makes no progress is failed instead of spinning forever
    const stallInterval = setInterval(() => {
      const now = Date.now();
      receiversRef.current.forEach((receiver, transferId) => {
        const last = lastActivityRef.current.get(transferId) ?? now;
        if (now - last > STALL_TIMEOUT_MS) {
          receiver.cancel();
          cleanupTransferRefs(transferId);
          setTransfers(prev => {
            const t = prev[transferId];
            if (!t || t.state !== 'transferring') return prev;
            if (t.senderId && t.senderId !== 'searching') {
              sendSignal({
                type: 'file-reject',
                senderId: currentUserId,
                targetId: t.senderId,
                payload: { transferId, reason: 'Transfer stalled' }
              });
            }
            return { ...prev, [transferId]: { ...t, state: 'failed', error: 'Transfer stalled — please try again' } };
          });
        }
      });
    }, 5000);

    let pingInterval: any;
    let checkInterval: any;

    // Periodic announcement so peers discover each other automatically without needing manual refresh
    const announceInterval = setInterval(() => {
      sendSignal({
        type: 'peer-announce',
        senderId: currentUserId,
        payload: { heartbeat: true }
      });
    }, 4000);

    if (isLeader) {
      pingInterval = setInterval(() => {
        sendSignal({ type: 'leader-ping', senderId: currentUserId, payload: {} });
      }, 5000);
    } else if (leaderId) {
      lastPingRef.current = Date.now();
      checkInterval = setInterval(() => {
        if (Date.now() - lastPingRef.current > 15000) {
          setIsLeaderOffline(true);
        } else {
          setIsLeaderOffline(false);
        }
      }, 3000);
    }

    return () => {
      clearInterval(stallInterval);
      clearInterval(announceInterval);
      if (pingInterval) clearInterval(pingInterval);
      if (checkInterval) clearInterval(checkInterval);
      peersRef.current.forEach(p => p.close());
      peersRef.current.clear();
      channel.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, currentUserId]); 

  const requestFile = useCallback((fileId: string, fileName: string, fileSize: number, mimeType: string, _ownerId: string, isAutoSync: boolean = false) => {
    if (!currentUserId) return;
    const transferId = crypto.randomUUID();
    
    setTransfers(prev => ({
      ...prev,
      [transferId]: {
        transferId,
        fileId,
        fileName,
        fileSize,
        mimeType,
        senderId: 'searching', // Will be updated when someone offers
        receiverId: currentUserId,
        state: 'requesting',
        progress: 0,
        chunksReceived: 0,
        totalChunks: 0,
        isAutoSync
      }
    }));

    pendingRequestsRef.current.set(transferId, { fileId, fileName, fileSize, mimeType, isAutoSync });

    sendSignal({
      type: 'file-discover',
      senderId: currentUserId,
      payload: { transferId, fileId, fileName, fileSize, mimeType }
    });
    
    // Discovery timeout: if no one responds in 6s, mark as failed
    setTimeout(() => {
      if (pendingRequestsRef.current.has(transferId)) {
        pendingRequestsRef.current.delete(transferId);
        setTransfers(prev => {
          const t = prev[transferId];
          if (t && t.state === 'requesting') {
            return { ...prev, [transferId]: { ...t, state: 'failed', error: 'Uploader is offline' } };
          }
          return prev;
        });
        alert('Download failed: The member who uploaded this file is currently offline.');
      }
    }, 6000);
  }, [currentUserId, sendSignal]);

  const cancelTransfer = (transferId: string) => {
    if (!currentUserId) return;
    
    setTransfers(prev => {
      const t = prev[transferId];
      if (!t) return prev;

      if (t.senderId === currentUserId) {
        sendersRef.current.get(transferId)?.cancel();
        sendSignal({
          type: 'file-reject',
          senderId: currentUserId,
          targetId: t.receiverId,
          payload: { transferId, reason: 'Cancelled by owner' }
        });
      } else {
        receiversRef.current.get(transferId)?.cancel();
        sendSignal({
          type: 'file-reject',
          senderId: currentUserId,
          targetId: t.senderId,
          payload: { transferId, reason: 'Cancelled by recipient' }
        });
      }
      cleanupTransferRefs(transferId);

      return { ...prev, [transferId]: { ...t, state: 'cancelled' } };
    });
  };

  return {
    peers,
    transfers,
    isLeaderOffline,
    requestFile,
    cancelTransfer
  };
}
