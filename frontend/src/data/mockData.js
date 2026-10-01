// Central Mock Data Store for Exam Proctoring Dashboard
// Structure is decoupled to ensure instant drop-in replacement with Spring Boot REST endpoints.

export const mockStats = {
  activeExams: {
    value: 12,
    trend: '+2 today',
    isPositive: true,
    label: 'Active Exams'
  },
  studentsOnline: {
    value: 248,
    trend: '+18 today',
    isPositive: true,
    label: 'Students Online'
  },
  activeAlerts: {
    value: 17,
    trend: '5 high priority',
    isPositive: false,
    label: 'Active Alerts'
  },
  systemStatus: {
    value: '99.8%',
    trend: 'All systems normal',
    isPositive: true,
    label: 'System Status'
  }
};

export const mockActivityData = [
  { day: 'Mon', shortDay: 'M', activeStudents: 180, completedExams: 8 },
  { day: 'Tue', shortDay: 'T', activeStudents: 220, completedExams: 11 },
  { day: 'Wed', shortDay: 'W', activeStudents: 310, completedExams: 15 },
  { day: 'Thu', shortDay: 'T', activeStudents: 265, completedExams: 12 },
  { day: 'Fri', shortDay: 'F', activeStudents: 295, completedExams: 14 },
  { day: 'Sat', shortDay: 'S', activeStudents: 140, completedExams: 6 },
  { day: 'Sun', shortDay: 'S', activeStudents: 95, completedExams: 4 },
];

