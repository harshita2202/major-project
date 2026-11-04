/**
 * mobileCamera.js
 * ProctorTrack™ — Dual-Camera Proctoring
 *
 * Laptop-side WebRTC peer + signaling for mobile camera integration.
 * Uses the existing STOMP WebSocket for signaling.
 */

import { API_BASE_URL } from './api';
import { subscribeToTopic, sendWebSocketMessage } from './websocket';

// ICE servers for NAT traversal (using public STUN)
const ICE_SERVERS = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
];

/**
 * Generate a mobile pairing token from the backend.
 * @param {string} sessionId  - Current exam session ID
 * @param {string} examId
 * @param {string} candidateId
 * @param {string} candidateName
 * @returns {Promise<{token, pairingUrl, sessionId}>}
 */
export async function generateMobilePairingToken(sessionId, examId, candidateId, candidateName) {
  const frontendBaseUrl = window.location.origin;
  const res = await fetch(`${API_BASE_URL}/api/mobile-pairing/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, examId, candidateId, candidateName, frontendBaseUrl }),
  });
  if (!res.ok) throw new Error('Failed to generate mobile pairing token');
  return res.json();
}

/**
 * Check current mobile connection status from backend.
 */
export async function getMobileConnectionStatus(sessionId) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/mobile-pairing/session-status?sessionId=${encodeURIComponent(sessionId)}`);
    if (!res.ok) return { mobileConnected: false };
    return res.json();
  } catch {
    return { mobileConnected: false };
  }
}

/**
 * LaptopMobileWebRTC
 * Manages the WebRTC connection from the laptop side (offerer).
 * The mobile device is the answerer.
 */
export class LaptopMobileWebRTC {
  constructor(sessionId, { onRemoteStream, onConnectionStateChange, onIceConnectionState } = {}) {
    this.sessionId = sessionId;
    this.onRemoteStream = onRemoteStream;
    this.onConnectionStateChange = onConnectionStateChange;
    this.onIceConnectionState = onIceConnectionState;
    this.pc = null;
    this.subs = [];
    this.iceQueue = [];
    this._destroyed = false;
    this.isNegotiating = false;
  }

