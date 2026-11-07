import { getExams, getExamSubmissions, createExam } from './api';
import { getAllSessions } from './examSecurity';

/**
 * Creates a fresh published test exam in the backend so the candidate always has
 * an active, unattempted exam available to test Gaze, Dual-Camera, and Proctoring models.
 */
export async function createFreshModelTestExam(studentId = 'STU001') {
  const suffix = Date.now().toString().slice(-4);
  const examId = `exam-gaze-test-${suffix}`;
  const payload = {
    id: examId,
    code: `AI-TEST-${suffix}`,
    name: `AI Gaze & Proctoring Model Test (#${suffix})`,
    description:
      'Live verification exam for testing L2CS-Net Gaze Detection, Head Pose, Missing/Multiple Face detection, and Mobile WebRTC Dual-Camera proctoring.',
    date: 'Today',
    time: '12:01 AM',
    startTime: '12:01 AM',
    endTime: '11:59 PM',
    windowStartDate: 'Today',
    windowEndDate: 'Tomorrow',
    duration: '60 mins',
    durationMinutes: 60,
    proctoringMode: 'Strict AI',
    type: 'mixed',
    status: 'published',
    instructions:
      'Keep your face visible in the webcam, test looking at the screen vs looking away for 6+ seconds, and pair your mobile phone if testing dual-camera proctoring.',
    assignedStudents: [
      { id: 'STU001', name: 'Alex Morgan', email: 'alex.morgan@university.edu' },
      { id: 'STU002', name: 'David Chen', email: 'david.chen@university.edu' },
      { id: 'STU003', name: 'Sarah Jenkins', email: 'sarah.j@university.edu' },
      { id: 'STU004', name: 'Marcus Brody', email: 'm.brody@university.edu' },
      { id: 'STU005', name: 'Emma Watson', email: 'emma.w@university.edu' },
      ...(studentId && !['STU001', 'STU002', 'STU003', 'STU004', 'STU005'].includes(studentId)
        ? [{ id: studentId, name: `Candidate ${studentId}`, email: `${studentId.toLowerCase()}@university.edu` }]
        : []),
    ],
    questions: [
      {
        id: `q-gaze-1-${suffix}`,
        type: 'mcq',
        title: 'Gaze Estimation & Screen Mapping',
        question:
          'When a webcam is mounted at the top bezel of a laptop screen, what vertical pitch angle range corresponds to looking naturally at the exam screen?',
        marks: 5,
        difficulty: 'Easy',
        options: [
          'Between -38° and +18° (slightly downward from top camera toward screen)',
          'Exactly +90° straight up at the ceiling',
          'Between -170° and -180° behind the laptop',
          'Pitch angle is not used in gaze estimation',
        ],
        correctIndex: 0,
        explanation:
          'Because the webcam sits at the top edge of the laptop lid, looking at the center or bottom of the screen produces a natural downward pitch.',
      },
      {
        id: `q-gaze-2-${suffix}`,
        type: 'mcq',
        title: 'Multi-Face & Absence Detection',
        question:
          'How does the proctoring pipeline avoid false alarms from brief blinks or momentary camera adjustments at the start of an exam?',
        marks: 5,
        difficulty: 'Medium',
        options: [
          'By applying a startup warm-up grace period and requiring consecutive suspicious frames',
          'By disabling the camera after the first frame',
          'By ignoring all proctoring events during the entire exam',
          'By refreshing the browser every 2 seconds',
        ],
        correctIndex: 0,
        explanation:
          'A startup grace period and consecutive-frame streak requirement prevent momentary flickers from triggering false warnings.',
      },
      {
        id: `q-gaze-3-${suffix}`,
        type: 'coding',
        title: 'Risk Score Threshold Evaluator',
        question:
          'Read two space-separated integers `currentScore` and `addedPenalty` from standard input and print `FLAGGED` if their sum is at least 80, or `SAFE` otherwise.',
        marks: 10,
        difficulty: 'Easy',
        inputFormat: 'Two space-separated integers: currentScore and addedPenalty',
        outputFormat: 'Single word: FLAGGED or SAFE',
        allowedLanguages: 'javascript,python,java',
        starterCode: {
          javascript:
            "const fs = require('fs');\nconst [a, b] = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/).map(Number);\nconsole.log((a + b) >= 80 ? 'FLAGGED' : 'SAFE');",
          python:
            "import sys\na, b = map(int, sys.stdin.read().split())\nprint('FLAGGED' if (a + b) >= 80 else 'SAFE')",
        },
        sampleTestCases: [
          { input: '60 25', expectedOutput: 'FLAGGED' },
          { input: '30 15', expectedOutput: 'SAFE' },
        ],
        hiddenTestCases: [{ input: '80 0', expectedOutput: 'FLAGGED' }],
      },
    ],
  };

  return await createExam(payload);
}

