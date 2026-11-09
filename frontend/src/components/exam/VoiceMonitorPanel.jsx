import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import {
  MicCapture,
  VoiceStreamMonitor,
  checkVoiceServerHealth,
  enrollCandidateVoice,
  endVoiceSession,
  formatMicError,
  SILENT_RMS,
} from '../../services/voiceAnalysis';

const ENROLL_PASSAGE =
  'When the sunlight strikes raindrops in the air, they act as a prism and form a rainbow. The rainbow is a division of white light into many beautiful colors, with its path high above and its two ends beyond the horizon.';

const VOICE_WARNING_COOLDOWN_MS = 10000;
const SILENT_MIC_COOLDOWN_MS = 45000;

/**
 * VoiceMonitorPanel.jsx
 * ProctorTrack™ + VoiceGuard™ Real-Time Multi-Voice Detection Component.
 *
 * Supports two modes:
 * - mode="enroll": Pre-exam voice profile enrollment card on the Instructions screen.
 * - mode="monitor": Live sidebar audio monitor during the active exam.
 */
export default function VoiceMonitorPanel({
  mode = 'monitor',
  isActive = true,
  voiceSession = null,
  onEnrolled,
  onVoiceEvent,
}) {
  // Shared server health & config
  const [serverInfo, setServerInfo] = useState({
    available: false,
    status: 'checking',
    device: 'cpu',
    mode: 'server',
    config: { enroll_duration_sec: 12 },
  });

  // Enrollment state
  const [localEnrolledData, setLocalEnrolledData] = useState(null);
  const enrolledData = localEnrolledData || voiceSession;
  const [enrollState, setEnrollState] = useState(() => (voiceSession ? 'done' : 'idle')); // idle | recording | processing | done | error
  const [enrollElapsed, setEnrollElapsed] = useState(0);
  const [enrollError, setEnrollError] = useState('');
  const [showInlineEnroll, setShowInlineEnroll] = useState(false);

  // Live monitoring state
  const [micActive, setMicActive] = useState(false);
  const [micError, setMicError] = useState('');
  const [wsStatus, setWsStatus] = useState('idle'); // idle | connecting | live | live-local | reconnecting | closed
  const [voiceStatus, setVoiceStatus] = useState('checking'); // ok | checking | bad | silent | offline
  const [similarity, setSimilarity] = useState(null);
  const [threshold, setThreshold] = useState(voiceSession?.threshold ?? 0.4);
  const [speechRatio, setSpeechRatio] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [maxStrikes, setMaxStrikes] = useState(3);
  const [warningsCount, setWarningsCount] = useState(0);
  const [levelBars, setLevelBars] = useState(() => new Array(20).fill(0.06));
  const [silentNotice, setSilentNotice] = useState('');

  const micRef = useRef(null);
  const monitorRef = useRef(null);
  const enrollChunksRef = useRef([]);
  const enrollTimerRef = useRef(null);
  const redHoldUntilRef = useRef(0);
  const lastVoiceWarnAtRef = useRef(0);
  const lastSilentWarnAtRef = useRef(0);
  const onVoiceEventRef = useRef(onVoiceEvent);

  useEffect(() => {
    onVoiceEventRef.current = onVoiceEvent;
  }, [onVoiceEvent]);

  // Check VoiceGuard server health on mount
  useEffect(() => {
    let mounted = true;
    checkVoiceServerHealth().then((info) => {
      if (mounted && info) {
        setServerInfo(info);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const pushLevelBar = useCallback((rms) => {
    const db = 20 * Math.log10(Math.max(rms, 1e-5));
    const norm = Math.min(1, Math.max(0.05, (db + 58) / 52));
    setLevelBars((prev) => [...prev.slice(1), norm]);
  }, []);

  // ── Enrollment Recording Flow ──────────────────────────────────────────────
  const stopEnrollmentMic = useCallback(() => {
    if (enrollTimerRef.current) {
      clearInterval(enrollTimerRef.current);
      enrollTimerRef.current = null;
    }
    if (micRef.current && mode === 'enroll') {
      micRef.current.stop();
      micRef.current = null;
    }
  }, [mode]);

  const finishEnrollmentRecording = useCallback(async () => {
    if (enrollTimerRef.current) {
      clearInterval(enrollTimerRef.current);
      enrollTimerRef.current = null;
    }
    if (micRef.current) {
      micRef.current.stop();
      micRef.current = null;
      setMicActive(false);
    }

    const chunks = enrollChunksRef.current;
    enrollChunksRef.current = [];

    if (!chunks || chunks.length < 8) {
      setEnrollState('error');
      setEnrollError('Recording was too short. Please record for at least 5 seconds while speaking clearly.');
      return;
    }

    setEnrollState('processing');
    setEnrollError('');

    try {
      const result = await enrollCandidateVoice(chunks, 16000);
      setLocalEnrolledData(result);
      setThreshold(result.threshold ?? 0.4);
      setEnrollState('done');
      setShowInlineEnroll(false);
      onEnrolled?.(result);
    } catch (err) {
      setEnrollState('error');
      setEnrollError(err?.message || 'Failed to build voice profile. Please try again.');
    }
  }, [onEnrolled]);

  const startEnrollmentRecording = async () => {
    setEnrollError('');
    setEnrollElapsed(0);
    enrollChunksRef.current = [];

    // Stop any existing monitor stream before recording enrollment
    if (monitorRef.current) {
      monitorRef.current.end();
      monitorRef.current = null;
    }
    if (micRef.current) {
      micRef.current.stop();
      micRef.current = null;
    }

    const targetSec = Math.min(12, serverInfo?.config?.enroll_duration_sec || 12);

    try {
      const mic = new MicCapture(16000, 250);
      mic.onLevel = (rms) => {
        pushLevelBar(rms);
      };
      mic.onChunk = (pcmBuf) => {
        enrollChunksRef.current.push(new Int16Array(pcmBuf));
      };
      await mic.start();
      micRef.current = mic;
      setMicActive(true);
      setEnrollState('recording');

      const startedAt = Date.now();
      enrollTimerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startedAt) / 1000;
        setEnrollElapsed(elapsed);
        if (elapsed >= targetSec) {
          finishEnrollmentRecording();
        }
      }, 150);
    } catch (err) {
      setEnrollState('error');
      setEnrollError(formatMicError(err));
    }
  };

  useEffect(() => {
    return () => {
      stopEnrollmentMic();
    };
  }, [stopEnrollmentMic]);

  // ── Live Monitoring Flow (mode === 'monitor') ──────────────────────────────
  const handleMonitorServerEvent = useCallback((ev) => {
    if (!ev) return;

    switch (ev.type) {
      case 'ready': {
        if (typeof ev.threshold === 'number') setThreshold(ev.threshold);
        if (typeof ev.strikes_to_warn === 'number') setMaxStrikes(ev.strikes_to_warn);
        setStrikes(0);
        setVoiceStatus('checking');
        break;
      }
      case 'window':
      case 'warning': {
        if (typeof ev.speech_ratio === 'number') {
          setSpeechRatio(Math.round(ev.speech_ratio * 100));
        }
        if (typeof ev.strikes === 'number') {
          setStrikes(ev.strikes);
        }
        if (typeof ev.similarity === 'number') {
          setSimilarity(ev.similarity);
        }

        const now = Date.now();
        if (ev.type === 'warning' || ev.status === 'warning') {
          redHoldUntilRef.current = now + 6000;
          setVoiceStatus('bad');
          setWarningsCount((prev) => prev + 1);

          if (now - lastVoiceWarnAtRef.current > VOICE_WARNING_COOLDOWN_MS) {
            lastVoiceWarnAtRef.current = now;
            onVoiceEventRef.current?.({
              eventType: 'VOICE_WARNING',
              similarity: ev.similarity,
              threshold: ev.threshold ?? threshold,
              speechRatio: ev.speech_ratio,
              message: `Multiple or unrecognized voice detected (similarity ${(ev.similarity ?? 0).toFixed(2)} < threshold ${(ev.threshold ?? threshold).toFixed(2)}) — Please ensure you are alone and silent during the exam.`,
            });
          }
        } else {
          if (now >= redHoldUntilRef.current) {
            if (ev.similarity == null) {
              setVoiceStatus((prev) => (prev === 'ok' ? 'ok' : 'checking'));
            } else {
              setVoiceStatus(ev.status === 'match' ? 'ok' : 'checking');
            }
          }
        }
        break;
      }
      case 'silent_mic': {
        const sec = Math.round(ev.silent_for_sec || 15);
        setSilentNotice(`Microphone silent for ${sec}s — ensure your mic is not muted.`);
        setVoiceStatus('silent');
        const now = Date.now();
        if (now - lastSilentWarnAtRef.current > SILENT_MIC_COOLDOWN_MS) {
          lastSilentWarnAtRef.current = now;
          onVoiceEventRef.current?.({
            eventType: 'SILENT_MIC',
            silentForSec: sec,
            message: `Microphone has been silent or muted for ${sec}+ seconds. Please keep your microphone active.`,
          });
        }
        break;
      }
      case 'mic_ok': {
        setSilentNotice('');
        setVoiceStatus('checking');
        break;
      }
      default:
        break;
    }
  }, [threshold]);

  const stopLiveMonitor = useCallback(() => {
    if (monitorRef.current) {
      monitorRef.current.end();
      monitorRef.current = null;
    }
    if (micRef.current) {
      micRef.current.stop();
      micRef.current = null;
    }
    setMicActive(false);
    setWsStatus('closed');
  }, []);

  const startLiveMonitor = useCallback(async () => {
    if (mode !== 'monitor' || showInlineEnroll) return;

    stopLiveMonitor();
    setMicError('');
    setSilentNotice('');

    try {
      const mic = new MicCapture(16000, 250);
      const sessionToUse = enrolledData || voiceSession || {
        session_id: `local-voice-${Date.now()}`,
        threshold: 0.86,
        mode: 'browser',
      };

      const monitor = new VoiceStreamMonitor({
        sessionData: sessionToUse,
        onEvent: handleMonitorServerEvent,
        onStatusChange: (st) => setWsStatus(st),
      });

      mic.onLevel = (rms) => {
        pushLevelBar(rms);
        if (rms > SILENT_RMS * 2) {
          setSilentNotice('');
        }
      };
      mic.onChunk = (pcmBuf) => {
        monitor.sendChunk(pcmBuf);
      };
      mic.onEnded = () => {
        setMicActive(false);
        setMicError('Microphone disconnected. Please reconnect and click Enable.');
      };

      await mic.start();
      micRef.current = mic;
      setMicActive(true);

      monitor.connect();
      monitorRef.current = monitor;
    } catch (err) {
      setMicActive(false);
      setMicError(formatMicError(err));
    }
  }, [mode, showInlineEnroll, enrolledData, voiceSession, handleMonitorServerEvent, pushLevelBar, stopLiveMonitor]);

  useEffect(() => {
    if (mode !== 'monitor') return undefined;

    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      if (isActive && !showInlineEnroll) {
        startLiveMonitor();
      } else {
        stopLiveMonitor();
      }
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (monitorRef.current) {
        monitorRef.current.end();
        monitorRef.current = null;
      }
      if (micRef.current) {
        micRef.current.stop();
        micRef.current = null;
      }
    };
  }, [mode, isActive, showInlineEnroll, startLiveMonitor, stopLiveMonitor]);

  // Cleanup server session when exam ends
  useEffect(() => {
    return () => {
      if (mode === 'monitor' && enrolledData?.session_id) {
        endVoiceSession(enrolledData.session_id);
      }
    };
  }, [mode, enrolledData?.session_id]);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER 1: Pre-Exam Enrollment Mode (on Instructions screen)
  // ─────────────────────────────────────────────────────────────────────────────
  if (mode === 'enroll') {
    const targetSec = Math.min(12, serverInfo?.config?.enroll_duration_sec || 12);
    const progressPct = Math.min(100, Math.round((enrollElapsed / targetSec) * 100));

    return (
      <div
        style={{
          marginTop: '18px',
          backgroundColor: '#f8fafc',
          border: enrolledData ? '1.5px solid #10b981' : '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '16px 18px',
        }}
      >
        {/* Header Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: enrolledData ? '#d1fae5' : '#e0f2fe',
                color: enrolledData ? '#047857' : '#0369a1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {enrolledData ? <CheckCircle2 size={16} /> : <Mic size={16} />}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--pt-navy-900)' }}>
                VoiceGuard™ Biometric Voice Enrollment
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                {enrolledData
                  ? 'Voice profile enrolled — real-time multi-voice detection ready'
                  : 'Optional 10s voice calibration so VoiceGuard verifies only you are speaking'}
              </div>
            </div>
          </div>

          <span
            style={{
              fontSize: '10.5px',
              fontWeight: 700,
              padding: '3px 9px',
              borderRadius: '9999px',
              backgroundColor: enrolledData
                ? '#d1fae5'
                : serverInfo.mode === 'server'
                ? '#e0f2fe'
                : '#f1f5f9',
              color: enrolledData
                ? '#065f46'
                : serverInfo.mode === 'server'
                ? '#0369a1'
                : '#475569',
            }}
          >
            {enrolledData
              ? '✓ Enrolled'
              : serverInfo.mode === 'server'
              ? `ECAPA-TDNN (${serverInfo.device || 'cpu'})`
              : 'WebAudio DSP Ready'}
          </span>
        </div>

        {/* Reading passage & controls */}
        {enrollState !== 'done' && (
          <>
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 13px',
                fontSize: '12px',
                color: '#334155',
                lineHeight: 1.55,
                fontStyle: 'italic',
                marginBottom: '12px',
              }}
            >
              &ldquo;{ENROLL_PASSAGE}&rdquo;
            </div>

            {enrollState === 'recording' && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 700, color: '#0f172a', marginBottom: '5px' }}>
                  <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Radio size={13} /> Recording voice sample — read aloud…
                  </span>
                  <span>
                    {enrollElapsed.toFixed(1)}s / {targetSec}s
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden', marginBottom: '8px' }}>
                  <div
                    style={{
                      width: `${progressPct}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #0284c7, #26c6da)',
                      transition: 'width 0.15s linear',
                    }}
                  />
                </div>

                {/* Live level bars */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '24px' }}>
                  {levelBars.map((v, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: `${Math.max(15, Math.round(v * 100))}%`,
                        backgroundColor: v > 0.25 ? '#0284c7' : '#94a3b8',
                        borderRadius: '2px',
                        transition: 'height 0.1s ease',
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {enrollState === 'processing' && (
              <div style={{ fontSize: '12px', color: '#0369a1', fontWeight: 600, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={13} className="spin" /> Extracting voice embeddings &amp; computing similarity threshold…
              </div>
            )}

            {enrollError && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  padding: '8px 12px',
                  borderRadius: '7px',
                  fontSize: '12px',
                  marginBottom: '10px',
                }}
              >
                {enrollError}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {enrollState !== 'recording' ? (
                <button
                  type="button"
                  disabled={enrollState === 'processing'}
                  onClick={startEnrollmentRecording}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #0284c7',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: enrollState === 'processing' ? 'wait' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Mic size={14} />
                  {enrollState === 'error' ? 'Retry Voice Recording' : `Record Voice Sample (${targetSec}s)`}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={finishEnrollmentRecording}
                  disabled={enrollElapsed < 4}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: enrollElapsed >= 4 ? '#047857' : '#94a3b8',
                    color: '#ffffff',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: enrollElapsed >= 4 ? 'pointer' : 'not-allowed',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <CheckCircle2 size={14} />
                  {enrollElapsed >= 4 ? 'Finish & Save Voice Profile' : `Keep Speaking (${Math.ceil(4 - enrollElapsed)}s)…`}
                </button>
              )}
            </div>
          </>
        )}

        {enrollState === 'done' && enrolledData && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '12px', color: '#065f46', fontWeight: 600 }}>
              ✓ Voice profile active · Speech captured: <strong>{enrolledData.speech_sec ?? 8.0}s</strong> ({enrolledData.n_segments ?? 4} segments) · Similarity threshold:{' '}
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                {Number(enrolledData.threshold ?? 0.4).toFixed(3)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setEnrollState('idle');
                setLocalEnrolledData(null);
              }}
              style={{
                background: 'none',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11.5px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              Re-record
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER 2: Live Exam Sidebar Monitor (mode === 'monitor')
  // ─────────────────────────────────────────────────────────────────────────────
  const getVoiceStatusBadge = () => {
    if (!micActive) {
      return { label: 'MIC OFF', color: '#d97706', bg: '#fffbeb', dot: '#f59e0b' };
    }
    if (voiceStatus === 'bad') {
      return { label: 'MULTI-VOICE ALERT', color: '#dc2626', bg: '#fef2f2', dot: '#ef4444' };
    }
    if (voiceStatus === 'silent') {
      return { label: 'MIC SILENT', color: '#d97706', bg: '#fffbeb', dot: '#f59e0b' };
    }
    if (voiceStatus === 'ok') {
      return { label: 'VOICE VERIFIED', color: '#16a34a', bg: '#ecfdf5', dot: '#22c55e' };
    }
    return { label: 'MONITORING', color: '#0284c7', bg: '#f0f9ff', dot: '#26c6da' };
  };

  const badge = getVoiceStatusBadge();

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        border: voiceStatus === 'bad' ? '1.5px solid #ef4444' : '1px solid var(--border-subtle)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '11px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Volume2 size={14} color="var(--pt-navy-800)" />
          <span
            style={{
              fontSize: '12px',
              fontWeight: 800,
              color: 'var(--pt-navy-800)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Audio – VoiceGuard™
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {micActive ? (
            <button
              type="button"
              onClick={stopLiveMonitor}
              title="Pause microphone monitor"
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
              <MicOff size={12} /> Mute
            </button>
          ) : (
            <button
              type="button"
              onClick={startLiveMonitor}
              title="Enable microphone monitor"
              style={{
                fontSize: '10.5px',
                color: 'var(--pt-teal-700)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <RefreshCw size={11} /> Enable
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Live status row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: badge.dot,
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: badge.color }}>
              {badge.label}
            </span>
          </div>

          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '999px',
              backgroundColor: enrolledData ? '#ecfdf5' : '#f1f5f9',
              color: enrolledData ? '#047857' : '#64748b',
            }}
          >
            {wsStatus === 'live' ? 'ECAPA Live' : enrolledData ? 'Profile Active' : 'Auto-Adaptive'}
          </span>
        </div>

        {/* Audio Waveform Visualizer */}
        <div
          style={{
            backgroundColor: '#0a1c30',
            borderRadius: '8px',
            padding: '8px 10px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
          }}
        >
          {levelBars.map((val, idx) => (
            <div
              key={idx}
              style={{
                flex: 1,
                height: `${micActive ? Math.max(14, Math.round(val * 100)) : 14}%`,
                borderRadius: '2px',
                backgroundColor:
                  voiceStatus === 'bad'
                    ? '#ef4444'
                    : val > 0.3
                    ? '#26c6da'
                    : 'rgba(148, 163, 184, 0.35)',
                transition: 'height 0.1s ease',
              }}
            />
          ))}
        </div>

        {/* KPI Metrics Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '6px',
            backgroundColor: 'var(--bg-surface-subtle)',
            borderRadius: '8px',
            padding: '8px 10px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Similarity
            </div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--pt-navy-900)', fontFamily: 'var(--font-mono)' }}>
              {similarity !== null ? similarity.toFixed(2) : '—'}
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>
                /{Number(threshold).toFixed(2)}
              </span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Speech
            </div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--pt-navy-900)', fontFamily: 'var(--font-mono)' }}>
              {speechRatio}%
            </div>
          </div>

          <div>
            <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Strikes
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
              {Array.from({ length: maxStrikes }).map((_, idx) => (
                <span
                  key={idx}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor:
                      idx < strikes
                        ? strikes >= maxStrikes - 1
                          ? '#ef4444'
                          : '#f59e0b'
                        : '#cbd5e1',
                    display: 'inline-block',
                  }}
                />
              ))}
              {warningsCount > 0 && (
                <span style={{ fontSize: '10px', color: '#dc2626', fontWeight: 800, marginLeft: '2px' }}>
                  ({warningsCount})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Inline voice calibration modal/drawer if student didn't enroll on instructions screen */}
        {showInlineEnroll ? (
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '10px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
              Read aloud for 8s to calibrate your voice:
            </div>
            <div style={{ fontSize: '10.5px', color: '#475569', fontStyle: 'italic', marginBottom: '8px', lineHeight: 1.4 }}>
              &ldquo;When the sunlight strikes raindrops in the air, they act as a prism and form a rainbow.&rdquo;
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {enrollState !== 'recording' ? (
                <button
                  type="button"
                  onClick={startEnrollmentRecording}
                  disabled={enrollState === 'processing'}
                  style={{
                    flex: 1,
                    padding: '6px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {enrollState === 'processing' ? 'Saving…' : 'Start 8s Recording'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={finishEnrollmentRecording}
                  disabled={enrollElapsed < 4}
                  style={{
                    flex: 1,
                    padding: '6px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: enrollElapsed >= 4 ? '#047857' : '#94a3b8',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: enrollElapsed >= 4 ? 'pointer' : 'not-allowed',
                  }}
                >
                  {enrollElapsed >= 4
                    ? `Save (${enrollElapsed.toFixed(0)}s)`
                    : `Speak (${Math.ceil(4 - enrollElapsed)}s)…`}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  stopEnrollmentMic();
                  setEnrollState(enrolledData ? 'done' : 'idle');
                  setShowInlineEnroll(false);
                }}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={12} color="#0284c7" />
              {enrolledData ? 'Enrolled speaker locked' : 'Speaker verification active'}
            </span>
            <button
              type="button"
              onClick={() => setShowInlineEnroll(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#0284c7',
                fontSize: '10.5px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {enrolledData ? 'Recalibrate' : 'Calibrate Voice'}
            </button>
          </div>
        )}

        {/* Error or Silent Mic Banner */}
        {(micError || silentNotice) && (
          <div
            style={{
              backgroundColor: micError ? '#fef2f2' : '#fffbeb',
              border: `1px solid ${micError ? '#fecaca' : '#fde68a'}`,
              borderRadius: '6px',
              padding: '7px 9px',
              fontSize: '11px',
              color: micError ? '#b91c1c' : '#92400e',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '5px',
              lineHeight: 1.35,
            }}
          >
            <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{micError || silentNotice}</span>
          </div>
        )}
      </div>
    </div>
  );
}