  /**
   * Start the WebRTC handshake: create offer and start signaling.
   */
  async start() {
    if (this._destroyed) return;

    if (this.pc) {
      try { this.pc.close(); } catch (e) { void e; }
      this.pc = null;
    }

    this.iceQueue = [];
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Explicitly add video transceiver in recvonly mode so SDP offer includes video
    try {
      this.pc.addTransceiver('video', { direction: 'recvonly' });
    } catch (e) {
      console.warn('[MobileWebRTC] addTransceiver warning:', e);
    }

    this.pc.ontrack = (event) => {
      console.log('[MobileWebRTC] Received remote track from mobile:', event.track.kind);
      let stream = event.streams && event.streams[0];
      if (!stream) {
        stream = new MediaStream([event.track]);
      }
      if (this.onRemoteStream) {
        this.onRemoteStream(stream);
      }
    };

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendWebSocketMessage('/app/webrtc/' + this.sessionId + '/ice-laptop', {
          candidate: event.candidate,
        });
      }
    };

    this.pc.onconnectionstatechange = () => {
      const state = this.pc ? this.pc.connectionState : 'closed';
      console.log('[MobileWebRTC] Connection state:', state);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(state);
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      const iceState = this.pc ? this.pc.iceConnectionState : 'closed';
      console.log('[MobileWebRTC] ICE connection state:', iceState);
      if (this.onIceConnectionState) {
        this.onIceConnectionState(iceState);
      }
      if (iceState === 'connected' || iceState === 'completed') {
        if (this.onConnectionStateChange) {
          this.onConnectionStateChange('connected');
        }
      }
    };

    // Clean existing subscriptions before resubscribing
    this.subs.forEach((unsub) => {
      try { if (typeof unsub === 'function') unsub(); } catch (e) { void e; }
    });
    this.subs = [];

    // Subscribe to answer from mobile
    const unsubAnswer = subscribeToTopic('/topic/webrtc/' + this.sessionId + '/answer', async (payload) => {
      if (this._destroyed || !this.pc || !payload || !payload.sdp) return;
      try {
        console.log('[MobileWebRTC] Received answer from mobile');
        const answer = new RTCSessionDescription(payload.sdp);
        if (this.pc.signalingState === 'have-local-offer') {
          await this.pc.setRemoteDescription(answer);

          // Flush queued ICE candidates
          while (this.iceQueue.length > 0) {
            const candidate = this.iceQueue.shift();
            try {
              await this.pc.addIceCandidate(candidate);
            } catch (err) {
              console.warn('[MobileWebRTC] Queued ICE add error:', err);
            }
          }
        }
      } catch (err) {
        console.warn('[MobileWebRTC] Error setting remote answer:', err);
      } finally {
        this.isNegotiating = false;
      }
    });
    this.subs.push(unsubAnswer);

    // Subscribe to ICE candidates from mobile
    const unsubIce = subscribeToTopic('/topic/webrtc/' + this.sessionId + '/ice-mobile', async (payload) => {
      if (this._destroyed || !payload || !payload.candidate) return;
      try {
        const candidate = new RTCIceCandidate(payload.candidate);
        if (!this.pc || !this.pc.remoteDescription) {
          this.iceQueue.push(candidate);
        } else {
          await this.pc.addIceCandidate(candidate);
        }
      } catch (err) {
        console.warn('[MobileWebRTC] Error adding ICE candidate:', err);
      }
    });
    this.subs.push(unsubIce);

    // Subscribe to mobile-ready notification
    const unsubReady = subscribeToTopic('/topic/webrtc/' + this.sessionId + '/mobile-ready', async () => {
      if (this._destroyed) return;
      console.log('[MobileWebRTC] Received mobile-ready notification from phone');
      this.renegotiate();
    });
    this.subs.push(unsubReady);

    // Send initial offer
    await this._createAndSendOffer();
  }

  async _createAndSendOffer() {
    if (!this.pc || this._destroyed) return;
    try {
      this.isNegotiating = true;
      const offer = await this.pc.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: false,
      });
      await this.pc.setLocalDescription(offer);

      sendWebSocketMessage('/app/webrtc/' + this.sessionId + '/offer', {
        sdp: { type: offer.type, sdp: offer.sdp },
      });
    } catch (err) {
      console.warn('[MobileWebRTC] Create offer error:', err);
      this.isNegotiating = false;
    }
  }

  /**
   * Renegotiate — create a new offer (e.g., after mobile connects or reconnects).
   */
  async renegotiate() {
    if (this._destroyed) return;
    if (!this.pc || this.pc.connectionState === 'closed' || this.pc.connectionState === 'failed') {
      return this.start();
    }
    // If already negotiating, wait briefly
    if (this.pc.signalingState !== 'stable') {
      console.log('[MobileWebRTC] Signaling state not stable, restarting connection');
      return this.start();
    }
    await this._createAndSendOffer();
  }

  destroy() {
    this._destroyed = true;
    this.subs.forEach((unsub) => {
      try { if (typeof unsub === 'function') unsub(); } catch (e) { void e; }
    });
    this.subs = [];
    if (this.pc) {
      try { this.pc.close(); } catch (e) { void e; }
      this.pc = null;
    }
  }
}

/**
 * Subscribe to mobile camera status updates (connected/disconnected).
 * @param {string} sessionId
 * @param {function} onStatus - called with { mobileConnected: boolean }
 * @returns {function} unsubscribe
 */
export function subscribeToMobileCameraStatus(sessionId, onStatus) {
  return subscribeToTopic('/topic/mobile-status/' + sessionId, (data) => {
    onStatus(data);
  });
}