export const mockRecentViolations = [
  {
    id: 'v-101',
    student: 'Rahul Sharma',
    avatar: 'RS',
    exam: 'Data Structures',
    violation: 'Multiple faces detected',
    time: '2 min ago',
    severity: 'High',
    status: 'Investigating',
    confidence: '96%',
    details: 'Secondary face recognized in lower left frame quadrant for 4.2 seconds.'
  },
  {
    id: 'v-102',
    student: 'Priya Singh',
    avatar: 'PS',
    exam: 'Operating Systems',
    violation: 'Tab switching detected',
    time: '8 min ago',
    severity: 'Medium',
    status: 'Flagged',
    confidence: '100%',
    details: 'Browser lost focus; navigated to external window for 12 seconds.'
  },
  {
    id: 'v-103',
    student: 'Arjun Mehta',
    avatar: 'AM',
    exam: 'Computer Networks',
    violation: 'Face not detected',
    time: '14 min ago',
    severity: 'High',
    status: 'Investigating',
    confidence: '98%',
    details: 'Candidate left camera viewport continuously for over 60 seconds.'
  },
  {
    id: 'v-104',
    student: 'Sneha Patel',
    avatar: 'SP',
    exam: 'Database Systems',
    violation: 'Suspicious movement',
    time: '23 min ago',
    severity: 'Medium',
    status: 'Reviewed',
    confidence: '84%',
    details: 'Repetitive downward gaze patterns indicating potential unpermitted notes.'
  },
  {
    id: 'v-105',
    student: 'Rohan Gupta',
    avatar: 'RG',
    exam: 'Software Engineering',
    violation: 'Audio anomaly',
    time: '35 min ago',
    severity: 'Low',
    status: 'Resolved',
    confidence: '78%',
    details: 'Acoustic spike above 65dB; ambient conversational frequency detected.'
  }
];
// Live candidates populated dynamically when students are attempting exams
export const mockCandidates = [];
const _legacyMockCandidates = [
  {
    id: 'cand-01',
    candidate: 'Rahul Sharma',
    avatar: 'RS',
    email: 'rahul.sharma@univ.edu',
    exam: 'Data Structures',
    timeRemaining: '42:18',
    totalDuration: '60:00',
    progress: 72,
    status: 'Monitoring',
    risk: 'Low',
    riskScore: 12,
    checks: {
      faceDetected: 'Normal',
      faceStatus: 'normal',
      multipleFaces: 'None',
      multipleFacesStatus: 'normal',
      tabSwitch: 0,
      tabSwitchStatus: 'normal',
      audio: 'Normal',
      audioStatus: 'normal',
      suspiciousMovement: 'None',
      movementStatus: 'normal'
    },
    timeline: [
      { time: '10:00:12 AM', event: 'Biometric verification passed', type: 'info' },
      { time: '10:00:15 AM', event: 'Exam started: Data Structures', type: 'info' },
      { time: '10:18:40 AM', event: 'Question Section 1 submitted', type: 'info' },
      { time: '10:35:12 AM', event: 'Face alignment shifted slightly - self corrected', type: 'warning' },
      { time: '10:41:22 AM', event: 'Continuous normal monitoring active', type: 'success' }
    ]
  },
  {
    id: 'cand-02',
    candidate: 'Priya Singh',
    avatar: 'PS',
    email: 'priya.singh@univ.edu',
    exam: 'Operating Systems',
    timeRemaining: '35:10',
    totalDuration: '90:00',
    progress: 54,
    status: 'Monitoring',
    risk: 'Medium',
    riskScore: 45,
    checks: {
      faceDetected: 'Normal',
      faceStatus: 'normal',
      multipleFaces: 'None',
      multipleFacesStatus: 'normal',
      tabSwitch: 2,
      tabSwitchStatus: 'warning',
      audio: 'Whisper detected',
      audioStatus: 'warning',
      suspiciousMovement: 'Head turns (3x)',
      movementStatus: 'warning'
    },
    timeline: [
      { time: '09:30:00 AM', event: 'Exam session initialized', type: 'info' },
      { time: '09:44:12 AM', event: 'Tab switched to desktop window (4s)', type: 'warning' },
      { time: '10:02:18 AM', event: 'Acoustic amplitude spike (Whisper)', type: 'warning' },
      { time: '10:15:30 AM', event: 'Automated verbal prompt delivered', type: 'info' }
    ]
  },
  {
    id: 'cand-03',
    candidate: 'Arjun Mehta',
    avatar: 'AM',
    email: 'arjun.mehta@univ.edu',
    exam: 'Computer Networks',
    timeRemaining: '18:45',
    totalDuration: '90:00',
    progress: 86,
    status: 'Warning',
    risk: 'High',
    riskScore: 82,
    checks: {
      faceDetected: 'Absence >60s',
      faceStatus: 'danger',
      multipleFaces: 'None',
      multipleFacesStatus: 'normal',
      tabSwitch: 5,
      tabSwitchStatus: 'danger',
      audio: 'Normal',
      audioStatus: 'normal',
      suspiciousMovement: 'Out of frame',
      movementStatus: 'danger'
    },
    timeline: [
      { time: '09:00:00 AM', event: 'Candidate checked in', type: 'info' },
      { time: '09:22:15 AM', event: 'Repeated tab switches detected (3x)', type: 'danger' },
      { time: '09:48:10 AM', event: 'Face left web camera field for 72s', type: 'danger' },
      { time: '10:12:05 AM', event: 'High Risk status flagged by ML engine', type: 'danger' }
    ]
  },
  {
    id: 'cand-04',
    candidate: 'Sneha Patel',
    avatar: 'SP',
    email: 'sneha.patel@univ.edu',
    exam: 'Database Systems',
    timeRemaining: '55:00',
    totalDuration: '75:00',
    progress: 30,
    status: 'Monitoring',
    risk: 'Low',
    riskScore: 8,
    checks: {
      faceDetected: 'Normal',
      faceStatus: 'normal',
      multipleFaces: 'None',
      multipleFacesStatus: 'normal',
      tabSwitch: 0,
      tabSwitchStatus: 'normal',
      audio: 'Quiet',
      audioStatus: 'normal',
      suspiciousMovement: 'None',
      movementStatus: 'normal'
    },
    timeline: [
      { time: '10:15:00 AM', event: 'Room 360-degree scan verified', type: 'info' },
      { time: '10:17:30 AM', event: 'Session started smoothly', type: 'info' }
    ]
  },
  {
    id: 'cand-05',
    candidate: 'Rohan Gupta',
    avatar: 'RG',
    email: 'rohan.gupta@univ.edu',
    exam: 'Software Engineering',
    timeRemaining: '24:30',
    totalDuration: '60:00',
    progress: 65,
    status: 'Warning',
    risk: 'Medium',
    riskScore: 58,
    checks: {
      faceDetected: 'Normal',
      faceStatus: 'normal',
      multipleFaces: 'None',
      multipleFacesStatus: 'normal',
      tabSwitch: 3,
      tabSwitchStatus: 'warning',
      audio: 'Speech detected',
      audioStatus: 'warning',
      suspiciousMovement: 'Downward gaze',
      movementStatus: 'warning'
    },
    timeline: [
      { time: '10:00:00 AM', event: 'Candidate authenticated', type: 'info' },
      { time: '10:20:15 AM', event: 'Audio threshold breached (58 dB)', type: 'warning' },
      { time: '10:35:40 AM', event: 'Persistent looking down at desk area', type: 'warning' }
    ]
  },
  {
    id: 'cand-06',
    candidate: 'Vikram Sethi',
    avatar: 'VS',
    email: 'vikram.sethi@univ.edu',
    exam: 'Discrete Mathematics',
    timeRemaining: '12:05',
    totalDuration: '60:00',
    progress: 92,
    status: 'Monitoring',
    risk: 'Low',
    riskScore: 14,
    checks: {
      faceDetected: 'Normal',
      faceStatus: 'normal',
      multipleFaces: 'None',
      multipleFacesStatus: 'normal',
      tabSwitch: 0,
      tabSwitchStatus: 'normal',
      audio: 'Normal',
      audioStatus: 'normal',
      suspiciousMovement: 'None',
      movementStatus: 'normal'
    },
    timeline: [
      { time: '09:45:00 AM', event: 'Pre-check completed', type: 'info' },
      { time: '10:30:00 AM', event: 'Final test section entered', type: 'info' }
    ]
  },
  {
    id: 'cand-07',
    candidate: 'Ananya Roy',
    avatar: 'AR',
    email: 'ananya.roy@univ.edu',
    exam: 'Algorithms & Complexity',
    timeRemaining: '09:40',
    totalDuration: '90:00',
    progress: 88,
    status: 'Warning',
    risk: 'High',
    riskScore: 78,
    checks: {
      faceDetected: 'Multiple Faces',
      faceStatus: 'danger',
      multipleFaces: '2 Faces Present',
      multipleFacesStatus: 'danger',
      tabSwitch: 1,
      tabSwitchStatus: 'warning',
      audio: 'Conversation',
      audioStatus: 'danger',
      suspiciousMovement: 'Frequent glances',
      movementStatus: 'warning'
    },
    timeline: [
      { time: '09:30:00 AM', event: 'Exam started', type: 'info' },
      { time: '10:10:45 AM', event: 'Dual facial embeddings matched in camera stream', type: 'danger' },
      { time: '10:25:12 AM', event: 'Warning popup dispatched to candidate', type: 'warning' }
    ]
  },
  {
    id: 'cand-08',
    candidate: 'Devansh Verma',
    avatar: 'DV',
    email: 'devansh.v@univ.edu',
    exam: 'Cloud Computing',
    timeRemaining: '48:15',
    totalDuration: '60:00',
    progress: 40,
    status: 'Monitoring',
    risk: 'Low',
    riskScore: 5,
    checks: {
      faceDetected: 'Normal',
      faceStatus: 'normal',
      multipleFaces: 'None',
      multipleFacesStatus: 'normal',
      tabSwitch: 0,
      tabSwitchStatus: 'normal',
      audio: 'Silent',
      audioStatus: 'normal',
      suspiciousMovement: 'None',
      movementStatus: 'normal'
    },
    timeline: [
      { time: '10:20:00 AM', event: 'Exam initiated with zero discrepancies', type: 'info' }
    ]
  }
];

