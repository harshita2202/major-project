import { getExams, getExamSubmissions } from './api';
import { getAllSessions } from './examSecurity';

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
    getExams().catch(() => []),
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
    } else if (exam.status?.toLowerCase() === 'upcoming') {
      upcomingExams.push(exam);
    }
  });

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
        isInProgress: false,
        autoTerminated: sub.status === 'terminated',
      });
    }
  });

  return { upcomingExams, attemptedExams };
}
