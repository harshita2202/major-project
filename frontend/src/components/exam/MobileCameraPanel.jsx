import { useState, useEffect, useRef, useCallback } from 'react';
import { Smartphone, QrCode, Wifi, WifiOff, RotateCcw, AlertCircle, Copy, Check } from 'lucide-react';
import QRCode from 'qrcode';
import { subscribeToTopic } from '../../services/websocket';
import {
  generateMobilePairingToken,
  LaptopMobileWebRTC,
  subscribeToMobileCameraStatus,
  getMobileConnectionStatus,
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
  const [remotePlaying, setRemotePlaying] = useState(false);
  const [fallbackFrame, setFallbackFrame] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [copied, setCopied] = useState(false);

  const videoRef = useRef(null);
  const webrtcRef = useRef(null);
  const statusUnsubRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const fallbackFrameRef = useRef(null);

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

  // Check initial connection and subscribe to mobile status from WebSocket
  useEffect(() => {
    if (!sessionId || !isActive) return;

    getMobileConnectionStatus(sessionId)
      .then((res) => {
        if (res && res.mobileConnected) {
          setMobileConnected(true);
        }
      })
      .catch(() => {});

    const unsub = subscribeToMobileCameraStatus(sessionId, (status) => {
      setMobileConnected(status.mobileConnected);
      if (status.mobileConnected) {
        setWebrtcState((prev) => (prev === 'connected' ? 'connected' : 'connecting'));
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

  // Subscribe to live frame stream (guaranteed fallback if WebRTC STUN is unavailable)
  useEffect(() => {
    if (!sessionId || !isActive) return;
    const unsub = subscribeToTopic('/topic/webrtc/' + sessionId + '/frame', (data) => {
      if (data && data.image) {
        setFallbackFrame(data.image);
        setMobileConnected(true);
        setWebrtcState('connected');
      }
    });
    return () => { if (unsub) unsub(); };
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {pairingData && !isLive && (
            <button
              type="button"
              onClick={startPairing}
              disabled={isGenerating}
              title="Regenerate QR Code"
              style={{
                fontSize: '10px',
                color: 'rgba(255,255,255,0.5)',
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
        {/* Live fallback frame image from WebSocket (always displayed whenever frames arrive) */}
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

        {/* Live mobile video from WebRTC (only overlays when actively playing decoded frames) */}
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

        {/* QR Code pairing UI (shown when not connected and no frames yet) */}
        {!mobileConnected && !fallbackFrame && (
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

        {/* Connecting spinner overlay (only if connecting and no frames yet) */}
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
            pairingData?.pairingUrl && (
              <button
                type="button"
                onClick={handleCopyLink}
                style={{
                  fontSize: '10px',
                  color: copied ? '#34d399' : '#26c6da',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                {copied ? <Check size={10} /> : <Copy size={10} />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
