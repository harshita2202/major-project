import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Smartphone,
  QrCode,
  Wifi,
  WifiOff,
  RotateCcw,
  AlertCircle,
  Copy,
  Check,
  CheckCircle2,
} from 'lucide-react';
import QRCode from 'qrcode';
import { subscribeToTopic } from '../../services/websocket';
import {
  generateMobilePairingToken,
  LaptopMobileWebRTC,
  subscribeToMobileCameraStatus,
  getMobileConnectionStatus,
} from '../../services/mobileCamera';

// Module-level cache keyed by sessionId so transitioning from the Instructions screen
// (mode="pair") to the Active Exam screen (mode="monitor") preserves the live stream seamlessly.
const mobileSessionCache = new Map();

function getCachedSession(sessionId) {
  if (!sessionId) return null;
  return mobileSessionCache.get(sessionId) || null;
}

function updateCachedSession(sessionId, patch) {
  if (!sessionId) return;
  const prev = mobileSessionCache.get(sessionId) || {};
  mobileSessionCache.set(sessionId, { ...prev, ...patch });
}

/**
 * MobileCameraPanel.jsx
 * ProctorTrack™ — Dual-Camera Proctoring
 *
 * Supports two modes:
 * - mode="pair": Pre-exam QR code pairing & live preview card on the Instructions screen.
 * - mode="monitor": Live secondary camera video feed in the exam sidebar (no QR code).
 *
 * Props:
 *   mode           'pair' | 'monitor' (default: 'monitor')
 *   sessionId      string  — Shared session/candidate ID
 *   examId         string
 *   candidateId    string
 *   candidateName  string
 *   isActive       bool    — Whether connection listeners should be active
 */
