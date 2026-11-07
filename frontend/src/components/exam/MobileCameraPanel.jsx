import { useState, useEffect, useRef, useCallback } from 'react';
import { Smartphone, QrCode, Wifi, WifiOff, RotateCcw, AlertCircle, Copy, Check } from 'lucide-react';
import {
  generateMobilePairingToken,
  LaptopMobileWebRTC,
  subscribeToMobileCameraStatus,
} from '../../services/mobileCamera';

/**
 * MobileCameraPanel.jsx
 * ProctorTrack™ — Dual-Camera Proctoring
 *
 * Shows QR code pairing UI and mobile camera video feed on the student exam page.
 *
 * Props:
 *   sessionId      string  — Current exam session ID
 *   examId         string
 *   candidateId    string
 *   candidateName  string
 *   isActive       bool    — Only connect when exam is active
 */
export default function MobileCameraPanel({
  sessionId,
  examId,
  candidateId,
  candidateName,
  isActive = false,
}) {
  const [pairingData, setPairingData] = useState(null); // { token, pairingUrl }
  const [mobileConnected, setMobileConnected] = useState(false);
  const [webrtcState, setWebrtcState] = useState('idle'); // 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed'
  const [remoteStream, setRemoteStream] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [copied, setCopied] = useState(false);

  const videoRef = useRef(null);
  const webrtcRef = useRef(null);
  const statusUnsubRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  // Generate QR code data URL using Canvas (no external lib needed)
  const generateQRDataUrl = useCallback(async (url) => {
    const encodedUrl = encodeURIComponent(url);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedUrl}`;
  }, []);

  const startPairing = useCallback(async () => {
    if (!sessionId || !isActive) return;
    setIsGenerating(true);
    setError(null);
    try {
      const data = await generateMobilePairingToken(sessionId, examId, candidateId, candidateName);
      setPairingData(data);
      const qrUrl = await generateQRDataUrl(data.pairingUrl);
      setQrDataUrl(qrUrl);
    } catch (err) {
      setError('Failed to generate QR code. Please retry.');
      console.warn('[MobileCameraPanel] Pairing error:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [sessionId, examId, candidateId, candidateName, isActive, generateQRDataUrl]);

  // Auto-start pairing when exam becomes active
  useEffect(() => {
    if (isActive && sessionId && !pairingData) {
      startPairing();
    }
  }, [isActive, sessionId, pairingData, startPairing]);

  // Subscribe to mobile connection status from WebSocket
  useEffect(() => {
    if (!sessionId || !isActive) return;
    const unsub = subscribeToMobileCameraStatus(sessionId, (status) => {
      setMobileConnected(status.mobileConnected);
      if (status.mobileConnected) {
        setWebrtcState('connecting');
        // Trigger WebRTC offer if mobile just connected
        if (webrtcRef.current) {
          webrtcRef.current.renegotiate().catch(() => {});
        }
      } else {
        setWebrtcState('disconnected');
      }
    });
    statusUnsubRef.current = unsub;
    return () => { if (statusUnsubRef.current) statusUnsubRef.current(); };
  }, [sessionId, isActive]);

  // Start WebRTC when we have a session and mobile becomes connected
  useEffect(() => {
    if (!sessionId || !mobileConnected || !isActive) return;

    // Cleanup any previous connection
    if (webrtcRef.current) {
      webrtcRef.current.destroy();
      webrtcRef.current = null;
    }

    const webrtc = new LaptopMobileWebRTC(sessionId, {
      onRemoteStream: (stream) => {
        setRemoteStream(stream);
        setWebrtcState('connected');
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      },
      onConnectionStateChange: (state) => {
        if (state === 'connected') setWebrtcState('connected');
        else if (state === 'failed' || state === 'disconnected') {
          setWebrtcState('disconnected');
          // Attempt reconnect after 3 seconds
          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = setTimeout(() => {
            if (webrtcRef.current) webrtcRef.current.renegotiate().catch(() => {});
          }, 3000);
        }
      },
      onIceConnectionState: (state) => {
        if (state === 'checking') setWebrtcState('connecting');
      },
    });

    webrtcRef.current = webrtc;
    webrtc.start().catch((err) => {
      console.warn('[MobileCameraPanel] WebRTC start error:', err);
      setWebrtcState('failed');
    });

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      webrtc.destroy();
    };
  }, [sessionId, mobileConnected, isActive]);

  // Ensure video element receives remoteStream whenever available
  useEffect(() => {
    if (remoteStream && videoRef.current) {
      if (videoRef.current.srcObject !== remoteStream) {
        videoRef.current.srcObject = remoteStream;
      }
      videoRef.current.play().catch((err) => console.warn('[MobileCameraPanel] Play warning:', err));
    }
  }, [remoteStream, webrtcState, mobileConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (webrtcRef.current) webrtcRef.current.destroy();
      if (statusUnsubRef.current) statusUnsubRef.current();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, []);

  const handleCopyLink = () => {
    if (pairingData?.pairingUrl) {
      navigator.clipboard.writeText(pairingData.pairingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const statusColor = mobileConnected && webrtcState === 'connected'
    ? '#22c55e'
    : mobileConnected
    ? '#f59e0b'
    : '#94a3b8';

  const statusText = mobileConnected && webrtcState === 'connected'
    ? 'Mobile Camera Live'
    : mobileConnected && webrtcState === 'connecting'
    ? 'Establishing Stream...'
    : mobileConnected
    ? 'Mobile Connected'
    : 'Awaiting Mobile';

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Smartphone size={14} color="var(--pt-navy-800)" />
          <span
            style={{
              fontSize: '12px',
              fontWeight: 800,
              color: 'var(--pt-navy-800)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Secondary Camera
          </span>
          <span
            style={{
              fontSize: '9px',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '9999px',
              backgroundColor: mobileConnected ? '#dcfce7' : '#f1f5f9',
              color: mobileConnected ? '#16a34a' : '#64748b',
              border: `1px solid ${mobileConnected ? '#86efac' : '#e2e8f0'}`,
            }}
          >
            Mobile Phone
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {!mobileConnected && (
            <button
              type="button"
              onClick={startPairing}
              disabled={isGenerating}
              style={{
                fontSize: '10.5px',
                color: 'var(--pt-teal-700)',
                background: 'none',
                border: 'none',
                cursor: isGenerating ? 'wait' : 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <RotateCcw size={11} />
              {isGenerating ? 'Generating...' : 'Refresh QR'}
            </button>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div
        style={{
          position: 'relative',
          backgroundColor: '#0a1c30',
          aspectRatio: '16/9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Live mobile video (PiP & fullscreen disabled so browser overlay cannot steal focus) */}
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          disablePictureInPicture
          controlsList="nodownload nofullscreen noremoteplayback"
          onLoadedMetadata={(e) => {
            e.target.play().catch(() => {});
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            pointerEvents: 'none',
            display: mobileConnected && webrtcState === 'connected' ? 'block' : 'none',
          }}
        />

        {/* QR Code pairing UI (shown when not connected) */}
        {!mobileConnected && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              padding: '14px',
              zIndex: 2,
            }}
          >
            {error ? (
              <div style={{ textAlign: 'center' }}>
                <AlertCircle size={24} color="#f87171" style={{ marginBottom: '6px' }} />
                <div style={{ fontSize: '11px', color: '#f87171' }}>{error}</div>
                <button
                  type="button"
                  onClick={startPairing}
                  style={{
                    marginTop: '8px',
                    fontSize: '11px',
                    color: '#26c6da',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(38,198,218,0.3)',
                    borderRadius: '6px',
                    padding: '4px 12px',
                    cursor: 'pointer',
                  }}
                >
                  Retry
                </button>
              </div>
            ) : qrDataUrl ? (
              <>
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '10px',
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={qrDataUrl}
                    alt="Mobile camera pairing QR code"
                    style={{ width: '95px', height: '95px' }}
                  />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: 700, marginBottom: '2px' }}>
                    <QrCode size={11} style={{ marginRight: '4px', verticalAlign: '-1px' }} />
                    Scan with your phone
                  </div>
                  <div style={{ fontSize: '9px', color: 'rgba(142,174,201,0.8)', maxWidth: '200px', lineHeight: 1.3 }}>
                    Connect phone to same Wi-Fi / Hotspot
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <Smartphone size={28} color="rgba(38,198,218,0.5)" style={{ marginBottom: '6px' }} />
                <div style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: 600 }}>
                  {isGenerating ? 'Generating QR Code...' : 'Secondary Camera'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Connecting spinner overlay */}
        {mobileConnected && webrtcState === 'connecting' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(10, 28, 48, 0.85)',
              zIndex: 4,
            }}
          >
            <RotateCcw size={22} color="#26c6da" style={{ animation: 'rec-spin 1s linear infinite' }} />
            <div style={{ fontSize: '11px', color: '#e2e8f0', marginTop: '8px', fontWeight: 600 }}>
              Establishing stream...
            </div>
          </div>
        )}

        {/* Status badge */}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            backgroundColor: 'rgba(10, 28, 48, 0.8)',
            padding: '3px 8px',
            borderRadius: '9999px',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255,255,255,0.1)',
            zIndex: 5,
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: statusColor,
              display: 'inline-block',
              animation: mobileConnected && webrtcState === 'connected' ? 'rec-blink 1.5s ease-in-out infinite' : 'none',
            }}
          />
          <span style={{ fontSize: '9px', color: statusColor, fontWeight: 700, letterSpacing: '0.06em' }}>
            {mobileConnected && webrtcState === 'connected' ? 'MOBILE LIVE' : 'STANDBY'}
          </span>
        </div>
      </div>

      {/* Footer status bar */}
      <div
        style={{
          padding: '9px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 500 }}>
          Mobile Phone
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: statusColor,
              display: 'inline-block',
            }}
          />
          {mobileConnected ? (
            <Wifi size={11} color={webrtcState === 'connected' ? '#16a34a' : '#d97706'} />
          ) : (
            <WifiOff size={11} color="#94a3b8" />
          )}
          <span
            style={{
              fontSize: '11px',
              color: mobileConnected && webrtcState === 'connected'
                ? '#16a34a'
                : mobileConnected
                ? '#d97706'
                : '#94a3b8',
              fontWeight: 700,
            }}
          >
            {statusText}
          </span>
        </div>
      </div>

      {/* Direct link & copy helper */}
      {pairingData && !mobileConnected && (
        <div
          style={{
            padding: '0 14px 10px',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: '#fafbfc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
              Direct URL for mobile browser:
            </span>
            <button
              type="button"
              onClick={handleCopyLink}
              style={{
                background: 'none',
                border: 'none',
                color: copied ? '#16a34a' : 'var(--pt-teal-700)',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              {copied ? <Check size={10} /> : <Copy size={10} />}
              {copied ? 'Copied' : 'Copy Link'}
            </button>
          </div>
          <div
            style={{
              fontSize: '9px',
              color: 'var(--pt-teal-800)',
              wordBreak: 'break-all',
              backgroundColor: '#f0fdf4',
              padding: '5px 7px',
              borderRadius: '5px',
              border: '1px solid #bbf7d0',
              fontFamily: 'monospace',
              lineHeight: 1.3,
            }}
          >
            {pairingData.pairingUrl}
          </div>
        </div>
      )}

      <style>{`
        @keyframes rec-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        @keyframes rec-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
