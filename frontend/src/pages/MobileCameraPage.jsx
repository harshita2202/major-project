import { useState, useEffect, useRef, useCallback } from 'react';
import { Smartphone, Camera, Wifi, WifiOff, RotateCcw, AlertCircle, CheckCircle2, SwitchCamera, ShieldCheck, Lock } from 'lucide-react';
import { validatePairingToken, notifyMobileStatus, MobilePeer } from '../services/mobilePeer';
import { getWebSocketClient } from '../services/websocket';

/**
 * MobileCameraPage.jsx
 * ProctorTrack™ — Dual-Camera Proctoring
 *
 * Standalone public page served at /mobile-camera?token=xxx
 * Opened on the candidate's smartphone.
 *
 * Requirements addressed:
 * 1. Works continuously until exam session ends.
 * 2. Uses Screen Wake Lock API to prevent phone sleep/auto-lock.
 * 3. Enforces HTTPS/Secure Context so Safari/Chrome grant camera permissions.
 * 4. Separate clear UI for camera permission vs expired session errors.
 * 5. Automatic WebRTC reconnection on network hiccups.
 */
export default function MobileCameraPage() {
  const [phase, setPhase] = useState('loading'); // loading | validating | permission | streaming | camera_denied | session_expired | insecure_context
  const [tokenInfo, setTokenInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [cameraFacing, setCameraFacing] = useState('environment'); // 'environment' = rear camera
  const [stream, setStream] = useState(null);
  const [connectionState, setConnectionState] = useState('idle');
  const [wakeLockActive, setWakeLockActive] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const peerRef = useRef(null);
  const tokenRef = useRef(null);
  const wakeLockRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Parse token from URL
  const getToken = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token');
  };

  // ── 1. Acquire Screen Wake Lock so phone never dims or locks during the exam ──
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
    // If opened on insecure HTTP on a network IP, camera is blocked by browsers
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
        // Check if mediaDevices API is available
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

  // ── 3. Start camera stream ──
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
      // Primary attempt with preferred facing mode
      let mediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
          },
          audio: false,
        });
      } catch (exactErr) {
        // Fallback to generic video if exact constraints fail
        console.warn('Constraint fallback:', exactErr);
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);

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

  // ── 4. WebRTC Connection Management ──
  const setupWebRTC = useCallback(() => {
    if (!tokenInfo || !stream) return;
    const sessionId = tokenInfo.sessionId;
    const token = tokenRef.current;

    notifyMobileStatus(token, true);

    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    const peer = new MobilePeer(sessionId, stream, {
      onConnectionStateChange: (state, role) => {
        setConnectionState(state);
        if (state === 'failed' || state === 'disconnected') {
          // Auto-reconnect after 2.5 seconds
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[MobileCameraPage] Auto-reconnecting WebRTC...');
            setupWebRTC();
          }, 2500);
        }
      },
    });

    peerRef.current = peer;
    peer.start().catch((err) => {
      console.warn('[MobileCameraPage] Peer start error:', err);
    });
  }, [tokenInfo, stream]);

  useEffect(() => {
    if (phase === 'streaming' && tokenInfo && stream) {
      setupWebRTC();
    }
  }, [phase, tokenInfo, stream, setupWebRTC]);

  // ── 5. Attach video stream to DOM video element ──
  useEffect(() => {
    if (phase === 'streaming' && stream && videoRef.current) {
      const video = videoRef.current;
      video.muted = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      video.play().catch((err) => {
        console.warn('[MobileCameraPage] Local video play error:', err);
      });
    }
  }, [phase, stream]);

  // ── 6. Re-acquire Wake Lock & check connection when app returns to foreground ──
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
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
        videoRef.current.play().catch(() => {});
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

  // Loading & Validation
  if (phase === 'loading' || phase === 'validating') {
    return (
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
    );
  }

  // Session Expired
  if (phase === 'session_expired') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <AlertCircle size={36} color="#f87171" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f87171', margin: '0 0 10px' }}>Session Expired</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13.5px', lineHeight: 1.6 }}>{errorMsg}</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '16px' }}>
            Please click "Refresh QR" on your laptop exam interface to generate a fresh pairing link.
          </p>
        </div>
      </div>
    );
  }

  // Insecure Context Alert (HTTP instead of HTTPS)
  if (phase === 'insecure_context') {
    return (
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
    );
  }

  // Camera Access Denied / Permission Required
  if (phase === 'camera_denied') {
    return (
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
              <li>Tap the <strong>"aA"</strong> or lock icon on the left of the address bar.</li>
              <li>Tap <strong>Website Settings</strong>.</li>
              <li>Set <strong>Camera</strong> to <strong>Allow</strong>.</li>
              <li>Tap the button below to restart camera.</li>
            </ol>
          </div>

          <button
            type="button"
            style={styles.primaryBtn}
            onClick={() => startCamera(cameraFacing)}
          >
            <RotateCcw size={16} /> Allow & Retry Camera
          </button>
        </div>
      </div>
    );
  }

  // Permission Pre-flight Screen
  if (phase === 'permission') {
    return (
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
            onClick={() => startCamera('environment')}
          >
            <Camera size={18} />
            Enable Camera & Start Stream
          </button>
        </div>
      </div>
    );
  }

  // ── Live Streaming Screen ──
  const connOk = connectionState === 'connected';
  return (
    <div style={{ ...styles.container, justifyContent: 'flex-start', padding: 0 }}>
      {/* Full-screen video viewport */}
      <div style={{ position: 'relative', width: '100%', height: '100vh', backgroundColor: '#000' }}>
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          onLoadedMetadata={(e) => {
            e.target.play().catch(() => {});
          }}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />

        {/* Top telemetry bar */}
        <div
          style={{
            position: 'absolute',
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
              backgroundColor: connOk ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
              border: `1px solid ${connOk ? 'rgba(52,211,153,0.4)' : 'rgba(253,224,71,0.4)'}`,
              borderRadius: '9999px',
              padding: '4px 10px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: connOk ? '#34d399' : '#fcd34d',
                display: 'inline-block',
                animation: connOk ? 'blink 1.5s ease-in-out infinite' : 'none',
              }}
            />
            {connOk ? <Wifi size={12} color="#34d399" /> : <RotateCcw size={12} color="#fcd34d" style={{ animation: 'spin 1s linear infinite' }} />}
            <span style={{ fontSize: '11px', fontWeight: 700, color: connOk ? '#34d399' : '#fcd34d' }}>
              {connOk ? 'LIVE SESSION' : 'SYNCING...'}
            </span>
          </div>
        </div>

        {/* Keep Alive & Screen On indicator */}
        <div
          style={{
            position: 'absolute',
            bottom: '90px',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <span
            style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.85)',
              backgroundColor: 'rgba(10,28,48,0.7)',
              backdropFilter: 'blur(6px)',
              padding: '5px 14px',
              borderRadius: '9999px',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ShieldCheck size={13} color="#26c6da" />
            {wakeLockActive ? 'Screen lock disabled · Streaming live' : 'Keep this page open during your exam'}
          </span>
        </div>

        {/* Bottom controls */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '20px',
            background: 'linear-gradient(to top, rgba(7,21,36,0.85), transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            zIndex: 10,
          }}
        >
          <button
            type="button"
            onClick={switchCamera}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255,255,255,0.14)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: '10px',
              padding: '10px 18px',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              backdropFilter: 'blur(4px)',
            }}
          >
            <SwitchCamera size={16} />
            Switch Camera
          </button>
        </div>
      </div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
