import { useState, useEffect, useRef } from 'react';
import { Smartphone, Wifi, WifiOff, RotateCcw, Video } from 'lucide-react';
import { subscribeToTopic, sendWebSocketMessage } from '../../services/websocket';

const ICE_SERVERS = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
];

/**
 * MobileCameraFeed.jsx
 * ProctorTrack™ — Dual-Camera Proctoring
 *
 * Proctor-side component that opens a WebRTC viewer connection to see the
 * student's mobile camera feed. Displayed inside CandidateDetailModal.
 *
 * Props:
 *   sessionId      string  — The exam session ID
 *   mobileConnected bool   — Whether mobile is currently connected
 *   candidateName  string
 */
export default function MobileCameraFeed({ sessionId, mobileConnected, candidateName }) {
  const [viewerState, setViewerState] = useState('idle'); // idle | connecting | connected | failed
  const [isViewing, setIsViewing] = useState(false);
  const [fallbackFrame, setFallbackFrame] = useState(null);

  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const subsRef = useRef([]);
  const iceQueueRef = useRef([]);

  const stopViewer = () => {
    subsRef.current.forEach((unsub) => { try { if (typeof unsub === 'function') unsub(); } catch (e) { void e; } });
    subsRef.current = [];
    iceQueueRef.current = [];
    if (pcRef.current) {
      try { pcRef.current.close(); } catch (e) { void e; }
      pcRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setViewerState('idle');
    setIsViewing(false);
  };

  const startViewer = async () => {
    if (!sessionId || !mobileConnected) return;
    stopViewer();
    setIsViewing(true);
    setViewerState('connecting');

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;
    iceQueueRef.current = [];

    pc.ontrack = (event) => {
      let stream = event.streams && event.streams[0];
      if (!stream) {
        stream = new MediaStream([event.track]);
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
        setViewerState('connected');
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') setViewerState('connected');
      else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        setViewerState('failed');
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      if (state === 'connected' || state === 'completed') {
        setViewerState('connected');
      }
    };

    // Subscribe to proctor-answer from mobile
    const unsubAnswer = subscribeToTopic('/topic/webrtc/' + sessionId + '/proctor-answer', async (payload) => {
      if (!pcRef.current || !payload || !payload.sdp) return;
      try {
        const answer = new RTCSessionDescription(payload.sdp);
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(answer);

          while (iceQueueRef.current.length > 0) {
            const candidate = iceQueueRef.current.shift();
            try {
              await pc.addIceCandidate(candidate);
            } catch (err) {
              console.warn('[MobileCameraFeed] Flush ICE error:', err);
            }
          }
        }
      } catch (e) {
        console.warn('[MobileCameraFeed] Answer error:', e);
      }
    });
    subsRef.current.push(unsubAnswer);

    // Subscribe to ICE from mobile (proctor path)
    const unsubIce = subscribeToTopic('/topic/webrtc/' + sessionId + '/ice-proctor-mobile', async (payload) => {
      if (!payload || !payload.candidate) return;
      try {
        const candidate = new RTCIceCandidate(payload.candidate);
        if (!pc || !pc.remoteDescription) {
          iceQueueRef.current.push(candidate);
        } else {
          await pc.addIceCandidate(candidate);
        }
      } catch (e) {
        console.warn('[MobileCameraFeed] ICE error:', e);
      }
    });
    subsRef.current.push(unsubIce);

    // ICE candidates to send to mobile
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendWebSocketMessage('/app/webrtc/' + sessionId + '/ice-proctor-caller', { candidate: event.candidate });
      }
    };

    // Create offer (receive-only)
    try {
      pc.addTransceiver('video', { direction: 'recvonly' });
    } catch (e) {
      console.warn('[MobileCameraFeed] addTransceiver warning:', e);
    }

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendWebSocketMessage('/app/webrtc/' + sessionId + '/proctor-offer', {
        sdp: { type: offer.type, sdp: offer.sdp },
      });
    } catch (err) {
      console.warn('[MobileCameraFeed] Offer creation error:', err);
      setViewerState('failed');
    }
  };

  // Subscribe to live fallback frame stream from mobile
  useEffect(() => {
    if (!sessionId) return;
    const unsub = subscribeToTopic('/topic/webrtc/' + sessionId + '/frame', (data) => {
      if (data && data.image) {
        setFallbackFrame(data.image);
      }
    });
    return () => { if (unsub) unsub(); };
  }, [sessionId]);

  // Stop viewer when mobile disconnects
  useEffect(() => {
    if (!mobileConnected && isViewing) {
      setViewerState('idle');
      setIsViewing(false);
    }
  }, [mobileConnected, isViewing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopViewer(); };
  }, []);

  const stateColor = {
    idle: '#94a3b8',
    connecting: '#f59e0b',
    connected: '#22c55e',
    failed: '#ef4444',
  }[viewerState] || '#94a3b8';

  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: '#0a1c30',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#0f2740',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Smartphone size={13} color="#26c6da" />
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Mobile Camera
          </span>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: mobileConnected ? '#22c55e' : '#94a3b8',
              display: 'inline-block',
              animation: mobileConnected ? 'blink 1.5s ease-in-out infinite' : 'none',
            }}
          />
          <span style={{ fontSize: '10px', color: mobileConnected ? '#22c55e' : '#94a3b8', fontWeight: 600 }}>
            {mobileConnected ? 'Mobile Connected' : 'Not Connected'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {mobileConnected && !isViewing && (
            <button
              type="button"
              onClick={startViewer}
              style={{
                fontSize: '10px',
                color: '#26c6da',
                background: 'rgba(38,198,218,0.1)',
                border: '1px solid rgba(38,198,218,0.3)',
                borderRadius: '6px',
                padding: '3px 10px',
                cursor: 'pointer',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Video size={10} /> View Feed
            </button>
          )}
          {isViewing && (
            <button
              type="button"
              onClick={stopViewer}
              style={{
                fontSize: '10px',
                color: '#f87171',
                background: 'rgba(248,113,113,0.1)',
                border: '1px solid rgba(248,113,113,0.3)',
                borderRadius: '6px',
                padding: '3px 10px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Video area */}
      <div
        style={{
          position: 'relative',
          aspectRatio: '16/9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Live Fallback Frame from Mobile WebSocket */}
        {fallbackFrame && (
          <img
            src={fallbackFrame}
            alt="Mobile Secondary Feed"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              position: 'absolute',
              inset: 0,
              zIndex: 2,
            }}
          />
        )}

        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            inset: 0,
            zIndex: 3,
            display: viewerState === 'connected' ? 'block' : 'none',
          }}
        />

        {/* Placeholder when not viewing and no fallback frame */}
        {viewerState !== 'connected' && !fallbackFrame && (
          <div style={{ textAlign: 'center', padding: '16px', color: '#e2e8f0' }}>
            {viewerState === 'connecting' ? (
              <>
                <RotateCcw size={24} color="#26c6da" style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Connecting to mobile camera...</div>
              </>
            ) : viewerState === 'failed' ? (
              <>
                <WifiOff size={24} color="#f87171" style={{ marginBottom: '8px' }} />
                <div style={{ fontSize: '11px', color: '#f87171', marginBottom: '8px' }}>Connection failed</div>
                {mobileConnected && (
                  <button
                    type="button"
                    onClick={startViewer}
                    style={{
                      fontSize: '10px',
                      color: '#26c6da',
                      background: 'none',
                      border: '1px solid rgba(38,198,218,0.3)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      cursor: 'pointer',
                    }}
                  >
                    Retry
                  </button>
                )}
              </>
            ) : mobileConnected ? (
              <>
                <Wifi size={24} color="#22c55e" style={{ marginBottom: '8px' }} />
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
                  Mobile camera connected
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Click "View Feed" to see stream</div>
              </>
            ) : (
              <>
                <Smartphone size={24} color="rgba(148,163,184,0.5)" style={{ marginBottom: '8px' }} />
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                  Awaiting mobile connection
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                  Student must scan QR code on exam screen
                </div>
              </>
            )}
          </div>
        )}

        {/* Status badge */}
        {isViewing && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'rgba(10,28,48,0.8)',
              padding: '2px 7px',
              borderRadius: '9999px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <span
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                backgroundColor: stateColor,
                display: 'inline-block',
                animation: viewerState === 'connected' ? 'blink 1.5s ease-in-out infinite' : 'none',
              }}
            />
            <span style={{ fontSize: '8px', color: stateColor, fontWeight: 700 }}>
              {viewerState === 'connected' ? 'MOBILE LIVE' : viewerState.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