export const mockExams = [
  {
    id: 'coding',
    code: 'CS501',
    name: 'Practical Coding Assessment (Anti-Paste Proctor)',
    description: 'Solve algorithmic challenges. Clipboard copy/paste is strictly monitored, blocked, and audited.',
    date: '2026-09-21',
    time: '11:00 AM',
    duration: '45 mins',
    studentsCount: 32,
    status: 'Live',
    proctoringMode: 'Strict AI + Anti-Paste Lockdown'
  },
  {
    id: 'exam-01',
    code: 'CS201',
    name: 'Data Structures',
    description: 'Arrays, Linked Lists, Trees, Graphs, and Hash Tables evaluation.',
    date: '2026-09-20',
    time: '10:00 AM',
    duration: '60 mins',
    studentsCount: 42,
    status: 'Live',
    proctoringMode: 'Strict AI + Live Proctor'
  },
  {
    id: 'exam-02',
    code: 'CS301',
    name: 'Operating Systems',
    description: 'Process management, concurrency, virtual memory, and file systems.',
    date: '2026-09-20',
    time: '09:30 AM',
    duration: '90 mins',
    studentsCount: 56,
    status: 'Live',
    proctoringMode: 'Strict AI'
  },
  {
    id: 'exam-03',
    code: 'CS302',
    name: 'Computer Networks',
    description: 'OSI layers, TCP/IP protocol suite, subnetting, and socket programming.',
    date: '2026-09-20',
    time: '09:00 AM',
    duration: '90 mins',
    studentsCount: 38,
    status: 'Live',
    proctoringMode: 'Strict AI + Screen Recording'
  },
  {
    id: 'exam-04',
    code: 'CS204',
    name: 'Database Systems',
    description: 'SQL queries, relational algebra, normal forms, and transaction ACID rules.',
    date: '2026-09-20',
    time: '11:30 AM',
    duration: '75 mins',
    studentsCount: 64,
    status: 'Upcoming',
    proctoringMode: 'Standard AI'
  },
  {
    id: 'exam-05',
    code: 'CS401',
    name: 'Software Engineering',
    description: 'Agile methodologies, system architecture, CI/CD, and design patterns.',
    date: '2026-09-20',
    time: '02:00 PM',
    duration: '60 mins',
    studentsCount: 48,
    status: 'Upcoming',
    proctoringMode: 'Standard AI'
  },
  {
    id: 'exam-06',
    code: 'MA201',
    name: 'Discrete Mathematics',
    description: 'Graph theory, combinatorics, proof techniques, and boolean algebra.',
    date: '2026-09-19',
    time: '10:00 AM',
    duration: '90 mins',
    studentsCount: 72,
    status: 'Completed',
    proctoringMode: 'Strict AI'
  },
  {
    id: 'exam-07',
    code: 'CS405',
    name: 'Artificial Intelligence',
    description: 'Search algorithms, heuristic optimization, game theory, and MDPs.',
    date: '2026-09-19',
    time: '03:00 PM',
    duration: '90 mins',
    studentsCount: 50,
    status: 'Completed',
    proctoringMode: 'Strict AI + Live Proctor'
  }
];