export default function MobileCameraPanel({
  mode = 'monitor',
  sessionId,
  examId,
  candidateId,
  candidateName,
  isActive = false,
}) {
  const cached = getCachedSession(sessionId);

  const [pairingData, setPairingData] = useState(() => cached?.pairingData || null);
  const [mobileConnected, setMobileConnected] = useState(() => cached?.mobileConnected || false);
  const [webrtcState, setWebrtcState] = useState(() =>
    cached?.mobileConnected ? 'connected' : 'idle'
  ); // 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed'
  const [remoteStream, setRemoteStream] = useState(null);
  const [remotePlaying, setRemotePlaying] = useState(false);
  const [fallbackFrame, setFallbackFrame] = useState(() => cached?.fallbackFrame || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(() => cached?.qrDataUrl || null);
  const [copied, setCopied] = useState(false);

  const videoRef = useRef(null);
  const webrtcRef = useRef(null);
  const statusUnsubRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const fallbackFrameRef = useRef(fallbackFrame);

  useEffect(() => {
    fallbackFrameRef.current = fallbackFrame;
  }, [fallbackFrame]);

  // Generate QR code data URL using local QRCode library (100% offline, zero network requests)
  const generateQRDataUrl = useCallback(async (url) => {
    try {
      return await QRCode.toDataURL(url, {
        width: 220,
        margin: 1,
        color: { dark: '#0a1c30', light: '#ffffff' },
      });
    } catch (err) {
      console.warn('[MobileCameraPanel] Offline QR generation fallback:', err);
      return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
    }
  }, []);

  const startPairing = useCallback(async () => {
    if (!sessionId || !isActive || mode !== 'pair') return;
    setIsGenerating(true);
    setError(null);
    try {
      const data = await generateMobilePairingToken(sessionId, examId, candidateId, candidateName);
      setPairingData(data);
      const qrUrl = await generateQRDataUrl(data.pairingUrl);
      setQrDataUrl(qrUrl);
      updateCachedSession(sessionId, { pairingData: data, qrDataUrl: qrUrl });
    } catch (err) {
      setError('Failed to generate QR code. Please retry.');
      console.warn('[MobileCameraPanel] Pairing error:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [sessionId, examId, candidateId, candidateName, isActive, mode, generateQRDataUrl]);

  // Auto-start QR pairing only in pre-exam "pair" mode on the Instructions screen
  useEffect(() => {
    if (mode === 'pair' && isActive && sessionId && !pairingData) {
      startPairing();
    }
  }, [mode, isActive, sessionId, pairingData, startPairing]);

  // Check initial connection and subscribe to mobile status from WebSocket
  useEffect(() => {
    if (!sessionId || !isActive) return;

    getMobileConnectionStatus(sessionId)
      .then((res) => {
        if (res && res.mobileConnected) {
          setMobileConnected(true);
          updateCachedSession(sessionId, { mobileConnected: true });
        }
      })
      .catch(() => {});

    const unsub = subscribeToMobileCameraStatus(sessionId, (status) => {
      const connected = Boolean(status.mobileConnected);
      setMobileConnected(connected);
      updateCachedSession(sessionId, { mobileConnected: connected });
      if (connected) {
        setWebrtcState((prev) => (prev === 'connected' ? 'connected' : 'connecting'));
        if (webrtcRef.current) {
          webrtcRef.current.renegotiate().catch(() => {});
        }
      } else {
        setWebrtcState('disconnected');
      }
    });
    statusUnsubRef.current = unsub;
    return () => {
      if (statusUnsubRef.current) statusUnsubRef.current();
    };
  }, [sessionId, isActive]);

  // Subscribe to live frame stream (guaranteed fallback if WebRTC STUN is unavailable)
  useEffect(() => {
    if (!sessionId || !isActive) return;
    const unsub = subscribeToTopic('/topic/webrtc/' + sessionId + '/frame', (data) => {
      if (data && data.image) {
        setFallbackFrame(data.image);
        setMobileConnected(true);
        setWebrtcState('connected');
        updateCachedSession(sessionId, {
          fallbackFrame: data.image,
          mobileConnected: true,
        });
      }
    });
    return () => {
      if (unsub) unsub();
    };
  }, [sessionId, isActive]);

  // Start WebRTC when we have a session and mobile becomes connected
  useEffect(() => {
    if (!sessionId || !mobileConnected || !isActive) return;

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
        if (state === 'connected') {
          setWebrtcState('connected');
        } else if (state === 'failed' || state === 'disconnected') {
          if (!fallbackFrameRef.current) setWebrtcState('disconnected');
          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = setTimeout(() => {
            if (webrtcRef.current) webrtcRef.current.renegotiate().catch(() => {});
          }, 3000);
        }
      },
      onIceConnectionState: (state) => {
        if (state === 'checking' && !fallbackFrameRef.current) setWebrtcState('connecting');
      },
    });

    webrtcRef.current = webrtc;
    webrtc.start().catch((err) => {
      console.warn('[MobileCameraPanel] WebRTC start error:', err);
      if (!fallbackFrameRef.current) setWebrtcState('failed');
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
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (webrtcRef.current) webrtcRef.current.destroy();
      if (statusUnsubRef.current) statusUnsubRef.current();
    };
  }, []);

  const handleCopyLink = () => {
    if (pairingData?.pairingUrl) {
      navigator.clipboard.writeText(pairingData.pairingUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const isLive = (mobileConnected && webrtcState === 'connected') || Boolean(fallbackFrame);

  // Status color logic
  const statusColor = isLive
    ? '#22c55e'
    : mobileConnected && webrtcState === 'connecting'
    ? '#f59e0b'
    : mobileConnected
    ? '#38bdf8'
    : '#94a3b8';

  const statusLabel = isLive
    ? 'MOBILE LIVE'
    : mobileConnected && webrtcState === 'connecting'
    ? 'CONNECTING'
    : mobileConnected
    ? 'PAIRING READY'
    : 'STANDBY';

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER 1: Pre-Exam QR Pairing Mode (on Instructions screen before exam)
  // ─────────────────────────────────────────────────────────────────────────────
  if (mode === 'pair') {
    return (
      <div
        style={{
          marginTop: '16px',
          backgroundColor: '#f8fafc',
          border: isLive ? '1.5px solid #10b981' : '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '16px 18px',
        }}
      >
        {/* Header Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: isLive ? '#d1fae5' : '#e0f2fe',
                color: isLive ? '#047857' : '#0369a1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isLive ? <CheckCircle2 size={16} /> : <Smartphone size={16} />}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--pt-navy-900)' }}>
                Secondary Camera Setup (Mobile Phone QR Pairing)
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                {isLive
                  ? 'Secondary mobile camera paired and streaming — will stay visible during the exam'
                  : 'Scan the QR code below with your smartphone before starting the exam'}
              </div>
            </div>
          </div>

          <span
            style={{
              fontSize: '10.5px',
              fontWeight: 700,
              padding: '3px 9px',
              borderRadius: '9999px',
              backgroundColor: isLive ? '#d1fae5' : '#e0f2fe',
              color: isLive ? '#065f46' : '#0369a1',
            }}
          >
            {isLive ? '✓ Mobile Connected' : statusLabel}
          </span>
        </div>

        {/* Body: QR Code on left + Live Preview / Instructions on right */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isLive ? '1fr' : 'auto 1fr',
            gap: '16px',
            alignItems: 'center',
            backgroundColor: '#0f2740',
            borderRadius: '10px',
            padding: '14px',
            color: '#e2e8f0',
          }}
        >
          {/* QR Code Box (shown before mobile camera is live) */}
          {!isLive && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {error ? (
                <div style={{ textAlign: 'center', padding: '12px' }}>
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
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '10px',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                  }}
                >
                  <img
                    src={qrDataUrl}
                    alt="Mobile camera pairing QR code"
                    style={{ width: '115px', height: '115px', display: 'block' }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: '131px',
                    height: '131px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Smartphone size={26} color="rgba(38,198,218,0.6)" />
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {isGenerating ? 'Generating QR...' : 'Loading QR...'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Instructions or Live Mobile Preview */}
          {!isLive ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <QrCode size={15} color="#26c6da" />
                Connect Your Secondary Camera Now
              </div>
              <ol
                style={{
                  margin: 0,
                  paddingLeft: '18px',
                  fontSize: '12px',
                  color: 'rgba(226,232,240,0.85)',
                  lineHeight: 1.55,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                }}
              >
                <li>Ensure your smartphone is on the same Wi-Fi or Hotspot network.</li>
                <li>Open your phone camera or QR scanner and scan this QR code.</li>
                <li>Grant camera permission on your phone to start the live secondary feed.</li>
              </ol>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                {pairingData?.pairingUrl && (
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    style={{
                      fontSize: '11px',
                      color: copied ? '#34d399' : '#26c6da',
                      backgroundColor: 'rgba(38,198,218,0.12)',
                      border: '1px solid rgba(38,198,218,0.3)',
                      borderRadius: '6px',
                      padding: '5px 10px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Pairing Link Copied!' : 'Copy Pairing Link'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={startPairing}
                  disabled={isGenerating}
                  style={{
                    fontSize: '11px',
                    color: '#cbd5e1',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px',
                    padding: '5px 10px',
                    cursor: isGenerating ? 'wait' : 'pointer',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <RotateCcw size={12} />
                  {isGenerating ? 'Refreshing...' : 'Refresh QR'}
                </button>
              </div>
            </div>
          ) : (
            /* Live Mobile Stream Preview once connected on Instructions screen */
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  position: 'relative',
                  width: '180px',
                  aspectRatio: '16/9',
                  backgroundColor: '#0a1c30',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '1.5px solid #22c55e',
                  flexShrink: 0,
                }}
              >
                {fallbackFrame && (
                  <img
                    src={fallbackFrame}
                    alt="Mobile Secondary Feed Preview"
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
                  disablePictureInPicture
                  onPlaying={() => setRemotePlaying(true)}
                  onLoadedMetadata={(e) => {
                    e.target.play().catch(() => {});
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    pointerEvents: 'none',
                    position: 'absolute',
                    inset: 0,
                    zIndex: 3,
                    display: remoteStream && remotePlaying ? 'block' : 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#4ade80', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Wifi size={14} /> Secondary Mobile Camera Active
                </div>
                <div style={{ fontSize: '11.5px', color: 'rgba(226,232,240,0.85)', lineHeight: 1.5 }}>
                  Your mobile phone camera is paired and streaming. Keep your phone positioned to show your workspace throughout the examination.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER 2: Active Exam Sidebar Monitor Mode (no QR code on exam screen)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        backgroundColor: '#0f2740',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
        marginTop: '12px',
      }}
    >
      {/* Panel header */}
      <div
        style={{
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backgroundColor: '#0a1c30',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Smartphone size={13} color="#26c6da" />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#e2e8f0',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Secondary Camera
          </span>
          <span
            style={{
              fontSize: '9px',
              backgroundColor: isLive ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.15)',
              color: isLive ? '#22c55e' : '#94a3b8',
              border: `1px solid ${isLive ? 'rgba(34,197,94,0.3)' : 'rgba(148,163,184,0.2)'}`,
              padding: '1px 6px',
              borderRadius: '9999px',
              fontWeight: 600,
            }}
          >
            Mobile Phone
          </span>
        </div>
      </div>

      {/* Main content area — Live Secondary Camera Feed (No QR Code here) */}
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
        {/* Live fallback frame image from WebSocket */}
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

        {/* Live mobile video from WebRTC */}
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          disablePictureInPicture
          controlsList="nodownload nofullscreen noremoteplayback"
          onPlaying={() => setRemotePlaying(true)}
          onLoadedMetadata={(e) => {
            e.target.play().catch(() => {});
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            pointerEvents: 'none',
            position: 'absolute',
            inset: 0,
            zIndex: 3,
            display: remoteStream && remotePlaying ? 'block' : 'none',
          }}
        />

        {/* Standby placeholder if mobile camera was not connected before exam */}
        {!mobileConnected && !fallbackFrame && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              padding: '16px',
              textAlign: 'center',
              zIndex: 2,
            }}
          >
            <Smartphone size={26} color="rgba(148,163,184,0.45)" />
            <div style={{ fontSize: '11.5px', color: '#cbd5e1', fontWeight: 600 }}>
              Secondary Camera Standby
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(142,174,201,0.7)', maxWidth: '190px', lineHeight: 1.35 }}>
              Waiting for paired mobile camera stream
            </div>
          </div>
        )}

        {/* Connecting spinner overlay */}
        {mobileConnected && webrtcState === 'connecting' && !fallbackFrame && (
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
              animation: isLive ? 'rec-blink 1.5s ease-in-out infinite' : 'none',
            }}
          />
          <span style={{ fontSize: '9px', color: statusColor, fontWeight: 700, letterSpacing: '0.06em' }}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Footer bar with details */}
      <div
        style={{
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#0c2035',
        }}
      >
        <span style={{ fontSize: '11px', color: 'rgba(142,174,201,0.7)', fontWeight: 500 }}>
          {candidateName}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isLive ? (
            <span style={{ fontSize: '10.5px', color: '#22c55e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Wifi size={11} /> Stream Active
            </span>
          ) : (
            <span style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <WifiOff size={11} /> Offline
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
