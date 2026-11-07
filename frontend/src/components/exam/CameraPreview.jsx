import { useState, useEffect, useRef } from 'react';
import { Camera, Video, VideoOff, RefreshCw, AlertCircle } from 'lucide-react';
import { analyzeGazeFrame } from '../../services/gazeAnalysis';

const STARTUP_GRACE_MS = 6000; // 6s initial warm-up when exam/camera starts
const WARNING_COOLDOWN_MS = 10000; // 10s cooldown between gaze warnings
const CONSECUTIVE_AWAY_THRESHOLD = 2; // Require 2 consecutive off-screen checks (~4s)
const CONSECUTIVE_NO_FACE_THRESHOLD = 2; // Require 2 consecutive missing-face checks (~4s)

/**
 * Normalizes OpenCV solvePnP pitch angle (which can wrap around +/-180 deg
 * when the 3D face model Y-axis is inverted relative to image coordinates).
 */
function normalizeHeadPitch(rawPitch) {
  if (typeof rawPitch !== 'number' || Number.isNaN(rawPitch)) return 0;
  if (rawPitch > 90) return 180 - rawPitch;
  if (rawPitch < -90) return -180 - rawPitch;
  return rawPitch;
}

/**
 * Computes screen-relative gaze direction from L2CS-Net Gaze360 (yaw_deg, pitch_deg).
 * On a top-mounted laptop webcam:
 * - Looking at the laptop screen corresponds to pitch in [-38°, +18°]
 *   (negative pitch = downward from top bezel toward screen).
 * - Looking below the screen (desk/lap/phone) has pitch < -38°.
 * - Looking above the monitor has pitch > +18°.
 * - Horizontal screen span corresponds to yaw in [-26°, +26°].
 */
function computeScreenDirection(yawDeg, pitchDeg, fallbackDirection) {
  if (typeof yawDeg !== 'number' || typeof pitchDeg !== 'number') {
    return fallbackDirection || 'CENTER';
  }

  let horizontal = 'CENTER';
  if (yawDeg > 26) horizontal = 'RIGHT';
  else if (yawDeg < -26) horizontal = 'LEFT';

  let vertical = '';
  if (pitchDeg < -38) vertical = 'DOWN';
  else if (pitchDeg > 18) vertical = 'UP';

  if (vertical && horizontal !== 'CENTER') return `${vertical}-${horizontal}`;
  if (vertical) return vertical;
  return horizontal;
}

/**
 * Evaluates raw gaze API result with client-side sanity checks so inverted
 * solvePnP pitch, Gaze360 screen-center offset, or brief glances do not trigger
 * immediate false-positive warnings, while accurately catching sustained
 * off-screen gaze, missing face, and multiple faces.
 */
function sanitizeGazeResult(raw, counters, withinGracePeriod) {
  if (!raw) return null;

  // 1. No Face Detected
  if (!raw.face_detected) {
    const nextNoFace = withinGracePeriod ? 0 : (counters.noFace || 0) + 1;
    const isNoFaceSuspicious = !withinGracePeriod && nextNoFace >= CONSECUTIVE_NO_FACE_THRESHOLD;
    return {
      ...raw,
      gaze_direction: isNoFaceSuspicious ? 'NO_FACE' : 'NO_FACE_PENDING',
      is_suspicious: isNoFaceSuspicious,
      suspicion_score: isNoFaceSuspicious ? Math.min(1.0, nextNoFace / 5) : 0,
      message: isNoFaceSuspicious ? 'No face detected in camera' : 'Detecting face...',
      nextCounters: { away: 0, noFace: nextNoFace, multiFace: 0 },
    };
  }

  // 2. Multiple Faces Detected
  if (raw.gaze_direction === 'MULTIPLE_FACES' || (typeof raw.face_count === 'number' && raw.face_count > 1)) {
    const nextMulti = withinGracePeriod ? 0 : (counters.multiFace || 0) + 1;
    const isMultiSuspicious = !withinGracePeriod && nextMulti >= 1;
    return {
      ...raw,
      gaze_direction: 'MULTIPLE_FACES',
      is_suspicious: isMultiSuspicious,
      suspicion_score: isMultiSuspicious ? Math.min(1.0, 0.75 + 0.15 * nextMulti) : 0.4,
      message: `Multiple faces detected in camera`,
      nextCounters: { away: 0, noFace: 0, multiFace: nextMulti },
    };
  }

  // 3. Single Face: Head Pose + Gaze Angles
  const headYaw = raw.head_pose ? Math.abs(raw.head_pose.yaw || 0) : 0;
  const headPitch = raw.head_pose ? Math.abs(normalizeHeadPitch(raw.head_pose.pitch || 0)) : 0;
  const extremeHeadTurn = headYaw > 26 || headPitch > 24;

  const direction = computeScreenDirection(raw.yaw, raw.pitch, raw.gaze_direction);
  const isLookingAway = direction !== 'CENTER' || extremeHeadTurn;

  const nextAway = withinGracePeriod
    ? 0
    : isLookingAway
    ? (counters.away || 0) + 1
    : 0;

  const isSuspicious = !withinGracePeriod && nextAway >= CONSECUTIVE_AWAY_THRESHOLD;
  const suspicionScore = isSuspicious ? Math.min(1.0, nextAway / 5) : Math.min(0.5, nextAway / 5);

  return {
    ...raw,
    gaze_direction: isLookingAway ? (direction === 'CENTER' ? 'HEAD_AWAY' : direction) : 'CENTER',
    is_suspicious: isSuspicious,
    suspicion_score: suspicionScore,
    nextCounters: { away: nextAway, noFace: 0, multiFace: 0 },
  };
}