export const mockStudents = [
  {
    id: 'stu-01',
    name: 'Rahul Sharma',
    email: 'rahul.sharma@univ.edu',
    exam: 'Data Structures',
    status: 'Online',
    riskLevel: 'Low',
    lastActivity: 'Active right now'
  },
  {
    id: 'stu-02',
    name: 'Priya Singh',
    email: 'priya.singh@univ.edu',
    exam: 'Operating Systems',
    status: 'Online',
    riskLevel: 'Medium',
    lastActivity: 'Tab switched 8m ago'
  },
  {
    id: 'stu-03',
    name: 'Arjun Mehta',
    email: 'arjun.mehta@univ.edu',
    exam: 'Computer Networks',
    status: 'Online',
    riskLevel: 'High',
    lastActivity: 'Camera unverified'
  },
  {
    id: 'stu-04',
    name: 'Sneha Patel',
    email: 'sneha.patel@univ.edu',
    exam: 'Database Systems',
    status: 'Online',
    riskLevel: 'Low',
    lastActivity: 'Active right now'
  },
  {
    id: 'stu-05',
    name: 'Rohan Gupta',
    email: 'rohan.gupta@univ.edu',
    exam: 'Software Engineering',
    status: 'Online',
    riskLevel: 'Medium',
    lastActivity: 'Audio flag 12m ago'
  },
  {
    id: 'stu-06',
    name: 'Vikram Sethi',
    email: 'vikram.sethi@univ.edu',
    exam: 'Discrete Mathematics',
    status: 'Completed',
    riskLevel: 'Low',
    lastActivity: 'Completed yesterday'
  },
  {
    id: 'stu-07',
    name: 'Ananya Roy',
    email: 'ananya.roy@univ.edu',
    exam: 'Algorithms & Complexity',
    status: 'Online',
    riskLevel: 'High',
    lastActivity: 'Multiple faces flagged'
  },
  {
    id: 'stu-08',
    name: 'Devansh Verma',
    email: 'devansh.v@univ.edu',
    exam: 'Cloud Computing',
    status: 'Online',
    riskLevel: 'Low',
    lastActivity: 'Active right now'
  },
  {
    id: 'stu-09',
    name: 'Kavita Nair',
    email: 'kavita.nair@univ.edu',
    exam: 'Data Structures',
    status: 'Offline',
    riskLevel: 'Low',
    lastActivity: 'Offline (Session ended)'
  },
  {
    id: 'stu-10',
    name: 'Aditya Joshi',
    email: 'aditya.j@univ.edu',
    exam: 'Operating Systems',
    status: 'Completed',
    riskLevel: 'Low',
    lastActivity: 'Submitted 45m ago'
  },
  {
    id: 'stu-11',
    name: 'Tanvi Deshmukh',
    email: 'tanvi.d@univ.edu',
    exam: 'Computer Networks',
    status: 'Completed',
    riskLevel: 'Medium',
    lastActivity: 'Submitted 1h ago'
  },
  {
    id: 'stu-12',
    name: 'Manish Rawat',
    email: 'manish.r@univ.edu',
    exam: 'Database Systems',
    status: 'Offline',
    riskLevel: 'Low',
    lastActivity: 'Not started yet'
  }
];

