import { useState, useEffect, useRef, useCallback } from 'react';
import { Smartphone, Camera, Wifi, WifiOff, RotateCcw, AlertCircle, CheckCircle2, SwitchCamera, ShieldCheck, Lock, Play } from 'lucide-react';
import { validatePairingToken, notifyMobileStatus, MobilePeer } from '../services/mobilePeer';
import { getWebSocketClient, sendWebSocketMessage } from '../services/websocket';

/**
 * MobileCameraPage.jsx
 * ProctorTrack™ — Dual-Camera Proctoring
 *
 * Standalone public page served at /mobile-camera?token=xxx
 * Opened on the candidate's smartphone.
 */
export default function MobileCameraPage() {
  const [phase, setPhase] = useState('loading'); // loading | validating | permission | streaming | camera_denied | session_expired | insecure_context
  const [tokenInfo, setTokenInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [cameraFacing, setCameraFacing] = useState('environment'); // 'environment' = rear camera
  const [stream, setStream] = useState(null);
  const [connectionState, setConnectionState] = useState('idle');
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const peerRef = useRef(null);
  const tokenRef = useRef(null);
  const wakeLockRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const framesSentRef = useRef(0);
  const webRtcInitializedRef = useRef(false);

  // Parse token from URL
  const getToken = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token');
  };

  // ── 1. Screen Wake Lock ──
  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setWakeLockActive(true);
        wakeLockRef.current.addEventListener('release', () => {
          setWakeLockActive(false);
        });
      }
    } catch (err) {
      console.warn('[MobileCameraPage] WakeLock notice:', err);
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }
  }, []);

  // ── 2. Validate token on mount & verify Secure Context ──
  useEffect(() => {
    if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      const httpsUrl = window.location.href.replace('http:', 'https:');
      window.location.href = httpsUrl;
      return;
    }

    const token = getToken();
    if (!token) {
      setPhase('session_expired');
      setErrorMsg('No pairing token found in URL. Please scan the QR code from the examination interface.');
      return;
    }
    tokenRef.current = token;

    setPhase('validating');
    validatePairingToken(token)
      .then((info) => {
        setTokenInfo(info);
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setPhase('insecure_context');
          setErrorMsg('Camera API requires a Secure Context (HTTPS).');
          return;
        }
        setPhase('permission');
      })
      .catch((err) => {
        setPhase('session_expired');
        setErrorMsg(err.message || 'The exam pairing token is invalid or has expired. Please refresh the QR code on your exam laptop.');
      });
  }, []);

  // ── 3. Start Camera Stream ──
  const startCamera = useCallback(async (facing = 'environment') => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPhase('insecure_context');
      return null;
    }

    try {
      let mediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing ? { ideal: facing } : 'environment',
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });
      } catch (exactErr) {
        console.warn('Constraint fallback:', exactErr);
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);

      // Bind directly to video element
      if (videoRef.current) {
        const video = videoRef.current;
        video.muted = true;
        video.defaultMuted = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.srcObject = mediaStream;
        video.onloadedmetadata = () => {
          video.play().then(() => setVideoPlaying(true)).catch((e) => console.warn('play error on metadata:', e));
        };
        video.play().then(() => setVideoPlaying(true)).catch(() => {});
      }

      setPhase('streaming');
      requestWakeLock();
      return mediaStream;
    } catch (err) {
      console.error('[MobileCameraPage] Camera error:', err);
      let msg = 'Camera access was denied by your browser.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera permissions in Safari / browser settings to continue.';
      } else if (err.name === 'NotFoundError') {
        msg = 'No camera hardware found on this device.';
      } else if (err.name === 'NotReadableError') {
        msg = 'Camera is currently in use by another application. Please close other camera apps.';
      }
      setErrorMsg(msg);
      setPhase('camera_denied');
      return null;
    }
  }, [requestWakeLock]);

  // Synchronous user gesture trigger for iOS Safari
  const handleStartCameraClick = () => {
    startCamera(cameraFacing);
  };

  // ── 4. WebRTC Connection Management ──
  const setupWebRTC = useCallback(() => {
    if (!tokenInfo || !streamRef.current) return;
    const sessionId = tokenInfo.sessionId;
    const token = tokenRef.current;

    notifyMobileStatus(token, true);

    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    const peer = new MobilePeer(sessionId, streamRef.current, {
      onConnectionStateChange: (state) => {
        setConnectionState(state);
      },
    });

    peerRef.current = peer;
    peer.start().catch((err) => {
      console.warn('[MobileCameraPage] Peer start error:', err);
    });
  }, [tokenInfo]);

  useEffect(() => {
    if (phase === 'streaming' && tokenInfo && stream && !webRtcInitializedRef.current) {
      webRtcInitializedRef.current = true;
      setupWebRTC();
    }
  }, [phase, tokenInfo, stream, setupWebRTC]);

  // ── 5. Ensure local video plays ──
  useEffect(() => {
    if (phase === 'streaming' && stream && videoRef.current) {
      const video = videoRef.current;
      if (video.srcObject !== stream) {
        video.srcObject = stream;
        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
      }
      video.play().then(() => setVideoPlaying(true)).catch((err) => {
        console.warn('[MobileCameraPage] Local video play error:', err);
      });
    }
  }, [phase, stream]);

  // ── 5b. Continuous Live Frame Fallback Transmission ──
  useEffect(() => {
    if (phase !== 'streaming' || !tokenInfo || !tokenInfo.sessionId) return;
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');

    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video) return;

      if (video.videoWidth > 0 && video.videoHeight > 0 && !video.paused) {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frameData = canvas.toDataURL('image/jpeg', 0.4);
          sendWebSocketMessage('/app/webrtc/' + tokenInfo.sessionId + '/frame', {
            image: frameData,
            timestamp: Date.now(),
          });
          framesSentRef.current += 1;
        } catch (e) {
          // ignore frame drawing exception
        }
      }
    }, 125);

    return () => clearInterval(interval);
  }, [phase, tokenInfo]);

  // ── 6. Re-acquire Wake Lock & check connection when app returns to foreground ──
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
        if (videoRef.current) {
          videoRef.current.play().then(() => setVideoPlaying(true)).catch(() => {});
        }
        if (phase === 'streaming' && tokenRef.current) {
          notifyMobileStatus(tokenRef.current, true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    const handleUnload = () => {
      if (tokenRef.current) notifyMobileStatus(tokenRef.current, false);
      releaseWakeLock();
    };
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      handleUnload();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (peerRef.current) peerRef.current.destroy();
    };
  }, [phase, requestWakeLock, releaseWakeLock]);

  // ── 7. Flip camera ──
  const switchCamera = useCallback(async () => {
    const newFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(newFacing);
    const newStream = await startCamera(newFacing);
    if (newStream) {
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play().then(() => setVideoPlaying(true)).catch(() => {});
      }
      if (peerRef.current) {
        peerRef.current.updateStream(newStream);
      }
    }
  }, [cameraFacing, startCamera]);

  // ── Styles ──
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#071524',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#ffffff',
      position: 'relative',
    },
    card: {
      backgroundColor: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '16px',
      padding: '28px 24px',
      width: '100%',
      maxWidth: '420px',
      backdropFilter: 'blur(12px)',
      textAlign: 'center',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      zIndex: 10,
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      marginBottom: '18px',
    },
    title: {
      fontSize: '20px',
      fontWeight: 800,
      color: '#ffffff',
      margin: 0,
      letterSpacing: '-0.02em',
    },
    subtitle: {
      fontSize: '13px',
      color: 'rgba(255,255,255,0.65)',
      marginTop: '4px',
      marginBottom: '20px',
      lineHeight: 1.5,
    },
    primaryBtn: {
      width: '100%',
      padding: '14px 20px',
      borderRadius: '12px',
      border: 'none',
      backgroundColor: '#0d9488',
      color: '#ffffff',
      fontSize: '15px',
      fontWeight: 700,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      boxShadow: '0 4px 14px rgba(13, 148, 136, 0.4)',
    },
  };

  const isStreaming = phase === 'streaming';
  const connOk = connectionState === 'connected' || Boolean(stream);

  return (
    <div style={{ ...styles.container, justifyContent: 'flex-start', padding: 0, overflow: 'hidden' }}>
      {/* 
        CRITICAL FOR IOS SAFARI:
        The video element is ALWAYS mounted in the DOM to prevent WebKit autoplay blocking!
      */}
      <video
        ref={videoRef}
        playsInline
        webkit-playsinline="true"
        autoPlay
        muted
        onPlaying={() => setVideoPlaying(true)}
        onClick={() => {
          if (videoRef.current) {
            videoRef.current.play().then(() => setVideoPlaying(true)).catch(() => {});
          }
        }}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          backgroundColor: '#000',
          zIndex: 1,
        }}
      />

      {/* Loading & Validation State */}
      {(phase === 'loading' || phase === 'validating') && (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.header}>
              <Smartphone size={28} color="#26c6da" />
              <h1 style={styles.title}>ProctorTrack</h1>
            </div>
            <RotateCcw size={32} color="#26c6da" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
              {phase === 'validating' ? 'Verifying examination session…' : 'Connecting…'}
            </p>
          </div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Session Expired State */}
      {phase === 'session_expired' && (
        <div style={styles.container}>
          <div style={styles.card}>
            <AlertCircle size={36} color="#f87171" style={{ margin: '0 auto 12px' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f87171', margin: '0 0 10px' }}>Session Expired</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13.5px', lineHeight: 1.6 }}>{errorMsg}</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '16px' }}>
              Please click &quot;Refresh QR&quot; on your laptop exam interface to generate a fresh pairing link.
            </p>
          </div>
        </div>
      )}

      {/* Insecure Context Alert */}
      {phase === 'insecure_context' && (
        <div style={styles.container}>
          <div style={styles.card}>
            <Lock size={36} color="#f59e0b" style={{ margin: '0 auto 12px' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fbbf24', margin: '0 0 10px' }}>HTTPS Required</h2>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13.5px', lineHeight: 1.6 }}>
              Mobile web browsers strictly require a secure HTTPS connection to access the camera hardware.
            </p>
            <button
              type="button"
              style={{ ...styles.primaryBtn, marginTop: '20px' }}
              onClick={() => {
                window.location.href = window.location.href.replace('http:', 'https:');
              }}
            >
              Switch to Secure HTTPS Connection
            </button>
          </div>
        </div>
      )}

      {/* Camera Denied State */}
      {phase === 'camera_denied' && (
        <div style={styles.container}>
          <div style={styles.card}>
            <Camera size={36} color="#f87171" style={{ margin: '0 auto 12px' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f87171', margin: '0 0 10px' }}>Camera Permission Needed</h2>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px', lineHeight: 1.6, marginBottom: '16px' }}>
              {errorMsg}
            </p>

            <div
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: '10px',
                padding: '14px',
                textAlign: 'left',
                marginBottom: '20px',
                fontSize: '12.5px',
                color: 'rgba(255,255,255,0.8)',
                lineHeight: 1.5,
              }}
            >
              <strong>How to allow on iPhone Safari:</strong>
              <ol style={{ margin: '8px 0 0', paddingLeft: '18px' }}>
                <li>Tap the <strong>&quot;aA&quot;</strong> or lock icon on the left of the address bar.</li>
                <li>Tap <strong>Website Settings</strong>.</li>
                <li>Set <strong>Camera</strong> to <strong>Allow</strong>.</li>
                <li>Tap the button below to restart camera.</li>
              </ol>
            </div>

            <button
              type="button"
              style={styles.primaryBtn}
              onClick={handleStartCameraClick}
            >
              <RotateCcw size={16} /> Allow & Retry Camera
            </button>
          </div>
        </div>
      )}

      {/* Permission Pre-flight Screen */}
      {phase === 'permission' && (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.header}>
              <Smartphone size={24} color="#26c6da" />
              <h1 style={styles.title}>ProctorTrack</h1>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: 700,
                  backgroundColor: 'rgba(16,185,129,0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(52,211,153,0.3)',
                }}
              >
                <CheckCircle2 size={13} /> Active Session Verified
              </span>
            </div>
            <p style={styles.subtitle}>
              {tokenInfo?.candidateName && `Welcome, ${tokenInfo.candidateName}! `}
              Connect your phone as a secondary camera for your online examination.
            </p>

            <div
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '22px',
                textAlign: 'left',
              }}
            >
              {[
                'Streams live rear camera to laptop session',
                'Screen will stay awake during the examination',
                'No video recording is stored',
                'Encrypted peer-to-peer transmission',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', marginBottom: i < 3 ? '10px' : 0 }}>
                  <CheckCircle2 size={14} color="#34d399" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>{item}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              style={styles.primaryBtn}
              onClick={handleStartCameraClick}
            >
              <Camera size={18} />
              Enable Camera & Start Stream
            </button>
          </div>
        </div>
      )}

      {/* Live Streaming Overlays (visible on top of video element) */}
      {isStreaming && (
        <>
          {/* Top telemetry bar */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              padding: '18px 20px',
              background: 'linear-gradient(to bottom, rgba(7,21,36,0.85), transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Smartphone size={16} color="#26c6da" />
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>Secondary Camera Feed</span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'rgba(16,185,129,0.2)',
                border: '1px solid rgba(52,211,153,0.4)',
                borderRadius: '9999px',
                padding: '4px 10px',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#34d399',
                  display: 'inline-block',
                  animation: 'blink 1.5s ease-in-out infinite',
                }}
              />
              <Wifi size={12} color="#34d399" />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#34d399' }}>
                {connectionState === 'connected' ? 'LIVE STREAMING (HD)' : 'LIVE STREAMING'}
              </span>
            </div>
          </div>

          {/* Pause overlay warning if iOS paused playback */}
          {!videoPlaying && (
            <div
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.play().then(() => setVideoPlaying(true)).catch(() => {});
                }
              }}
              style={{
                position: 'fixed',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.7)',
                zIndex: 8,
                cursor: 'pointer',
              }}
            >
              <Play size={48} color="#26c6da" style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Tap Screen to Resume Video</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '6px' }}>Safari requires a tap to start video playback</div>
            </div>
          )}

          {/* Keep Alive & Screen On indicator */}
          <div
            style={{
              position: 'fixed',
              bottom: '90px',
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'rgba(7,21,36,0.75)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.15)',
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '11.5px',
                color: 'rgba(255,255,255,0.85)',
                fontWeight: 600,
              }}
            >
              <ShieldCheck size={13} color="#26c6da" />
              <span>Keep this page open during your exam</span>
            </div>
          </div>

          {/* Bottom Controls Bar */}
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '16px 20px',
              background: 'linear-gradient(to top, rgba(7,21,36,0.9), transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              zIndex: 10,
            }}
          >
            <button
              type="button"
              onClick={switchCamera}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#ffffff',
                padding: '10px 18px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <SwitchCamera size={16} />
              Switch Camera
            </button>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