/**
 * CameraPreview.jsx
 * ProctorTrack™ candidate webcam feed component.
 *
 * Props:
 *   candidateName  string
 *   sessionId      string
 *   isActive       boolean
 *   onGazeEvent    function
 *   gazeEnabled    boolean
 */
export default function CameraPreview({
  candidateName,
  sessionId,
  isActive = true,
  onGazeEvent,
  gazeEnabled = true,
}) {
  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [gazeResult, setGazeResult] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const lastSuspiciousCallRef = useRef(0);
  const streamStartedAtRef = useRef(0);
  const countersRef = useRef({ away: 0, noFace: 0, multiFace: 0 });

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
      streamStartedAtRef.current = Date.now();
      countersRef.current = { away: 0, noFace: 0, multiFace: 0 };
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
            streamStartedAtRef.current = Date.now();
            countersRef.current = { away: 0, noFace: 0, multiFace: 0 };
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

  // When streamActive changes, ensure video element is bound
  useEffect(() => {
    if (streamActive && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch((e) => void e);
      }
    }
  }, [streamActive]);

  // Gaze Analysis Interval
  useEffect(() => {
    let intervalId;

    if (streamActive && gazeEnabled && videoRef.current) {
      intervalId = setInterval(async () => {
        const video = videoRef.current;
        if (!video || video.readyState < 2) return; // Wait for video to be ready

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const base64Image = canvas.toDataURL('image/jpeg', 0.8);
        const rawResult = await analyzeGazeFrame(
          base64Image,
          sessionId || candidateName || 'default',
          canvas
        );

        if (rawResult) {
          const now = Date.now();
          const withinGracePeriod =
            streamStartedAtRef.current > 0 && now - streamStartedAtRef.current < STARTUP_GRACE_MS;

          const sanitized = sanitizeGazeResult(
            rawResult,
            countersRef.current,
            withinGracePeriod
          );
          if (!sanitized) return;

          countersRef.current = sanitized.nextCounters;
          setGazeResult(sanitized);

          if (sanitized.is_suspicious && onGazeEvent) {
            if (now - lastSuspiciousCallRef.current > WARNING_COOLDOWN_MS) {
              lastSuspiciousCallRef.current = now;
              countersRef.current = { away: 0, noFace: 0, multiFace: 0 };
              onGazeEvent(sanitized);
            }
          }
        }
      }, 2000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [streamActive, gazeEnabled, onGazeEvent, sessionId, candidateName]);

  const getGazeStatusLabel = () => {
    if (!gazeResult) return 'Analyzing...';
    if (gazeResult.is_suspicious) {
      if (gazeResult.gaze_direction === 'NO_FACE') return 'NO FACE DETECTED';
      if (gazeResult.gaze_direction === 'MULTIPLE_FACES') return 'MULTIPLE FACES';
      return 'SUSPICIOUS GAZE';
    }
    if (gazeResult.gaze_direction === 'NO_FACE_PENDING') return 'Adjusting Face...';
    if (gazeResult.gaze_direction === 'CENTER') return 'Focused';
    return `Glancing (${gazeResult.gaze_direction})`;
  };

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
            Primary Camera – Laptop Webcam
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
        </div>
      </div>

      {/* Video / Placeholder viewport */}
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
        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} width="320" height="240" style={{ display: 'none' }} />

        {/* Live video element (PiP & fullscreen disabled so browser overlay cannot steal focus) */}
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          disablePictureInPicture
          controlsList="nodownload nofullscreen noremoteplayback"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)', // mirror for candidate comfort
            pointerEvents: 'none',
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
              <div style={{ marginTop: '6px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    color: '#f87171',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    lineHeight: 1.3,
                  }}
                >
                  <AlertCircle size={12} style={{ flexShrink: 0 }} />
                  <span>{cameraError}</span>
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', lineHeight: 1.3 }}>
                  Click lock or camera icon in address bar, set to <strong>Allow</strong>, then retry.
                </div>
                <button
                  type="button"
                  onClick={startStream}
                  disabled={isStarting}
                  style={{
                    marginTop: '8px',
                    padding: '4px 12px',
                    backgroundColor: 'rgba(38, 198, 218, 0.15)',
                    border: '1px solid rgba(38, 198, 218, 0.4)',
                    borderRadius: '6px',
                    color: '#26c6da',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: isStarting ? 'wait' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <RefreshCw size={11} className={isStarting ? 'spin' : ''} />
                  {isStarting ? 'Requesting...' : 'Retry Camera Access'}
                </button>
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
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

        {gazeEnabled && streamActive && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Gaze Status
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: gazeResult?.is_suspicious
                    ? '#ef4444'
                    : gazeResult?.gaze_direction === 'CENTER' || !gazeResult
                    ? '#22c55e'
                    : '#eab308',
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  fontSize: '11px',
                  color: gazeResult?.is_suspicious
                    ? '#dc2626'
                    : gazeResult?.gaze_direction === 'CENTER' || !gazeResult
                    ? '#16a34a'
                    : '#d97706',
                  fontWeight: 600,
                }}
              >
                {getGazeStatusLabel()}
              </span>
            </div>
          </div>
        )}
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
