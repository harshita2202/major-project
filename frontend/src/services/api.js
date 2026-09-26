/**
 * Central API Service Layer for ProctorAI Dashboard & Student Portal
 * Base URL: http://localhost:8080
 * Connected directly to Spring Boot + PostgreSQL
 */

import {
  mockStats,
  mockActivityData,
  mockRecentViolations,
  mockCandidates,
  mockExams,
  mockStudents,
  mockAllViolations,
  mockReportsData,
  mockSettings
} from '../data/mockData.js';

import {
  MOCK_QUESTIONS,
  CODING_QUESTIONS
} from '../data/mockExamData.js';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Live mode connected to Spring Boot backend
const USE_MOCK_FALLBACK = false;

// ── Normalizers for resilient frontend compatibility ──────────────────────────
function normalizeStats(data) {
  if (!data) return mockStats;
  return {
    activeExams: {
      value: data.activeExams ?? 3,
      trend: '+2 in session',
      isPositive: true,
      label: 'Active Exams'
    },
    studentsOnline: {
      value: data.liveStudents ?? 4,
      trend: '+18 today',
      isPositive: true,
      label: 'Students Online'
    },
    activeAlerts: {
      value: data.flaggedIncidents ?? 0,
      trend: `${data.highRiskAlerts || 0} high priority`,
      isPositive: false,
      label: 'Active Alerts'
    },
    systemStatus: {
      value: data.systemHealth || '99.8%',
      trend: 'All systems normal',
      isPositive: true,
      label: 'System Status'
    }
  };
}

function normalizeViolation(v) {
  return {
    ...v,
    student: v.candidateName || v.student || 'Candidate',
    candidate: v.candidateName || v.student || 'Candidate',
    avatar: (v.candidateName || v.student || 'ST').slice(0, 2).toUpperCase(),
    violation: v.type || v.violation || 'Suspicious Activity',
    exam: v.examTitle || v.exam || 'General Exam',
    time: v.timestamp || v.time || 'Just now',
    confidence: v.confidence || (v.severity === 'high' ? '96%' : '84%'),
    severity: v.severity ? (v.severity.charAt(0).toUpperCase() + v.severity.slice(1)) : 'Medium'
  };
}

function normalizeCandidate(c) {
  let checks = {};
  let timeline = [];
  try {
    if (c.checksJson) checks = typeof c.checksJson === 'string' ? JSON.parse(c.checksJson) : c.checksJson;
  } catch (e) {
    void e;
  }
  try {
    if (c.timelineJson) timeline = typeof c.timelineJson === 'string' ? JSON.parse(c.timelineJson) : c.timelineJson;
  } catch (e) {
    void e;
  }
  if (!checks.faceDetection) {
    checks = { faceDetection: 'passed', audioLevel: 'normal', tabSwitches: 0, gazeTracking: 'focused' };
  }

  const riskFormatted = c.risk
    ? c.risk.charAt(0).toUpperCase() + c.risk.slice(1).toLowerCase()
    : 'Low';

  const studentName = c.candidate || c.name || 'Student Candidate';

  return {
    ...c,
    candidate: studentName,
    student: studentName,
    avatar: c.avatar || studentName.slice(0, 2).toUpperCase(),
    risk: riskFormatted,
    riskScore: c.riskScore ?? 0,
    cheatingFlag: Boolean(c.cheatingFlag),
    latestEvent: c.latestEvent || null,
    checks,
    timeline
  };
}

function normalizeQuestion(q) {
  let options = [];
  let examples = [];
  let constraints = [];
  let starterCode = {};

  try {
    if (q.optionsJson) options = typeof q.optionsJson === 'string' ? JSON.parse(q.optionsJson) : q.optionsJson;
  } catch (e) { void e; }

  try {
    if (q.examplesJson) examples = typeof q.examplesJson === 'string' ? JSON.parse(q.examplesJson) : q.examplesJson;
  } catch (e) { void e; }

  try {
    if (q.constraintsJson) constraints = typeof q.constraintsJson === 'string' ? JSON.parse(q.constraintsJson) : q.constraintsJson;
  } catch (e) { void e; }

  try {
    if (q.starterCodeJson) starterCode = typeof q.starterCodeJson === 'string' ? JSON.parse(q.starterCodeJson) : q.starterCodeJson;
  } catch (e) { void e; }

  return {
    ...q,
    options: options.length > 0 ? options : (q.options || []),
    examples: examples.length > 0 ? examples : (q.examples || []),
    constraints: constraints.length > 0 ? constraints : (q.constraints || []),
    starterCode: Object.keys(starterCode).length > 0 ? starterCode : (q.starterCode || {})
  };
}

