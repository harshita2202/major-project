/**
 * mobilePeer.js
 * ProctorTrack™ — Dual-Camera Proctoring
 *
 * Mobile-side WebRTC peer logic.
 * The mobile device is the ANSWERER in the main laptop↔mobile connection,
 * and also an answerer for any proctor viewer connections.
 */

import { subscribeToTopic, sendWebSocketMessage } from './websocket';
import { API_BASE_URL } from './api';

const ICE_SERVERS = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
];

/**
 * Validate a pairing token with the backend.
 */
export async function validatePairingToken(token) {
  const res = await fetch(`${API_BASE_URL}/api/mobile-pairing/validate?token=${encodeURIComponent(token)}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Invalid or expired token');
  }
  return res.json();
}

/**
 * Notify backend of mobile connection status change.
 */
export async function notifyMobileStatus(token, connected) {
  try {
    await fetch(`${API_BASE_URL}/api/mobile-pairing/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, connected }),
    });
  } catch (err) {
    console.warn('[MobilePeer] Status notify error:', err);
  }
}

/**
 * MobilePeer
 * Manages mobile-side WebRTC connections:
 * 1. Main connection (laptop as offerer, mobile as answerer) - streams mobile camera to laptop
 * 2. Proctor viewer connections (proctor as offerer, mobile as answerer) - streams mobile camera to proctor
 */
export class MobilePeer {
  constructor(sessionId, localStream, { onConnectionStateChange } = {}) {
    this.sessionId = sessionId;
    this.localStream = localStream;
    this.onConnectionStateChange = onConnectionStateChange;
    this.pc = null; // Main laptop connection
    this.proctorPc = null; // Proctor viewer connection
    this.subs = [];
    this._destroyed = false;
    this.laptopIceQueue = [];
    this.proctorIceQueue = [];
    this.heartbeatTimer = null;
  }