export const mockAllViolations = [
  {
    id: 'VIO-8901',
    student: 'Rahul Sharma',
    avatar: 'RS',
    exam: 'Data Structures',
    violation: 'Multiple faces',
    severity: 'High',
    time: '10:42 AM',
    date: 'Today',
    status: 'Under Review',
    description: 'Secondary person appeared in web camera frame for 4.2 seconds.',
    confidenceScore: '96%'
  },
  {
    id: 'VIO-8902',
    student: 'Priya Singh',
    avatar: 'PS',
    exam: 'Operating Systems',
    violation: 'Tab switching',
    severity: 'Medium',
    time: '10:36 AM',
    date: 'Today',
    status: 'Flagged',
    description: 'Candidate switched window tab twice while answering question 14.',
    confidenceScore: '100%'
  },
  {
    id: 'VIO-8903',
    student: 'Arjun Mehta',
    avatar: 'AM',
    exam: 'Computer Networks',
    violation: 'Face not detected',
    severity: 'High',
    time: '10:28 AM',
    date: 'Today',
    status: 'Under Review',
    description: 'Candidate face was completely absent from webcam stream for 72 seconds.',
    confidenceScore: '98%'
  },
  {
    id: 'VIO-8904',
    student: 'Sneha Patel',
    avatar: 'SP',
    exam: 'Database Systems',
    violation: 'Suspicious movement',
    severity: 'Medium',
    time: '10:19 AM',
    date: 'Today',
    status: 'Dismissed',
    description: 'Candidate leaned down to adjust chair; verified as benign movement.',
    confidenceScore: '74%'
  },
  {
    id: 'VIO-8905',
    student: 'Rohan Gupta',
    avatar: 'RG',
    exam: 'Software Engineering',
    violation: 'Audio anomaly',
    severity: 'Low',
    time: '10:05 AM',
    date: 'Today',
    status: 'Resolved',
    description: 'Ambient room sound crossed 60dB limit temporarily.',
    confidenceScore: '78%'
  },
  {
    id: 'VIO-8906',
    student: 'Ananya Roy',
    avatar: 'AR',
    exam: 'Algorithms & Complexity',
    violation: 'Unauthorized object',
    severity: 'High',
    time: '09:55 AM',
    date: 'Today',
    status: 'Flagged',
    description: 'Handheld smartphone detected resting beside keyboard edge.',
    confidenceScore: '94%'
  },
  {
    id: 'VIO-8907',
    student: 'Karan Mehra',
    avatar: 'KM',
    exam: 'Discrete Mathematics',
    violation: 'Tab switching',
    severity: 'Medium',
    time: 'Yesterday',
    date: '2026-09-19',
    status: 'Resolved',
    description: 'Candidate switched tab to system notification; dismissed after manual check.',
    confidenceScore: '100%'
  },
  {
    id: 'VIO-8908',
    student: 'Isha Sen',
    avatar: 'IS',
    exam: 'Artificial Intelligence',
    violation: 'Multiple faces',
    severity: 'High',
    time: 'Yesterday',
    date: '2026-09-19',
    status: 'Disqualified',
    description: 'Unauthorized peer helping candidate with problem solving.',
    confidenceScore: '99%'
  }
];