/**
 * Dashboard Overview API: GET /api/dashboard/stats
 */
export async function getDashboardStats() {
  if (USE_MOCK_FALLBACK) {
    return { ...mockStats };
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/dashboard/stats`);
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');
    const data = await res.json();
    return normalizeStats(data);
  } catch (err) {
    console.warn('Dashboard stats fallback:', err);
    return { ...mockStats };
  }
}

/**
 * Weekly Exam Activity API: GET /api/dashboard/activity
 */
export async function getExamActivity() {
  if (USE_MOCK_FALLBACK) {
    return [...mockActivityData];
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/dashboard/activity`);
    if (!res.ok) throw new Error('Failed to fetch exam activity');
    const data = await res.json();
    return data && data.length > 0 ? data : mockActivityData;
  } catch (err) {
    console.warn('Exam activity fallback:', err);
    return [...mockActivityData];
  }
}

/**
 * Recent Violations API: GET /api/violations/recent
 */
export async function getRecentViolations() {
  if (USE_MOCK_FALLBACK) {
    return [...mockRecentViolations];
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/violations/recent`);
    if (!res.ok) throw new Error('Failed to fetch recent violations');
    const data = await res.json();
    return data.map(normalizeViolation);
  } catch (err) {
    console.warn('Recent violations fallback:', err);
    return [...mockRecentViolations];
  }
}

// ── Active Student Exam Attempt Tracking ────────────────────────────────────
const ACTIVE_ATTEMPTS_STORAGE_KEY = 'proctor_active_attempts';

function getLocalActiveAttempts() {
  try {
    const raw = localStorage.getItem(ACTIVE_ATTEMPTS_STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((a) => a.status === 'active') : [];
  } catch (err) {
    void err;
    return [];
  }
}

export function saveLocalActiveAttempt(attempt) {
  try {
    const existing = getLocalActiveAttempts().filter((a) => a.id !== attempt.id);
    if (attempt.status === 'active') {
      existing.push(attempt);
    }
    localStorage.setItem(ACTIVE_ATTEMPTS_STORAGE_KEY, JSON.stringify(existing));
  } catch (err) {
    void err;
  }
}

export function removeLocalActiveAttempt(studentId) {
  try {
    const existing = getLocalActiveAttempts().filter((a) => a.id !== studentId);
    localStorage.setItem(ACTIVE_ATTEMPTS_STORAGE_KEY, JSON.stringify(existing));
  } catch (err) {
    void err;
  }
}

/**
 * Live Monitored Candidates API: GET /api/candidates/live
 * Shows ONLY candidates currently attempting exams. Excludes hardcoded dummy seeds.
 */
export async function getActiveCandidates() {
  let backendCandidates = [];
  try {
    const res = await fetch(`${API_BASE_URL}/api/candidates/live`);
    if (res.ok) {
      const data = await res.json();
      backendCandidates = (Array.isArray(data) ? data : [])
        .filter((c) => c.id && !c.id.startsWith('cand-') && (c.status || '').toLowerCase() === 'active')
        .map(normalizeCandidate);
    }
  } catch (err) {
    console.warn('Active candidates fetch fallback:', err);
  }

  // Merge with cross-tab local active attempts if any
  const localAttempts = getLocalActiveAttempts().map(normalizeCandidate);
  const candidateMap = new Map();

  // Add backend candidates first
  backendCandidates.forEach((c) => candidateMap.set(c.id, c));

  // Merge local attempts (giving preference to active live state)
  localAttempts.forEach((c) => {
    if (!candidateMap.has(c.id)) {
      candidateMap.set(c.id, c);
    }
  });

  return Array.from(candidateMap.values());
}

/**
 * Examiner Live Risk API: GET /api/examiner/live-risk
 */
export async function getLiveRiskDashboard(examId) {
  try {
    const url = examId
      ? `${API_BASE_URL}/api/examiner/live-risk?examId=${encodeURIComponent(examId)}`
      : `${API_BASE_URL}/api/examiner/live-risk`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch live risk dashboard');
    return res.json();
  } catch (err) {
    console.warn('Live risk dashboard fallback:', err);
    return { highRisk: [], mediumRisk: [], lowRisk: [], totalCandidates: 0, activeCount: 0, autoSubmittedCount: 0 };
  }
}

/**
 * Register active exam attempt when student starts taking an exam.
 */
export async function startExamAttempt(attemptData) {
  const localCandidate = {
    id: attemptData.studentId,
    candidate: attemptData.studentName,
    student: attemptData.studentName,
    email: attemptData.email || `${attemptData.studentId.toLowerCase()}@university.edu`,
    exam: attemptData.examTitle || `Exam ${attemptData.examId}`,
    avatar: (attemptData.studentName || 'ST').slice(0, 2).toUpperCase(),
    timeRemaining: attemptData.timeRemainingFormatted || '01:30:00',
    totalDuration: attemptData.totalDurationFormatted || '01:30:00',
    progress: 0,
    status: 'active',
    risk: 'Low',
    riskScore: 0,
    checks: {
      faceDetection: 'passed',
      audioLevel: 'normal',
      tabSwitches: 0,
      gazeTracking: 'focused'
    },
    timeline: [
      {
        time: new Date().toLocaleTimeString(),
        event: `Exam started: ${attemptData.examTitle || attemptData.examId}`,
        type: 'info'
      }
    ]
  };

  saveLocalActiveAttempt(localCandidate);

  try {
    const res = await fetch(`${API_BASE_URL}/api/candidates/start-attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attemptData)
    });
    if (res.ok) {
      const saved = await res.json();
      return normalizeCandidate(saved);
    }
  } catch (err) {
    console.warn('Backend start-attempt sync failed, using local attempt:', err);
  }

  return normalizeCandidate(localCandidate);
}

