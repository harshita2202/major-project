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
  AlertOctagon,
  Award,
  AlertTriangle,
} from 'lucide-react';

import ExamTimer from '../components/exam/ExamTimer';
import QuestionCard from '../components/exam/QuestionCard';
import QuestionNavigator from '../components/exam/QuestionNavigator';
import SecurityViolationModal from '../components/exam/SecurityViolationModal';
import CameraPreview from '../components/exam/CameraPreview';
import { subscribeToSessionEvents } from '../services/websocket';

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
import {
  getExamQuestions,
  submitExam,
  recordExamEvent,
  startExamAttempt,
  updateExamProgress,
  endExamAttempt,
} from '../services/api';

// ─── Exam phase constants ──────────────────────────────────────────────────────
const PHASE = {
  LOADING: 'LOADING',
  INSTRUCTIONS: 'INSTRUCTIONS',
  ACTIVE: 'ACTIVE',
  SUBMITTED: 'SUBMITTED',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
export function calculateExamScore(questionList = [], currentAnswers = {}) {
  if (!questionList || questionList.length === 0) {
    return { score: 0, correctCount: 0, totalQuestions: 0, percentage: 0 };
  }
  let correct = 0;
  questionList.forEach((q) => {
    const studentAns = currentAnswers[q.id];
    if (studentAns !== undefined && studentAns !== null && studentAns !== '') {
      if (q.type === 'coding') {
        if (typeof studentAns === 'string' && studentAns.trim().length > 15) {
          correct += 1;
        }
      } else {
        if (q.correctIndex !== undefined && q.correctIndex !== null) {
          if (Number(studentAns) === Number(q.correctIndex)) {
            correct += 1;
          }
        } else {
          correct += 1;
        }
      }
    }
  });
  const total = questionList.length;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  return {
    score: percentage,
    correctCount: correct,
    totalQuestions: total,
    percentage,
  };
}

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
  const MAX_TAB_SWITCHES = examMeta.maxTabSwitchWarnings || 3;
  const MAX_FULLSCREEN_EXITS = 3;

  // ── State ──────────────────────────────────────────────────────────────────
  // Lazily derive initial state from localStorage to avoid setState-in-effect
  const initSession = () => {
    const existing = loadSession(examId);
    if (existing && existing.phase === 'ACTIVE') {
      return {
        sessionId: existing.sessionId || null,
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
        fullscreenExitsCount: existing.fullscreenExitsCount || 0,
        autoTerminated: existing.autoTerminated || false,
        terminationReason: existing.terminationReason || '',
        scoreData: existing.scoreData || { score: 0, correctCount: 0, totalQuestions: 0, percentage: 0 },
      };
    }
    if (existing && existing.phase === 'SUBMITTED') {
      return {
        sessionId: existing.sessionId || null,
        phase: PHASE.SUBMITTED,
        answers: existing.answers || {},
        currentIndex: 0,
        securityEvents: existing.securityEvents || [],
        timeRemaining: 0,
        isTimerRunning: false,
        tabSwitchWarnings: existing.tabSwitchWarnings || 0,
        fullscreenExitsCount: existing.fullscreenExitsCount || 0,
        submittedAt: existing.submittedAt,
        autoSubmitted: existing.autoSubmitted || false,
        autoTerminated: existing.autoTerminated || false,
        terminationReason: existing.terminationReason || '',
        scoreData: existing.scoreData || { score: 0, correctCount: 0, totalQuestions: 0, percentage: 0 },
      };
    }
    return {
      sessionId: null,
      phase: PHASE.INSTRUCTIONS,
      answers: {},
      currentIndex: 0,
      securityEvents: [],
      timeRemaining: INITIAL_SECONDS,
      isTimerRunning: false,
      tabSwitchWarnings: 0,
      fullscreenExitsCount: 0,
      autoTerminated: false,
      terminationReason: '',
      scoreData: { score: 0, correctCount: 0, totalQuestions: 0, percentage: 0 },
    };
  };

  const [init] = useState(initSession);
  const [sessionId, setSessionId] = useState(init.sessionId || null);
  const [phase, setPhase] = useState(init.phase);
  const [instructionsAcknowledged, setInstructionsAcknowledged] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(init.currentIndex);
  const [answers, setAnswers] = useState(init.answers);
  const [timeRemaining, setTimeRemaining] = useState(init.timeRemaining);
  const [isTimerRunning, setIsTimerRunning] = useState(init.isTimerRunning);
  const [securityEvents, setSecurityEvents] = useState(init.securityEvents);
  const [activeWarningMessage, setActiveWarningMessage] = useState('');
  const [isMediumWarning, setIsMediumWarning] = useState(false);
  const [showViolationModal, setShowViolationModal] = useState(
    () => init.phase === PHASE.ACTIVE && !isFullscreen()
  );
  const [activeViolationType, setActiveViolationType] = useState(
    () => (init.phase === PHASE.ACTIVE && !isFullscreen() ? 'FULLSCREEN_EXIT' : null)
  );
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submittedAt, setSubmittedAt] = useState(init.submittedAt || null);
  const [autoSubmitted, setAutoSubmitted] = useState(init.autoSubmitted || false);
  const [autoTerminated, setAutoTerminated] = useState(init.autoTerminated || false);
  const [terminationReason, setTerminationReason] = useState(init.terminationReason || '');
  const [tabSwitchWarnings, setTabSwitchWarnings] = useState(init.tabSwitchWarnings || 0);
  const [fullscreenExitsCount, setFullscreenExitsCount] = useState(init.fullscreenExitsCount || 0);
  const [scoreData, setScoreData] = useState(
    init.scoreData || { score: 0, correctCount: 0, totalQuestions: 0, percentage: 0 }
  );

  const navigate = useNavigate();

  // Reset exam attempt
  const handleResetExam = () => {
    clearSession(examId);
    setSessionId(null);
    setAnswers({});
    setCurrentIndex(0);
    setSecurityEvents([]);
    setTimeRemaining(INITIAL_SECONDS);
    setIsTimerRunning(false);
    setShowViolationModal(false);
    setShowSubmitConfirm(false);
    setSubmittedAt(null);
    setAutoSubmitted(false);
    setAutoTerminated(false);
    setActiveWarningMessage('');
    setIsMediumWarning(false);
    setTerminationReason('');
    setTabSwitchWarnings(0);
    setFullscreenExitsCount(0);
    setScoreData({ score: 0, correctCount: 0, totalQuestions: 0, percentage: 0 });
    setInstructionsAcknowledged(false);
    setPhase(PHASE.INSTRUCTIONS);
  };

  // Refs to allow async callbacks to read latest state without stale closure
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const answersRef = useRef(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  const questionsRef = useRef(questions);
  useEffect(() => { questionsRef.current = questions; }, [questions]);

  const securityEventsRef = useRef(securityEvents);
  useEffect(() => { securityEventsRef.current = securityEvents; }, [securityEvents]);

  const sessionIdRef = useRef(sessionId);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

  // ── Auto-Termination Handler ───────────────────────────────────────────────
  const handleAutoTerminate = useCallback((reason) => {
    if (phaseRef.current === PHASE.SUBMITTED) return;
    setIsTimerRunning(false);
    setAutoTerminated(true);
    setTerminationReason(reason);
    setPhase(PHASE.SUBMITTED);
    setShowViolationModal(false);
    setShowSubmitConfirm(false);
    const now = new Date().toISOString();
    setSubmittedAt(now);

    const calculated = calculateExamScore(questionsRef.current, answersRef.current);
    setScoreData(calculated);

    const termEvent = createSecurityEvent(
      SECURITY_EVENT_TYPE.AUTO_SUBMITTED,
      SECURITY_SEVERITY.CRITICAL,
      `Exam Disqualified & Auto-Terminated: ${reason}`
    );
    const finalEvents = [...securityEventsRef.current, termEvent];
    setSecurityEvents(finalEvents);

    if (cleanupListenersRef.current) {
      cleanupListenersRef.current();
      cleanupListenersRef.current = null;
    }

    saveSession(examId, {
      sessionId: sessionIdRef.current,
      phase: 'SUBMITTED',
      answers: answersRef.current,
      securityEvents: finalEvents,
      submittedAt: now,
      autoTerminated: true,
      terminationReason: reason,
      scoreData: calculated,
    });

    submitExam(examId, {
      studentId: examMeta.candidateId || 'STU001',
      studentName: examMeta.candidateName || 'Alex Morgan',
      answers: answersRef.current,
      score: calculated.score,
      correctCount: calculated.correctCount,
      totalQuestions: questionsRef.current.length,
      status: 'AUTO_SUBMITTED',
      terminationReason: reason,
    }).catch((err) => void err);

    endExamAttempt(examMeta.candidateId || 'STU001', 'disqualified');

    exitFullscreen();
  }, [examId, examMeta.candidateId, examMeta.candidateName]);

  // ── Security Event Handler (Reporting to Centralized Backend) ──────────────
  const handleSecurityEvent = useCallback((event) => {
    if (phaseRef.current !== PHASE.ACTIVE) return;

    setSecurityEvents((prev) => {
      const updated = [...prev, event];
      const session = loadSession(examId);
      if (session) saveSession(examId, { ...session, securityEvents: updated });
      return updated;
    });

    if (event.type === SECURITY_EVENT_TYPE.FULLSCREEN_EXIT) {
      setFullscreenExitsCount((prev) => prev + 1);
    }
    if (event.type === SECURITY_EVENT_TYPE.TAB_SWITCH) {
      setTabSwitchWarnings((prev) => prev + 1);
    }

    // Stream event to backend for centralized risk scoring, database persistence & live broadcasting
    recordExamEvent(examId, {
      sessionId: sessionIdRef.current,
      studentId: examMeta.candidateId || currentUser?.userId || 'STU001',
      studentName: examMeta.candidateName || currentUser?.name || 'Alex Morgan',
      type: event.type,
      severity: event.severity,
      message: event.message
    }).then((res) => {
      if (!res) return;

      if (res.sessionId && !sessionIdRef.current) {
        setSessionId(res.sessionId);
      }

      // Check auto-submitted threshold (score >= 80)
      if (res.autoSubmitted) {
        handleAutoTerminate(
          res.autoSubmitMessage ||
          'Your exam has been automatically submitted because the proctoring risk threshold was reached.'
        );
        return;
      }

      // Check medium risk warning threshold (score >= 50)
      if (res.mediumWarningTriggered && res.mediumWarningMessage) {
        setActiveWarningMessage(res.mediumWarningMessage);
        setIsMediumWarning(true);
        setActiveViolationType(event.type);
        setShowViolationModal(true);
        return;
      }

      // Feature-specific warning returned from backend
      if (res.warningMessage) {
        setActiveWarningMessage(res.warningMessage);
        setIsMediumWarning(false);
        setActiveViolationType(event.type);
        setShowViolationModal(true);
      } else if (event.type === SECURITY_EVENT_TYPE.FULLSCREEN_EXIT) {
        setActiveWarningMessage('Do not exit fullscreen. Repeated violations may result in automatic exam submission.');
        setIsMediumWarning(false);
        setActiveViolationType('FULLSCREEN_EXIT');
        setShowViolationModal(true);
      }
    }).catch((err) => {
      console.warn('Backend event evaluation notice:', err);
      if (event.type === SECURITY_EVENT_TYPE.FULLSCREEN_EXIT) {
        setActiveWarningMessage('Do not exit fullscreen. Repeated violations may result in automatic exam submission.');
        setIsMediumWarning(false);
        setActiveViolationType('FULLSCREEN_EXIT');
        setShowViolationModal(true);
      }
    });
  }, [examId, examMeta.candidateId, examMeta.candidateName, currentUser?.userId, currentUser?.name, handleAutoTerminate]);

  // ── WebSocket live session listener (for instant auto-submit from backend) ──
  useEffect(() => {
    if (phase !== PHASE.ACTIVE || !sessionId) return;
    const unsubscribe = subscribeToSessionEvents(sessionId, (data) => {
      if (data && data.autoSubmitted) {
        handleAutoTerminate(
          data.autoSubmitMessage ||
          'Your exam has been automatically submitted because the proctoring risk threshold was reached.'
        );
      }
    });
    return () => {
      unsubscribe();
    };
  }, [phase, sessionId, handleAutoTerminate]);

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
      fullscreenExitsCount,
      startedAt: loadSession(examId)?.startedAt || new Date().toISOString(),
    });
  }, [answers, currentIndex, timeRemaining, tabSwitchWarnings, fullscreenExitsCount, phase, examId, securityEvents]);

  // ── Sync active attempt & progress with invigilator dashboard ─────────────
  useEffect(() => {
    if (phase !== PHASE.ACTIVE) return;

    const studentId = examMeta.candidateId || currentUser?.userId || 'STU001';
    const totalQ = questions.length || 1;
    const answered = Object.values(answers).filter((v) => v !== undefined && v !== '').length;
    const progressPercent = Math.min(100, Math.round((answered / totalQ) * 100));

    const sHours = Math.floor(timeRemaining / 3600);
    const sMins = Math.floor((timeRemaining % 3600) / 60);
    const sSecs = timeRemaining % 60;
    const formatted = `${String(sHours).padStart(2, '0')}:${String(sMins).padStart(2, '0')}:${String(sSecs).padStart(2, '0')}`;

    updateExamProgress({
      studentId,
      progress: progressPercent,
      timeRemainingSeconds: timeRemaining,
      timeRemainingFormatted: formatted,
      status: 'active'
    });
  }, [answers, timeRemaining, phase, questions.length, examMeta.candidateId, currentUser?.userId]);

  // ── Timer callbacks ────────────────────────────────────────────────────────
  const handleTimerTick = useCallback((secs) => {
    setTimeRemaining(secs);
  }, []);

  const handleTimerExpire = useCallback(() => {
    setIsTimerRunning(false);
    setAutoSubmitted(true);
    const now = new Date().toISOString();
    setSubmittedAt(now);
    setPhase(PHASE.SUBMITTED);
    const calculated = calculateExamScore(questionsRef.current, answersRef.current);
    setScoreData(calculated);
    const expireEvent = createSecurityEvent(
      SECURITY_EVENT_TYPE.AUTO_SUBMITTED,
      SECURITY_SEVERITY.INFO,
      'Exam automatically submitted — time expired'
    );
    const finalEvents = [...securityEventsRef.current, expireEvent];
    setSecurityEvents(finalEvents);
    saveSession(examId, {
      phase: 'SUBMITTED',
      answers: answersRef.current,
      securityEvents: finalEvents,
      submittedAt: now,
      autoSubmitted: true,
      scoreData: calculated,
    });
    clearSession(examId);
    if (cleanupListenersRef.current) {
      cleanupListenersRef.current();
      cleanupListenersRef.current = null;
    }
    submitExam(examId, {
      studentId: examMeta.candidateId || 'STU001',
      studentName: examMeta.candidateName || 'Alex Morgan',
      answers: answersRef.current,
      score: calculated.score,
      correctCount: calculated.correctCount,
      totalQuestions: questionsRef.current.length,
      status: 'time_expired',
    }).catch((err) => void err);
    endExamAttempt(examMeta.candidateId || 'STU001', 'completed');
    exitFullscreen();
  }, [examId, examMeta.candidateId, examMeta.candidateName]);

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
    const sHours = Math.floor(INITIAL_SECONDS / 3600);
    const sMins = Math.floor((INITIAL_SECONDS % 3600) / 60);
    const sSecs = INITIAL_SECONDS % 60;
    const durFormatted = `${String(sHours).padStart(2, '0')}:${String(sMins).padStart(2, '0')}:${String(sSecs).padStart(2, '0')}`;

    let startedSessionId = null;
    try {
      const attemptRes = await startExamAttempt({
        examId,
        studentId: examMeta.candidateId || currentUser?.userId || 'STU001',
        studentName: examMeta.candidateName || currentUser?.name || 'Alex Johnson',
        email: currentUser?.email || `${(examMeta.candidateId || 'stu001').toLowerCase()}@university.edu`,
        examTitle: examMeta.name || examMeta.title || `Exam ${examId}`,
        timeRemainingSeconds: INITIAL_SECONDS,
        totalDurationSeconds: INITIAL_SECONDS,
        timeRemainingFormatted: durFormatted,
        totalDurationFormatted: durFormatted,
      });

      if (attemptRes && attemptRes.sessionId) {
        startedSessionId = attemptRes.sessionId;
        setSessionId(startedSessionId);
      }
    } catch (err) {
      console.warn('startExamAttempt sync:', err);
    }

    saveSession(examId, {
      sessionId: startedSessionId,
      phase: 'ACTIVE',
      answers: {},
      currentQuestion: 0,
      securityEvents: [startedEvent],
      timeRemainingSeconds: INITIAL_SECONDS,
      tabSwitchWarnings: 0,
      fullscreenExitsCount: 0,
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
    const calculated = calculateExamScore(questions, answers);
    setScoreData(calculated);
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
      scoreData: calculated,
      autoTerminated: false,
    });
    if (cleanupListenersRef.current) {
      cleanupListenersRef.current();
      cleanupListenersRef.current = null;
    }
    submitExam(examId, {
      studentId: examMeta.candidateId || 'STU001',
      studentName: examMeta.candidateName || 'Alex Morgan',
      answers,
      score: calculated.score,
      correctCount: calculated.correctCount,
      totalQuestions: questions.length,
      status: 'submitted',
    }).catch((err) => void err);

    endExamAttempt(examMeta.candidateId || 'STU001', 'completed');

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
    const isPassing = scoreData.score >= 50;

    return (
      <div style={styles.fullPage}>
        <div
          style={{
            width: '100%',
            maxWidth: '560px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: autoTerminated ? '2px solid #ef4444' : '1px solid var(--border-subtle)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-xl)',
            textAlign: 'center',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: autoTerminated
                ? 'linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%)'
                : autoSubmitted
                ? 'linear-gradient(135deg, #b45309 0%, #92400e 100%)'
                : 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
              padding: '32px 28px',
            }}
          >
            {autoTerminated ? (
              <AlertOctagon size={48} color="#ffffff" style={{ marginBottom: '12px' }} />
            ) : autoSubmitted ? (
              <AlertTriangle size={48} color="#ffffff" style={{ marginBottom: '12px' }} />
            ) : (
              <CheckCircle size={48} color="#ffffff" style={{ marginBottom: '12px' }} />
            )}
            <h2
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: '#ffffff',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              {autoTerminated
                ? 'Exam Auto-Terminated (Disqualified)'
                : autoSubmitted
                ? 'Time Expired — Exam Auto-Submitted'
                : 'Examination Submitted Successfully'}
            </h2>
            <p
              style={{
                fontSize: '13px',
                color: 'rgba(255,255,255,0.88)',
                margin: 0,
                marginTop: '8px',
                lineHeight: 1.5,
              }}>
              {autoTerminated
                ? terminationReason || 'Security infractions exceeded the allowed threshold. Exam session has been closed.'
                : autoSubmitted
                ? 'Your time ran out. All answers recorded up to this point have been saved and evaluated.'
                : 'Your answers have been recorded, evaluated, and submitted to your institution.'}
            </p>
          </div>

          {/* Body */}
          <div style={{ padding: '28px' }}>
            {/* Score Card */}
            <div
              style={{
                background: 'linear-gradient(135deg, #071524 0%, #0f2b48 100%)',
                borderRadius: '12px',
                padding: '20px 24px',
                color: '#ffffff',
                marginBottom: '22px',
                border: '1px solid rgba(38,198,218,0.3)',
                boxShadow: '0 4px 16px rgba(7,21,36,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#26c6da',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Award size={14} color="#26c6da" /> Evaluated Exam Score
                </div>
                <div
                  style={{
                    fontSize: '36px',
                    fontWeight: 900,
                    marginTop: '2px',
                    color: '#ffffff',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {scoreData.score}%
                </div>
                <div style={{ fontSize: '12.5px', color: '#94b4cf', marginTop: '2px' }}>
                  <strong>{scoreData.correctCount}</strong> of <strong>{scoreData.totalQuestions || questions.length}</strong> questions answered correctly
                </div>
              </div>

              <div
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  backgroundColor:
                    scoreData.score >= 70
                      ? 'rgba(16, 185, 129, 0.2)'
                      : isPassing
                      ? 'rgba(56, 189, 248, 0.2)'
                      : 'rgba(239, 68, 68, 0.2)',
                  border:
                    '1px solid ' +
                    (scoreData.score >= 70 ? '#10b981' : isPassing ? '#38bdf8' : '#ef4444'),
                  color:
                    scoreData.score >= 70 ? '#34d399' : isPassing ? '#7dd3fc' : '#f87171',
                  fontWeight: 800,
                  fontSize: '12px',
                  letterSpacing: '0.04em',
                  textAlign: 'center',
                }}
              >
                {scoreData.score >= 70
                  ? 'PASSED · EXCELLENT'
                  : isPassing
                  ? 'PASSED · SATISFACTORY'
                  : 'BELOW PASSING'}
              </div>
            </div>

            {/* Summary Grid */}
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
                { label: 'Final Score', value: `${scoreData.score}% (${scoreData.correctCount}/${scoreData.totalQuestions || questions.length})` },
                { label: 'Completion Status', value: autoTerminated ? 'Disqualified' : autoSubmitted ? 'Auto-Submitted' : 'Completed' },
                { label: 'Questions Answered', value: `${answeredCount} / ${questions.length}` },
                { label: 'Questions Pending', value: `${questions.length - answeredCount} / ${questions.length}` },
                { label: 'Security Events', value: violations.total },
                { label: 'Tab Switches', value: `${tabSwitchWarnings} / ${MAX_TAB_SWITCHES}` },
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
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: '4px',
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color:
                        label === 'Final Score'
                          ? isPassing
                            ? '#047857'
                            : '#b91c1c'
                          : label === 'Completion Status' && autoTerminated
                          ? '#b91c1c'
                          : 'var(--pt-navy-900)',
                    }}
                  >
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
              {autoTerminated
                ? 'Your proctor and examination committee have been notified of this security termination.'
                : 'Your security audit report and evaluated score have been recorded in the invigilation system.'}
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
        warningMessage={activeWarningMessage}
        isMediumWarning={isMediumWarning}
        fullscreenExits={fullscreenExitsCount}
        tabSwitches={tabSwitchWarnings}
        maxTabSwitches={MAX_TAB_SWITCHES}
        maxFullscreenExits={MAX_FULLSCREEN_EXITS}
        isTerminated={autoTerminated}
        terminationReason={terminationReason}
        onReturnToFullscreen={handleReturnToFullscreen}
        onClose={() => setShowViolationModal(false)}
        onAcknowledgeTermination={() => {
          setShowViolationModal(false);
          setPhase(PHASE.SUBMITTED);
        }}
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

          {/* Right: status pill + submit */}
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
                backgroundColor: 'rgba(38, 198, 218, 0.15)',
                color: '#26c6da',
                border: '1px solid rgba(38, 198, 218, 0.3)',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#26c6da',
                  display: 'inline-block',
                }}
              />
              Active Session
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
            <CameraPreview candidateName={examMeta.candidateName} isActive={phase === PHASE.ACTIVE} />
            <QuestionNavigator
              totalQuestions={questions.length}
              currentIndex={currentIndex}
              answers={answers}
              questions={questions}
              onNavigate={goToQuestion}
            />
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
