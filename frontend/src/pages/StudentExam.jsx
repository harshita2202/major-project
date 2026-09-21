import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Shield,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  BookOpen,
  User,
  Maximize,
  RotateCcw,
  ArrowLeft,
} from 'lucide-react';

import ExamTimer from '../components/exam/ExamTimer';
import QuestionCard from '../components/exam/QuestionCard';
import QuestionNavigator from '../components/exam/QuestionNavigator';
import SecurityStatus from '../components/exam/SecurityStatus';
import SecurityActivity from '../components/exam/SecurityActivity';
import SecurityViolationModal from '../components/exam/SecurityViolationModal';
import CameraPreview from '../components/exam/CameraPreview';

import {
  MOCK_QUESTIONS,
  CODING_QUESTIONS,
  MOCK_EXAMS_META,
  DEFAULT_EXAM_META,
} from '../data/mockExamData';

import {
  SECURITY_EVENT_TYPE,
  SECURITY_SEVERITY,
  createSecurityEvent,
  enterFullscreen,
  exitFullscreen,
  isFullscreen,
  setupSecurityListeners,
  countViolations,
  getSecurityStatus,
  saveSession,
  loadSession,
  clearSession,
} from '../services/examSecurity';

import { getCurrentUser } from '../services/auth';
import { getExamQuestions, submitExam, recordExamEvent } from '../services/api';