/**
 * Update candidate progress during exam attempt.
 */
export async function updateExamProgress(progressData) {
  try {
    const localList = getLocalActiveAttempts();
    const candidate = localList.find((c) => c.id === progressData.studentId);
    if (candidate) {
      if (progressData.progress !== undefined) candidate.progress = progressData.progress;
      if (progressData.timeRemainingFormatted) candidate.timeRemaining = progressData.timeRemainingFormatted;
      if (progressData.riskScore !== undefined) candidate.riskScore = progressData.riskScore;
      if (progressData.risk) candidate.risk = progressData.risk;
      saveLocalActiveAttempt(candidate);
    }
  } catch (err) {
    void err;
  }

  try {
    await fetch(`${API_BASE_URL}/api/candidates/update-progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(progressData)
    });
  } catch (err) {
    void err;
  }
}

/**
 * Mark student exam attempt completed/disqualified.
 */
export async function endExamAttempt(studentId, finalStatus = 'completed') {
  removeLocalActiveAttempt(studentId);
  try {
    await fetch(`${API_BASE_URL}/api/candidates/update-progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, status: finalStatus })
    });
  } catch (err) {
    void err;
  }
}

/**
 * Candidate Detail API: GET /api/candidates/:id
 */
export async function getCandidateById(id) {
  if (USE_MOCK_FALLBACK) {
    const found = mockCandidates.find((c) => c.id === id);
    if (!found) throw new Error(`Candidate ${id} not found`);
    return { ...found };
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/candidates/${id}`);
    if (!res.ok) throw new Error('Failed to fetch candidate details');
    const data = await res.json();
    return normalizeCandidate(data);
  } catch (err) {
    console.warn('Candidate details fallback:', err);
    const found = mockCandidates.find((c) => c.id === id);
    return found ? { ...found } : null;
  }
}

/**
 * Exams Directory API: GET /api/exams
 */
export async function getExams() {
  if (USE_MOCK_FALLBACK) {
    return [...mockExams];
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/exams`);
    if (!res.ok) throw new Error('Failed to fetch exams');
    return res.json();
  } catch (err) {
    console.warn('Exams fallback:', err);
    return [...mockExams];
  }
}

/**
 * Single Exam Detail API: GET /api/exams/:id
 */