/**
 * Loads and categorizes exams for a student into:
 * - upcomingExams: only upcoming, unattempted assessments
 * - attemptedExams: previously attempted, completed, or in-progress assessments
 *
 * @param {string} studentId
 * @returns {Promise<{ upcomingExams: Array, attemptedExams: Array }>}
 */
export async function fetchCategorizedStudentExams(studentId) {
  const [allExams, submissions] = await Promise.all([
    getExams(studentId).catch(() => []),
    getExamSubmissions(studentId).catch(() => []),
  ]);
  const localSessions = getAllSessions();

  const submissionMap = new Map();
  submissions.forEach((s) => {
    if (s.examId) {
      submissionMap.set(s.examId, s);
    }
  });

  const upcomingExams = [];
  const attemptedExams = [];
  const seenExamIds = new Set();

  allExams.forEach((exam) => {
    // Never show draft exams to students
    if (exam.status?.toLowerCase() === 'draft') return;

    seenExamIds.add(exam.id);
    const sub = submissionMap.get(exam.id);
    const localSession = localSessions[exam.id];

    const isSubmitted = !!sub || localSession?.phase === 'SUBMITTED';
    const isInProgress =
      localSession?.phase === 'ACTIVE' ||
      exam.status?.toLowerCase() === 'in-progress' ||
      exam.status?.toLowerCase() === 'in_progress';
    const isCompleted = exam.status?.toLowerCase() === 'completed';
    const isAttempted = isSubmitted || isCompleted || isInProgress;

    if (isAttempted) {
      const score = localSession?.scoreData?.score ?? sub?.score ?? (isCompleted ? 85 : 0);
      const totalQuestions =
        localSession?.scoreData?.totalQuestions ?? sub?.totalQuestions ?? exam.totalQuestions ?? 20;
      const correctCount =
        localSession?.scoreData?.correctCount ??
        (sub?.score !== undefined ? sub.score : Math.round((totalQuestions * score) / 100));
      const percentage =
        localSession?.scoreData?.percentage ??
        (totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : score);

      let statusBadge = 'Completed';
      if (localSession?.autoTerminated) {
        statusBadge = 'Disqualified';
      } else if (sub?.status) {
        statusBadge = sub.status.charAt(0).toUpperCase() + sub.status.slice(1);
      } else if (isInProgress) {
        statusBadge = 'In Progress';
      } else if (exam.status) {
        statusBadge = exam.status.charAt(0).toUpperCase() + exam.status.slice(1);
      }

      attemptedExams.push({
        ...exam,
        submission: sub || null,
        localSession: localSession || null,
        score,
        correctCount,
        totalQuestions,
        percentage,
        submittedAt: localSession?.submittedAt ?? sub?.submittedAt ?? exam.date,
        attemptStatus: statusBadge,
        isInProgress,
        autoTerminated: !!localSession?.autoTerminated,
      });
    } else {
      upcomingExams.push(exam);
    }
  });

  // Auto-provision a fresh Model Test Exam if the student has no available (OPEN) upcoming exams
  const hasOpenExam = upcomingExams.some((e) => e.windowStatus !== 'CLOSED' && e.windowStatus !== 'UPCOMING');
  if (!hasOpenExam) {
    try {
      const freshExam = await createFreshModelTestExam(studentId);
      if (freshExam && freshExam.id) {
        upcomingExams.unshift(freshExam);
      }
    } catch (err) {
      console.warn('Could not auto-create fresh model test exam:', err);
    }
  }

  // Include any extra submissions recorded in DB not present in exams catalog
  submissions.forEach((sub) => {
    if (sub.examId && !seenExamIds.has(sub.examId)) {
      seenExamIds.add(sub.examId);
      const localSession = localSessions[sub.examId];
      const totalQ = sub.totalQuestions || 20;
      const score = sub.score || 0;
      const pct = totalQ > 0 ? Math.round((score / totalQ) * 100) : score;

      attemptedExams.push({
        id: sub.examId,
        code: sub.examId.toUpperCase(),
        name: `Assessment ${sub.examId}`,
        description: 'Completed proctored assessment record.',
        duration: '60 mins',
        date: sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : 'Recent',
        status: 'Completed',
        submission: sub,
        localSession: localSession || null,
        score,
        correctCount: score,
        totalQuestions: totalQ,
        percentage: pct,
        submittedAt: sub.submittedAt || new Date().toISOString(),
        attemptStatus: sub.status ? sub.status.charAt(0).toUpperCase() + sub.status.slice(1) : 'Completed',
        autoTerminated: sub.status === 'terminated',
        isInProgress: false,
      });
    }
  });

  return { upcomingExams, attemptedExams };
}
