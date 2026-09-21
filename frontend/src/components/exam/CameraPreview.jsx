import { useState, useEffect, useRef } from 'react';
import { Camera, Video, VideoOff, RefreshCw, AlertCircle } from 'lucide-react';

/**
 * CameraPreview.jsx
 * ProctorTrack™ candidate webcam feed component.
 *
 * Supports live camera stream via navigator.mediaDevices.getUserMedia()
 * with graceful fallback to simulation/standby mode if permission is denied,
 * camera is absent, or user toggles off.
 *
 * Props:
 *   candidateName  string
 */
export default function CameraPreview({ candidateName, isActive = true }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isStarting, setIsStarting] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Stop media tracks
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  };

  // Start media stream
  const startStream = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Webcam API is not supported in this browser.');
      return;
    }

    setIsStarting(true);
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((playErr) => {
          void playErr;
        });
      }
      setStreamActive(true);
    } catch (err) {
      let msg = 'Could not access webcam.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera access denied by user/browser.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera hardware detected on device.';
      } else if (err.name === 'NotReadableError') {
        msg = 'Camera is already in use by another app.';
      }
      setCameraError(msg);
      setStreamActive(false);
    } finally {
      setIsStarting(false);
    }
  };

  // When active exam starts, attempt camera stream connection asynchronously
  useEffect(() => {
    let cancelled = false;
    if (isActive && !streamRef.current) {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
            audio: false,
          })
          .then((stream) => {
            if (cancelled) {
              stream.getTracks().forEach((t) => t.stop());
              return;
            }
            streamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play().catch((e) => void e);
            }
            setStreamActive(true);
          })
          .catch((err) => {
            if (!cancelled) {
              let msg = 'Could not access webcam.';
              if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                msg = 'Camera permission denied by browser.';
              } else if (err.name === 'NotFoundError') {
                msg = 'No camera hardware found.';
              }
              setCameraError(msg);
            }
          });
      }
    }

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isActive]);

  // When streamActive changes or expands, ensure video element is bound
  useEffect(() => {
    if (streamActive && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch((e) => void e);
      }
    }
  }, [streamActive, isExpanded]);

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
          <Video size={14} color="var(--pt-navy-800)" />
          <span
            style={{
              fontSize: '12px',
              fontWeight: 800,
              color: 'var(--pt-navy-800)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Camera Feed
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {streamActive ? (
            <button
              type="button"
              onClick={stopStream}
              title="Pause camera"
              style={{
                fontSize: '10.5px',
                color: '#dc2626',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <VideoOff size={12} /> Pause
            </button>
          ) : (
            <button
              type="button"
              onClick={startStream}
              disabled={isStarting}
              title="Start camera"
              style={{
                fontSize: '10.5px',
                color: 'var(--pt-teal-700)',
                background: 'none',
                border: 'none',
                cursor: isStarting ? 'wait' : 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <RefreshCw size={11} className={isStarting ? 'spin' : ''} /> Enable
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded((p) => !p)}
            style={{
              fontSize: '10.5px',
              color: 'var(--text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {isExpanded ? 'Minimize' : 'Expand'}
          </button>
        </div>
      </div>

      {/* Video / Placeholder viewport */}
      <div
        style={{
          position: 'relative',
          backgroundColor: '#0a1c30',
          aspectRatio: isExpanded ? '4/3' : '16/9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Live video element */}
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)', // mirror for candidate comfort
            display: streamActive ? 'block' : 'none',
          }}
        />

        {/* Viewfinder corner guides */}
        {[
          { top: '10px', left: '10px' },
          { top: '10px', right: '10px' },
          { bottom: '10px', left: '10px' },
          { bottom: '10px', right: '10px' },
        ].map((pos, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: '14px',
              height: '14px',
              borderTop: ['0', '1'].includes(String(i)) ? '2px solid #26c6da' : 'none',
              borderBottom: ['2', '3'].includes(String(i)) ? '2px solid #26c6da' : 'none',
              borderLeft: ['0', '2'].includes(String(i)) ? '2px solid #26c6da' : 'none',
              borderRight: ['1', '3'].includes(String(i)) ? '2px solid #26c6da' : 'none',
              pointerEvents: 'none',
              ...pos,
            }}
          />
        ))}

        {/* Standby / Placeholder overlay when camera stream is off */}
        {!streamActive && (
          <div style={{ textAlign: 'center', padding: '16px', zIndex: 2 }}>
            <Camera size={28} color="rgba(38,198,218,0.6)" style={{ marginBottom: '6px' }} />
            <div style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: 600 }}>
              {isStarting ? 'Connecting camera...' : 'Webcam Standby'}
            </div>
            {cameraError ? (
              <div
                style={{
                  fontSize: '10.5px',
                  color: '#f87171',
                  marginTop: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                <AlertCircle size={11} /> {cameraError}
              </div>
            ) : (
              <div style={{ fontSize: '10px', color: 'rgba(142,174,201,0.6)', marginTop: '2px' }}>
                Click &apos;Enable&apos; to activate stream
              </div>
            )}
          </div>
        )}

        {/* REC / Live monitoring badge */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            backgroundColor: 'rgba(10, 28, 48, 0.75)',
            padding: '3px 8px',
            borderRadius: '9999px',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255,255,255,0.1)',
            zIndex: 3,
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: streamActive ? '#22c55e' : '#f59e0b',
              animation: streamActive ? 'rec-blink 1.5s ease-in-out infinite' : 'none',
              display: 'inline-block',
            }}
          />
          <span
            style={{
              fontSize: '9px',
              color: streamActive ? '#22c55e' : '#fcd34d',
              fontWeight: 700,
              letterSpacing: '0.08em',
            }}
          >
            {streamActive ? 'LIVE PROCTOR' : 'STANDBY'}
          </span>
        </div>

        {/* Subtle Face Guide Silhouette overlay when stream is live */}
        {streamActive && (
          <div
            style={{
              position: 'absolute',
              width: '42%',
              height: '56%',
              border: '1.5px dashed rgba(38,198,218,0.35)',
              borderRadius: '50%',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* Status footer bar */}
      <div
        style={{
          padding: '9px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 500 }}>
          {candidateName}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: streamActive ? '#22c55e' : '#eab308',
              display: 'inline-block',
            }}
          />
          <span
            style={{
              fontSize: '11px',
              color: streamActive ? '#16a34a' : '#d97706',
              fontWeight: 700,
            }}
          >
            {streamActive ? 'Biometric Stream Active' : 'Camera Ready (Standby)'}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes rec-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        .spin {
          animation: rec-spin 1s linear infinite;
        }
        @keyframes rec-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