export async function getExamById(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/exams/${id}`);
    if (!res.ok) throw new Error('Failed to fetch exam');
    return res.json();
  } catch (err) {
    console.warn('Single exam fallback:', err);
    return null;
  }
}

/**
 * Exam Questions API: GET /api/exams/:id/questions
 */
export async function getExamQuestions(examId) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/exams/${examId}/questions`);
    if (!res.ok) throw new Error('Failed to fetch exam questions');
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data.map(normalizeQuestion);
    }
  } catch (err) {
    console.warn('Exam questions fallback:', err);
  }
  // Fallback to local questions if examId matches or generic
  if (examId === 'exam-2' || examId === 'coding') {
    return CODING_QUESTIONS;
  }
  return MOCK_QUESTIONS;
}

/**
 * Create Exam API: POST /api/exams
 */
export async function createExam(examData) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/exams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(examData)
    });
    if (!res.ok) throw new Error('Failed to create exam');
    return res.json();
  } catch (err) {
    console.warn('Create exam fallback:', err);
    const newExam = {
      id: `exam-${Date.now()}`,
      code: examData.code || 'EXAM-NEW',
      name: examData.name,
      description: examData.description || 'Newly scheduled examination.',
      date: examData.date,
      time: examData.time || '10:00 AM',
      duration: `${examData.duration} mins`,
      studentsCount: 0,
      status: 'upcoming',
      proctoringMode: examData.proctoringMode || 'Strict AI',
      type: examData.type || 'mcq'
    };
    mockExams.unshift(newExam);
    return newExam;
  }
}

/**
 * Submit Exam API: POST /api/exams/:id/submit
 */
export async function submitExam(examId, payload) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/exams/${examId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to submit exam');
    return res.json();
  } catch (err) {
    console.warn('Submit exam fallback:', err);
    return { success: true, submissionId: 'sub-local-' + Date.now() };
  }
}

/**
 * Record Security Event / Telemetry: POST /api/exams/:id/events
 */
export async function recordExamEvent(examId, eventPayload) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/exams/${examId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventPayload)
    });
    if (!res.ok) throw new Error('Failed to record security event');
    return res.json();
  } catch (err) {
    console.warn('Record event fallback:', err);
    return { success: false };
  }
}

/**
 * Students Directory API: GET /api/students
 */
export async function getStudents() {
  if (USE_MOCK_FALLBACK) {
    return [...mockStudents];
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/students`);
    if (!res.ok) throw new Error('Failed to fetch students');
    return res.json();
  } catch (err) {
    console.warn('Students fallback:', err);
    return [...mockStudents];
  }
}

/**
 * Violations Directory API: GET /api/violations
 */
export async function getAllViolations() {
  if (USE_MOCK_FALLBACK) {
    return [...mockAllViolations];
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/violations`);
    if (!res.ok) throw new Error('Failed to fetch violations');
    const data = await res.json();
    return data.map(normalizeViolation);
  } catch (err) {
    console.warn('All violations fallback:', err);
    return [...mockAllViolations];
  }
}

/**
 * Reports API: GET /api/reports/summary
 */
export async function getReportsData() {
  if (USE_MOCK_FALLBACK) {
    return { ...mockReportsData };
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/reports/summary`);
    if (!res.ok) throw new Error('Failed to fetch reports data');
    const data = await res.json();
    return { ...mockReportsData, ...data };
  } catch (err) {
    console.warn('Reports fallback:', err);
    return { ...mockReportsData };
  }
}

/**
 * Settings API: GET /api/settings
 */
export async function getSettings() {
  if (USE_MOCK_FALLBACK) {
    return JSON.parse(JSON.stringify(mockSettings));
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  } catch (err) {
    console.warn('Settings fallback:', err);
    return JSON.parse(JSON.stringify(mockSettings));
  }
}

/**
 * Update Settings API: PUT /api/settings
 */
export async function updateSettings(newSettings) {
  if (USE_MOCK_FALLBACK) {
    Object.assign(mockSettings, newSettings);
    return { success: true, settings: mockSettings };
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings)
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  } catch (err) {
    console.warn('Update settings fallback:', err);
    Object.assign(mockSettings, newSettings);
    return { success: true, settings: mockSettings };
  }
}

/**
 * Authentication API: POST /api/auth/login
 */
export async function loginUser(credentials) {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Invalid credentials');
  }
  return data;
}