  /**
   * Start listening for WebRTC offer from the laptop and establish connection.
   */
  async start() {
    this._subscribeToOffer();
    this._subscribeToIceLaptop();
    this._subscribeToProctorOffer();

    // Signal laptop that mobile is ready and streaming
    this.notifyReady();

    // Periodic heartbeat to signal mobile-ready until WebRTC state is connected
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this._destroyed) {
        clearInterval(this.heartbeatTimer);
        return;
      }
      if (this.pc && (this.pc.connectionState === 'connected' || this.pc.iceConnectionState === 'connected')) {
        clearInterval(this.heartbeatTimer);
        return;
      }
      this.notifyReady();
    }, 2500);
  }

  notifyReady() {
    sendWebSocketMessage('/app/webrtc/' + this.sessionId + '/mobile-ready', { ready: true });
  }

  updateStream(newStream) {
    this.localStream = newStream;
    const newVideoTrack = newStream ? newStream.getVideoTracks()[0] : null;

    if (this.pc && newVideoTrack) {
      const senders = this.pc.getSenders();
      const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
      if (videoSender) {
        videoSender.replaceTrack(newVideoTrack).catch((err) => {
          console.warn('[MobilePeer] replaceTrack error:', err);
        });
      }
    }

    if (this.proctorPc && newVideoTrack) {
      const senders = this.proctorPc.getSenders();
      const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
      if (videoSender) {
        videoSender.replaceTrack(newVideoTrack).catch((err) => {
          console.warn('[MobilePeer] replaceTrack for proctor error:', err);
        });
      }
    }
  }

  _subscribeToOffer() {
    const unsub = subscribeToTopic('/topic/webrtc/' + this.sessionId + '/offer', async (payload) => {
      if (this._destroyed || !payload || !payload.sdp) return;
      try {
        console.log('[MobilePeer] Received offer from laptop');
        if (this.pc) {
          try { this.pc.close(); } catch (e) { void e; }
        }
        this.laptopIceQueue = [];
        this.pc = this._createPeerConnection('laptop');

        const offer = new RTCSessionDescription(payload.sdp);
        await this.pc.setRemoteDescription(offer);

        // Flush queued ICE candidates
        while (this.laptopIceQueue.length > 0) {
          const candidate = this.laptopIceQueue.shift();
          try {
            await this.pc.addIceCandidate(candidate);
          } catch (e) {
            console.warn('[MobilePeer] Queued ICE add error:', e);
          }
        }

        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);

        sendWebSocketMessage('/app/webrtc/' + this.sessionId + '/answer', {
          sdp: { type: answer.type, sdp: answer.sdp },
        });
      } catch (err) {
        console.warn('[MobilePeer] Error handling offer:', err);
      }
    });

    this.subs.push(unsub);
  }

  _subscribeToIceLaptop() {
    const unsub = subscribeToTopic('/topic/webrtc/' + this.sessionId + '/ice-laptop', async (payload) => {
      if (this._destroyed || !payload || !payload.candidate) return;
      try {
        const candidate = new RTCIceCandidate(payload.candidate);
        if (!this.pc || !this.pc.remoteDescription) {
          this.laptopIceQueue.push(candidate);
        } else {
          await this.pc.addIceCandidate(candidate);
        }
      } catch (err) {
        console.warn('[MobilePeer] Error adding ICE from laptop:', err);
      }
    });

    this.subs.push(unsub);
  }

  _subscribeToProctorOffer() {
    const unsubOffer = subscribeToTopic('/topic/webrtc/' + this.sessionId + '/proctor-offer', async (payload) => {
      if (this._destroyed || !payload || !payload.sdp) return;
      try {
        console.log('[MobilePeer] Received offer from proctor');
        if (this.proctorPc) {
          try { this.proctorPc.close(); } catch (e) { void e; }
        }
        this.proctorIceQueue = [];
        this.proctorPc = this._createPeerConnection('proctor');

        const offer = new RTCSessionDescription(payload.sdp);
        await this.proctorPc.setRemoteDescription(offer);

        while (this.proctorIceQueue.length > 0) {
          const candidate = this.proctorIceQueue.shift();
          try {
            await this.proctorPc.addIceCandidate(candidate);
          } catch (e) {
            console.warn('[MobilePeer] Queued proctor ICE add error:', e);
          }
        }

        const answer = await this.proctorPc.createAnswer();
        await this.proctorPc.setLocalDescription(answer);

        sendWebSocketMessage('/app/webrtc/' + this.sessionId + '/proctor-answer', {
          sdp: { type: answer.type, sdp: answer.sdp },
        });
      } catch (err) {
        console.warn('[MobilePeer] Error handling proctor offer:', err);
      }
    });
    this.subs.push(unsubOffer);

    const unsubIce = subscribeToTopic('/topic/webrtc/' + this.sessionId + '/ice-proctor-caller', async (payload) => {
      if (this._destroyed || !payload || !payload.candidate) return;
      try {
        const candidate = new RTCIceCandidate(payload.candidate);
        if (!this.proctorPc || !this.proctorPc.remoteDescription) {
          this.proctorIceQueue.push(candidate);
        } else {
          await this.proctorPc.addIceCandidate(candidate);
        }
      } catch (err) {
        console.warn('[MobilePeer] Error adding proctor ICE:', err);
      }
    });
    this.subs.push(unsubIce);
  }

  _createPeerConnection(role) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local stream tracks so remote end receives them
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream);
      });
    }

    // ICE candidate routing
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const dest = role === 'laptop'
          ? '/app/webrtc/' + this.sessionId + '/ice-mobile'
          : '/app/webrtc/' + this.sessionId + '/ice-proctor-mobile';
        sendWebSocketMessage(dest, { candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`[MobilePeer] ${role} connection state:`, state);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(state, role);
      }
      if (state === 'connected') {
        if (this.heartbeatTimer) {
          clearInterval(this.heartbeatTimer);
          this.heartbeatTimer = null;
        }
      } else if (state === 'failed' || state === 'disconnected') {
        // Trigger renegotiation signal after brief pause
        setTimeout(() => {
          if (!this._destroyed) this.notifyReady();
        }, 2000);
      }
    };

    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState;
      console.log(`[MobilePeer] ${role} ICE state:`, iceState);
      if (iceState === 'connected' || iceState === 'completed') {
        if (this.onConnectionStateChange) {
          this.onConnectionStateChange('connected', role);
        }
        if (this.heartbeatTimer) {
          clearInterval(this.heartbeatTimer);
          this.heartbeatTimer = null;
        }
      }
    };

    return pc;
  }

  destroy() {
    this._destroyed = true;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.subs.forEach((unsub) => {
      try { if (typeof unsub === 'function') unsub(); } catch (e) { void e; }
    });
    this.subs = [];
    if (this.pc) {
      try { this.pc.close(); } catch (e) { void e; }
      this.pc = null;
    }
    if (this.proctorPc) {
      try { this.proctorPc.close(); } catch (e) { void e; }
      this.proctorPc = null;
    }
  }
}