export const mockReportsData = {
  metrics: {
    totalExams: 34,
    totalStudents: 1420,
    totalViolations: 87,
    avgRiskScore: '14.2%',
    completionRate: '96.8%'
  },
  severityBreakdown: [
    { level: 'Low Severity', count: 48, percentage: 55, color: '#10b981' },
    { level: 'Medium Severity', count: 26, percentage: 30, color: '#f59e0b' },
    { level: 'High Severity', count: 13, percentage: 15, color: '#ef4444' }
  ],
  violationTypes: [
    { type: 'Tab Switching', count: 32, share: '37%' },
    { type: 'Suspicious Gaze / Movement', count: 21, share: '24%' },
    { type: 'Face Not Detected', count: 15, share: '17%' },
    { type: 'Audio Anomaly / Speech', count: 11, share: '13%' },
    { type: 'Multiple Faces', count: 5, share: '6%' },
    { type: 'Unauthorized Device', count: 3, share: '3%' }
  ],
  integrityByExam: [
    { exam: 'Data Structures', candidates: 140, cleanRate: '94%', flagRate: '6%' },
    { exam: 'Operating Systems', candidates: 185, cleanRate: '91%', flagRate: '9%' },
    { exam: 'Computer Networks', candidates: 120, cleanRate: '88%', flagRate: '12%' },
    { exam: 'Database Systems', candidates: 210, cleanRate: '97%', flagRate: '3%' },
    { exam: 'Discrete Mathematics', candidates: 165, cleanRate: '95%', flagRate: '5%' }
  ]
};

export const mockSettings = {
  general: {
    platformName: 'ProctorAI Academic Suite',
    institution: 'National University of Technology',
    adminEmail: 'security-admin@univ.edu',
    retentionDays: 90,
    enforceFullScreen: true
  },
  proctoring: {
    enableFaceDetection: true,
    enableMultipleFaceDetection: true,
    enableTabSwitchingDetection: true,
    enableAudioMonitoring: true,
    enableSuspiciousMovementDetection: true,
    sensitivityThreshold: 'Medium',
    continuousWebcamRecording: true
  },
  notifications: {
    emailAlertsOnHighRisk: true,
    inAppSoundAlerts: false,
    slackWebhookEnabled: false,
    alertProctorThreshold: 75
  },
  security: {
    twoFactorAuth: true,
    sessionTimeoutMins: 60,
    lockCandidateOnBreach: false,
    aiModelVersion: 'v2.4.0 (Enterprise-Proctor-Vision)'
  }
};