// ─── Exam phase constants ──────────────────────────────────────────────────────
const PHASE = {
  LOADING: 'LOADING',
  INSTRUCTIONS: 'INSTRUCTIONS',
  ACTIVE: 'ACTIVE',
  SUBMITTED: 'SUBMITTED',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatSubmissionTime(iso) {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch (fmtErr) {
    void fmtErr;
    return iso;
  }
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function StudentExam() {
  const { examId } = useParams();

  // ── Exam metadata ──────────────────────────────────────────────────────────
  const currentUser = getCurrentUser();
  const rawMeta = MOCK_EXAMS_META[examId] || { ...DEFAULT_EXAM_META, id: examId };
  const examMeta = {
    ...rawMeta,
    candidateName: currentUser?.name || rawMeta.candidateName,
    candidateId: currentUser?.userId || rawMeta.candidateId,
  };
  const isCodingExam = examMeta.type === 'coding' || examId === 'coding' || examId === 'exam-2';
  const [questions, setQuestions] = useState(() => {
    return isCodingExam
      ? CODING_QUESTIONS.slice(0, examMeta.totalQuestions || CODING_QUESTIONS.length)
      : MOCK_QUESTIONS.slice(0, examMeta.totalQuestions || MOCK_QUESTIONS.length);
  });

  useEffect(() => {
    let isMounted = true;
    getExamQuestions(examId).then((data) => {
      if (isMounted && data && data.length > 0) {
        setQuestions(data);
      }
    }).catch((err) => void err);
    return () => {
      isMounted = false;
    };
  }, [examId]);

  const INITIAL_SECONDS = examMeta.durationMinutes * 60;

  // ── State ──────────────────────────────────────────────────────────────────
  // Lazily derive initial state from localStorage to avoid setState-in-effect
  const initSession = () => {
    const existing = loadSession(examId);
    if (existing && existing.phase === 'ACTIVE') {
      return {
        phase: PHASE.ACTIVE,
        answers: existing.answers || {},
        currentIndex: existing.currentQuestion || 0,
        securityEvents: [
          ...(existing.securityEvents || []),
          createSecurityEvent(
            SECURITY_EVENT_TYPE.TAB_SWITCH,
            SECURITY_SEVERITY.INFO,
            'Exam session restored after page reload'
          ),
        ],
        timeRemaining: existing.timeRemainingSeconds ?? INITIAL_SECONDS,
        isTimerRunning: true,
        tabSwitchWarnings: existing.tabSwitchWarnings || 0,
      };
    }
    if (existing && existing.phase === 'SUBMITTED') {
      return {
        phase: PHASE.SUBMITTED,
        answers: existing.answers || {},
        currentIndex: 0,
        securityEvents: existing.securityEvents || [],
        timeRemaining: 0,
        isTimerRunning: false,
        tabSwitchWarnings: 0,
        submittedAt: existing.submittedAt,
      };
    }
    return {
      phase: PHASE.INSTRUCTIONS,
      answers: {},
      currentIndex: 0,
      securityEvents: [],
      timeRemaining: INITIAL_SECONDS,
      isTimerRunning: false,
      tabSwitchWarnings: 0,
    };
  };

  const [init] = useState(initSession);
  const [phase, setPhase] = useState(init.phase);
  const [instructionsAcknowledged, setInstructionsAcknowledged] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(init.currentIndex);
  const [answers, setAnswers] = useState(init.answers);
  const [timeRemaining, setTimeRemaining] = useState(init.timeRemaining);
  const [isTimerRunning, setIsTimerRunning] = useState(init.isTimerRunning);
  const [securityEvents, setSecurityEvents] = useState(init.securityEvents);
  const [showViolationModal, setShowViolationModal] = useState(
    () => init.phase === PHASE.ACTIVE && !isFullscreen()
  );
  const [activeViolationType, setActiveViolationType] = useState(
    () => (init.phase === PHASE.ACTIVE && !isFullscreen() ? 'FULLSCREEN_EXIT' : null)
  );
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submittedAt, setSubmittedAt] = useState(init.submittedAt || null);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [tabSwitchWarnings, setTabSwitchWarnings] = useState(init.tabSwitchWarnings);

  const navigate = useNavigate();

  // Reset exam attempt
  const handleResetExam = () => {
    clearSession(examId);
    setAnswers({});
    setCurrentIndex(0);
    setSecurityEvents([]);
    setTimeRemaining(INITIAL_SECONDS);
    setIsTimerRunning(false);
    setShowViolationModal(false);
    setShowSubmitConfirm(false);
    setSubmittedAt(null);
    setAutoSubmitted(false);
    setTabSwitchWarnings(0);
    setInstructionsAcknowledged(false);
    setPhase(PHASE.INSTRUCTIONS);
  };

  // Ref to allow security callback to read latest state without stale closure
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── Security Event Handler ─────────────────────────────────────────────────
  const handleSecurityEvent = useCallback((event) => {
    if (phaseRef.current !== PHASE.ACTIVE) return;

    setSecurityEvents((prev) => {
      const updated = [...prev, event];
      // Persist to localStorage
      const session = loadSession(examId);
      if (session) saveSession(examId, { ...session, securityEvents: updated });
      return updated;
    });

    // Handle specific event types
    if (event.type === SECURITY_EVENT_TYPE.FULLSCREEN_EXIT) {
      setActiveViolationType('FULLSCREEN_EXIT');
      setShowViolationModal(true);
    }

    if (event.type === SECURITY_EVENT_TYPE.TAB_SWITCH) {
      setTabSwitchWarnings((prev) => {
        const next = prev + 1;
        if (next >= examMeta.maxTabSwitchWarnings) {
          setActiveViolationType('TAB_SWITCH');
          setShowViolationModal(true);
        }
        return next;
      });
    }

    // Stream event to backend for live invigilator monitoring
    recordExamEvent(examId, {
      studentId: examMeta.candidateId || 'STU001',
      studentName: examMeta.candidateName || 'Alex Morgan',
      type: event.type,
      severity: event.severity,
      message: event.message
    }).catch((err) => void err);
  }, [examId, examMeta.maxTabSwitchWarnings, examMeta.candidateId, examMeta.candidateName]);

  // ── Security listeners lifecycle ───────────────────────────────────────────
  const cleanupListenersRef = useRef(null);

  useEffect(() => {
    if (phase === PHASE.ACTIVE) {
      cleanupListenersRef.current = setupSecurityListeners(handleSecurityEvent);
    }
    return () => {
      if (cleanupListenersRef.current) {
        cleanupListenersRef.current();
        cleanupListenersRef.current = null;
      }
    };
  }, [phase, handleSecurityEvent]);


  // ── Restore session from localStorage on mount ─────────────────────────────
  // NOTE: Session is restored via lazy useState above (initSession function)
  // to avoid calling setState() synchronously inside a useEffect body.

  // ── Persist session during exam ────────────────────────────────────────────
  useEffect(() => {
    if (phase !== PHASE.ACTIVE) return;
    saveSession(examId, {
      phase: 'ACTIVE',
      answers,
      currentQuestion: currentIndex,
      securityEvents,
      timeRemainingSeconds: timeRemaining,
      tabSwitchWarnings,
      startedAt: loadSession(examId)?.startedAt || new Date().toISOString(),
    });
  }, [answers, currentIndex, timeRemaining, tabSwitchWarnings, phase, examId, securityEvents]);

  // ── Timer callbacks ────────────────────────────────────────────────────────
  const handleTimerTick = useCallback((secs) => {
    setTimeRemaining(secs);
  }, []);

  const handleTimerExpire = useCallback(() => {
    setIsTimerRunning(false);
    setAutoSubmitted(true);
    setSubmittedAt(new Date().toISOString());
    setPhase(PHASE.SUBMITTED);
    setSecurityEvents((prev) => [
      ...prev,
      createSecurityEvent(
        SECURITY_EVENT_TYPE.AUTO_SUBMITTED,
        SECURITY_SEVERITY.INFO,
        'Exam automatically submitted — time expired'
      ),
    ]);
    saveSession(examId, {
      phase: 'SUBMITTED',
      answers,
      securityEvents,
      submittedAt: new Date().toISOString(),
    });
    clearSession(examId);
    if (cleanupListenersRef.current) {
      cleanupListenersRef.current();
      cleanupListenersRef.current = null;
    }
    submitExam(examId, {
      studentId: examMeta.candidateId || 'STU001',
      studentName: examMeta.candidateName || 'Alex Morgan',
      answers,
      score: 0,
      totalQuestions: questions.length
    }).catch((err) => void err);
    exitFullscreen();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  // ── Start exam ─────────────────────────────────────────────────────────────
  const handleStartExam = async () => {
    try {
      await enterFullscreen();
    } catch (fsErr) {
      // Fullscreen may be blocked by browser settings — proceed anyway
      void fsErr;
    }
    const startedEvent = createSecurityEvent(
      SECURITY_EVENT_TYPE.EXAM_STARTED,
      SECURITY_SEVERITY.INFO,
      'Examination session started'
    );
    setSecurityEvents([startedEvent]);
    saveSession(examId, {
      phase: 'ACTIVE',
      answers: {},
      currentQuestion: 0,
      securityEvents: [startedEvent],
      timeRemainingSeconds: INITIAL_SECONDS,
      tabSwitchWarnings: 0,
      startedAt: new Date().toISOString(),
    });
    setPhase(PHASE.ACTIVE);
    setIsTimerRunning(true);
  };

  // ── Return to fullscreen after violation ───────────────────────────────────
  const handleReturnToFullscreen = async () => {
    try {
      await enterFullscreen();
    } catch (fsErr) {
      void fsErr;
    }
    setShowViolationModal(false);
    setActiveViolationType(null);
  };

  // ── Answer selection ───────────────────────────────────────────────────────
  const handleSelectAnswer = (optionOrCode) => {
    const qId = questions[currentIndex]?.id;
    if (!qId) return;
    setAnswers((prev) => ({ ...prev, [qId]: optionOrCode }));
  };

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goToQuestion = (idx) => {
    if (idx >= 0 && idx < questions.length) {
      setCurrentIndex(idx);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleConfirmSubmit = () => {
    setIsTimerRunning(false);
    const now = new Date().toISOString();
    setSubmittedAt(now);
    setPhase(PHASE.SUBMITTED);
    const submitEvent = createSecurityEvent(
      SECURITY_EVENT_TYPE.EXAM_SUBMITTED,
      SECURITY_SEVERITY.INFO,
      'Candidate submitted the examination'
    );
    const finalEvents = [...securityEvents, submitEvent];
    setSecurityEvents(finalEvents);
    saveSession(examId, {
      phase: 'SUBMITTED',
      answers,
      securityEvents: finalEvents,
      submittedAt: now,
    });
    if (cleanupListenersRef.current) {
      cleanupListenersRef.current();
      cleanupListenersRef.current = null;
    }
    submitExam(examId, {
      studentId: examMeta.candidateId || 'STU001',
      studentName: examMeta.candidateName || 'Alex Morgan',
      answers,
      score: 0,
      totalQuestions: questions.length
    }).catch((err) => void err);
    // Exit fullscreen
    exitFullscreen();
  };

  // ── Derived values ─────────────────────────────────────────────────────────
  const violations = countViolations(securityEvents);
  const secStatus = getSecurityStatus(violations);
  const answeredCount = Object.values(answers).filter(
    (v) => v !== undefined && v !== ''
  ).length;
  const currentQuestion = questions[currentIndex];

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  // ── Loading ────────────────────────────────────────────────────────────────
  if (phase === PHASE.LOADING) {
    return (
      <div style={styles.fullPage}>
        <div style={{ textAlign: 'center' }}>
          <div style={styles.loadSpinner} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '16px' }}>
            Initialising ProctorTrack™ secure session…
          </p>
        </div>
      </div>
    );
  }

  // ── Instructions ───────────────────────────────────────────────────────────
  if (phase === PHASE.INSTRUCTIONS) {
    return (
      <div style={styles.fullPage}>
        <div
          style={{
            width: '100%',
            maxWidth: '620px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-xl)',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: 'var(--primary-gradient)',
              padding: '28px 32px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Shield size={24} color="#26c6da" />
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: 'rgba(38,198,218,0.9)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  ProctorTrack™ Secure Examination
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/student')}
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  color: '#ffffff',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  padding: '5px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <ArrowLeft size={13} /> Back to Student Portal
              </button>
            </div>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 800,
                color: '#ffffff',
                margin: 0,
                letterSpacing: '-0.02em',
                lineHeight: 1.3,
              }}
            >
              {examMeta.title}
            </h1>
            <p
              style={{
                fontSize: '13px',
                color: 'rgba(255,255,255,0.8)',
                margin: 0,
                marginTop: '8px',
              }}>
              {examMeta.course} · {examMeta.instructor}
            </p>
          </div>

          {/* Exam details */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            {[
              { label: 'Duration', value: `${examMeta.durationMinutes} minutes` },
              { label: 'Questions', value: examMeta.totalQuestions },
              { label: 'Security Mode', value: examMeta.securityMode },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  padding: '16px 20px',
                  borderRight: '1px solid var(--border-subtle)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--pt-navy-900)' }}>
                  {value}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Candidate info */}
          <div
            style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <User size={16} color="var(--pt-navy-800)" />
            <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
              Candidate: <strong>{examMeta.candidateName}</strong> &nbsp;·&nbsp; ID:{' '}
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                {examMeta.candidateId}
              </span>
            </span>
          </div>

          {/* Instructions */}
          <div style={{ padding: '24px 28px' }}>
            <div
              style={{
                fontSize: '12.5px',
                fontWeight: 800,
                color: 'var(--pt-navy-800)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: '14px',
              }}
            >
              Examination Instructions
            </div>
            <ol style={{ margin: 0, paddingLeft: '22px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {[
                'Keep your face clearly visible to the webcam at all times.',
                'Do not switch browser tabs or open other windows during the exam.',
                'Do not copy, cut, or paste any content.',
                'You will be required to remain in fullscreen mode throughout the examination.',
                'Do not open any other applications on your device.',
                'Do not use any unauthorised reference materials or resources.',
                'Your webcam, screen activity, and keyboard behaviour are monitored.',
                'Repeated security violations may result in exam termination or disqualification.',
              ].map((item, i) => (
                <li key={i} style={{ fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: 1.55 }}>
                  {item}
                </li>
              ))}
            </ol>

            {/* ProctorTrack note */}
            <div
              style={{
                backgroundColor: 'var(--pt-blue-50)',
                border: '1px solid var(--pt-blue-100)',
                borderRadius: '8px',
                padding: '12px 16px',
                marginTop: '20px',
                fontSize: '12px',
                color: 'var(--pt-navy-700)',
                lineHeight: 1.55,
              }}
            >
              <strong>Note:</strong> This web application implements deterrence and detection
              measures. While the system monitors and logs all suspicious activity, no browser-based
              application can guarantee absolute prevention of all cheating methods. Security reports
              are reviewed by your institution after submission.
            </div>

            {/* Acknowledge checkbox */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginTop: '20px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={instructionsAcknowledged}
                onChange={(e) => setInstructionsAcknowledged(e.target.checked)}
                style={{ width: '17px', height: '17px', cursor: 'pointer', accentColor: 'var(--pt-navy-800)' }}
              />
              <span style={{ fontSize: '13.5px', color: 'var(--text-primary)', fontWeight: 500 }}>
                I have read and understood all examination instructions and security requirements.
              </span>
            </label>

            {/* Start button */}
            <button
              type="button"
              disabled={!instructionsAcknowledged}
              onClick={handleStartExam}
              style={{
                width: '100%',
                marginTop: '18px',
                padding: '14px',
                borderRadius: '10px',
                border: 'none',
                background: instructionsAcknowledged
                  ? 'var(--primary-gradient)'
                  : 'var(--border-subtle)',
                color: instructionsAcknowledged ? '#ffffff' : 'var(--text-muted)',
                fontSize: '15px',
                fontWeight: 700,
                cursor: instructionsAcknowledged ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '9px',
                transition: 'all 0.2s ease',
                letterSpacing: '0.01em',
              }}
            >
              <Maximize size={18} />
              Start Exam (Enter Fullscreen)
            </button>
          </div>
        </div>

        <style>{`
          @keyframes pt-load-spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  // ── Submitted ──────────────────────────────────────────────────────────────
  if (phase === PHASE.SUBMITTED) {
    return (
      <div style={styles.fullPage}>
        <div
          style={{
            width: '100%',
            maxWidth: '540px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-xl)',
            textAlign: 'center',
          }}
        >
          {/* Success header */}
          <div
            style={{
              background: autoSubmitted
                ? 'linear-gradient(135deg, #b45309 0%, #92400e 100%)'
                : 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
              padding: '32px 28px',
            }}
          >
            <CheckCircle size={48} color="#ffffff" style={{ marginBottom: '12px' }} />
            <h2
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: '#ffffff',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              {autoSubmitted
                ? 'Time Expired — Exam Auto-Submitted'
                : 'Examination Submitted Successfully'}
            </h2>
            <p
              style={{
                fontSize: '13px',
                color: 'rgba(255,255,255,0.8)',
                margin: 0,
                marginTop: '8px',
              }}>
              {autoSubmitted
                ? 'Your time ran out. All answers recorded up to this point have been saved.'
                : 'Your answers have been recorded and submitted to your institution.'}
            </p>
          </div>

          {/* Summary */}
          <div style={{ padding: '28px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '24px',
              }}
            >
              {[
                { label: 'Exam', value: examMeta.title },
                { label: 'Submitted At', value: submittedAt ? formatSubmissionTime(submittedAt) : '—' },
                { label: 'Questions Answered', value: `${answeredCount} / ${questions.length}` },
                { label: 'Questions Pending', value: `${questions.length - answeredCount} / ${questions.length}` },
                { label: 'Security Events', value: violations.total },
                { label: 'Tab Switches', value: violations.tabSwitches },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    border: '1px solid var(--border-subtle)',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                    {label}
                  </div>
                  <div style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--pt-navy-900)' }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <p
              style={{
                fontSize: '12.5px',
                color: 'var(--text-muted)',
                lineHeight: 1.6,
                marginBottom: '22px',
              }}
            >
              Your security report will be reviewed by your instructor.
              You may now close this window.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={() => navigate('/student')}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: 'var(--pt-navy-800)',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <ArrowLeft size={16} /> Return to Student Portal
              </button>

              <button
                type="button"
                onClick={handleResetExam}
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--border-subtle)',
                  backgroundColor: '#ffffff',
                  color: 'var(--text-secondary)',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '7px',
                }}
              >
                <RotateCcw size={15} /> Start New Attempt (Reset)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── ACTIVE EXAM ────────────────────────────────────────────────────────────
  return (
    <>
      {/* Security violation modal */}
      <SecurityViolationModal
        isVisible={showViolationModal}
        violationType={activeViolationType}
        fullscreenExits={violations.fullscreenExits}
        tabSwitches={violations.tabSwitches}
        onReturnToFullscreen={handleReturnToFullscreen}
      />

      {/* Submit confirmation modal */}
      {showSubmitConfirm && (
        <div style={styles.modalBackdrop}>
          <div style={styles.confirmModal}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--pt-navy-900)', margin: 0, marginBottom: '8px' }}>
              Submit Examination?
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.6 }}>
              Please confirm you want to submit your examination. This action cannot be undone.
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                backgroundColor: 'var(--bg-surface-subtle)',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '20px',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#047857' }}>{answeredCount}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Answered</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-secondary)' }}>
                  {questions.length - answeredCount}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Unanswered</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                style={styles.btnSecondary}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSubmitConfirm(false);
                  handleConfirmSubmit();
                }}
                style={styles.btnDanger}
              >
                Submit Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main exam layout */}
      <div style={styles.examShell}>
        {/* ── Top Bar ── */}
        <header style={styles.topBar}>
          {/* Left: exam info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexShrink: 0,
              }}
            >
              <Shield size={20} color="#26c6da" />
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: '-0.01em',
                }}
              >
                ProctorTrack™
              </span>
            </div>
            <div
              style={{
                width: '1px',
                height: '24px',
                backgroundColor: 'rgba(255,255,255,0.15)',
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: '#ffffff',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {examMeta.title}
              </div>
              <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.55)', marginTop: '1px' }}>
                {examMeta.candidateName} · {examMeta.candidateId}
              </div>
            </div>
          </div>

          {/* Center: timer */}
          <div style={{ flexShrink: 0 }}>
            <ExamTimer
              timeRemainingSeconds={timeRemaining}
              onTick={handleTimerTick}
              onExpire={handleTimerExpire}
              isRunning={isTimerRunning}
            />
          </div>

          {/* Right: security pill + submit */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '9999px',
                fontSize: '11.5px',
                fontWeight: 700,
                backgroundColor:
                  secStatus === 'SECURE'
                    ? 'rgba(22, 163, 74, 0.2)'
                    : secStatus === 'WARNING'
                    ? 'rgba(217, 119, 6, 0.25)'
                    : 'rgba(185, 28, 28, 0.25)',
                color:
                  secStatus === 'SECURE' ? '#4ade80' : secStatus === 'WARNING' ? '#fcd34d' : '#f87171',
                border: '1px solid',
                borderColor:
                  secStatus === 'SECURE'
                    ? 'rgba(74, 222, 128, 0.3)'
                    : secStatus === 'WARNING'
                    ? 'rgba(252, 211, 77, 0.3)'
                    : 'rgba(248, 113, 113, 0.3)',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'currentColor',
                  display: 'inline-block',
                }}
              />
              {secStatus === 'SECURE' ? 'Secure' : secStatus === 'WARNING' ? 'Warning' : 'High Risk'}
            </div>

            <button
              type="button"
              onClick={() => setShowSubmitConfirm(true)}
              style={styles.btnSubmit}
            >
              <LogOut size={14} />
              Submit Exam
            </button>
          </div>
        </header>

        {/* ── Content area ── */}
        <div style={styles.contentArea}>
          {/* LEFT: Questions column */}
          <main style={styles.questionPanel}>
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                padding: '28px 32px',
                boxShadow: 'var(--shadow-sm)',
                flex: 1,
                minHeight: 0,
              }}
            >
              {currentQuestion ? (
                <QuestionCard
                  question={currentQuestion}
                  questionNumber={currentIndex + 1}
                  totalQuestions={questions.length}
                  selectedIndex={answers[currentQuestion.id]}
                  onSelect={handleSelectAnswer}
                  onSecurityEvent={handleSecurityEvent}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <BookOpen size={40} color="var(--border-strong)" style={{ marginBottom: '12px' }} />
                  <p>No question found.</p>
                </div>
              )}
            </div>

            {/* Navigation buttons */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '16px',
              }}
            >
              <button
                type="button"
                onClick={() => goToQuestion(currentIndex - 1)}
                disabled={currentIndex === 0}
                style={{
                  ...styles.navBtn,
                  opacity: currentIndex === 0 ? 0.4 : 1,
                  cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronLeft size={17} /> Previous
              </button>

              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                {currentIndex + 1} / {questions.length}
              </span>

              {currentIndex < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => goToQuestion(currentIndex + 1)}
                  style={styles.navBtnPrimary}
                >
                  Save & Next <ChevronRight size={17} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSubmitConfirm(true)}
                  style={{ ...styles.navBtnPrimary, backgroundColor: '#047857' }}
                >
                  <CheckCircle size={15} /> Review & Submit
                </button>
              )}
            </div>
          </main>

          {/* RIGHT: Sidebar panels */}
          <aside style={styles.sidePanel}>
            <QuestionNavigator
              totalQuestions={questions.length}
              currentIndex={currentIndex}
              answers={answers}
              questions={questions}
              onNavigate={goToQuestion}
            />
            <SecurityStatus status={secStatus} counts={violations} />
            <SecurityActivity events={securityEvents} />
            <CameraPreview candidateName={examMeta.candidateName} isActive={phase === PHASE.ACTIVE} />
          </aside>
        </div>
      </div>
    </>
  );
}

// ─── Style constants ───────────────────────────────────────────────────────────
const styles = {
  fullPage: {
    minHeight: '100vh',
    backgroundColor: 'var(--bg-app)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    fontFamily: 'var(--font-family)',
  },
  loadSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid var(--border-subtle)',
    borderTopColor: 'var(--pt-navy-800)',
    borderRadius: '50%',
    animation: 'pt-load-spin 0.8s linear infinite',
    margin: '0 auto',
  },
  examShell: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-app)',
    fontFamily: 'var(--font-family)',
  },
  topBar: {
    backgroundColor: 'var(--pt-navy-900)',
    borderBottom: '1px solid var(--sidebar-border)',
    padding: '0 24px',
    height: '62px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    flexShrink: 0,
  },
  contentArea: {
    flex: 1,
    display: 'flex',
    gap: '20px',
    padding: '20px',
    alignItems: 'flex-start',
    maxWidth: '1400px',
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  questionPanel: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  sidePanel: {
    width: '280px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  navBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 18px',
    borderRadius: '8px',
    border: '1.5px solid var(--border-subtle)',
    backgroundColor: '#ffffff',
    color: 'var(--text-secondary)',
    fontSize: '13.5px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  navBtnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    background: 'var(--primary-gradient)',
    color: '#ffffff',
    fontSize: '13.5px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  btnSubmit: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    borderRadius: '7px',
    border: '1.5px solid rgba(185,28,28,0.5)',
    backgroundColor: 'rgba(185,28,28,0.15)',
    color: '#fca5a5',
    fontSize: '12.5px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 9000,
    backgroundColor: 'rgba(7,21,36,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    backdropFilter: 'blur(3px)',
  },
  confirmModal: {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    padding: '28px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: 'var(--shadow-xl)',
  },
  btnSecondary: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: '1.5px solid var(--border-subtle)',
    backgroundColor: '#ffffff',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnDanger: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
};
