import { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  HelpCircle,
  Users,
  Calendar,
  CheckCircle,
  Plus,
  Trash2,
  AlertCircle,
  Code2,
  Check,
  Eye,
  EyeOff,
  UserPlus,
  Search,
  Clock,
  Award,
  Layers,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X
} from 'lucide-react';
import { getStudents, createExam } from '../../services/api';

const STEPS = [
  { id: 1, label: 'Basic Details', icon: FileText, desc: 'Title, syllabus & rules' },
  { id: 2, label: 'Questions Setup', icon: HelpCircle, desc: 'MCQ & Coding problems' },
  { id: 3, label: 'Student Assignment', icon: Users, desc: 'Assign candidates' },
  { id: 4, label: 'Schedule & Window', icon: Calendar, desc: 'Availability & duration' },
  { id: 5, label: 'Review & Publish', icon: CheckCircle, desc: 'Validate & finalize' }
];

export default function CreateExamWizard({ isOpen, onClose, onExamCreated }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // ── Step 1: Basic Details ──
  const [basicDetails, setBasicDetails] = useState({
    title: '',
    code: '',
    description: '',
    instructions: '1. Ensure your webcam and microphone are working.\n2. Do not switch tabs or exit fullscreen mode.\n3. Anti-copy and anti-paste protection is strictly enforced.\n4. Your exam will be auto-submitted if suspicious activity exceeds tolerance.',
    examType: 'mixed', // 'mcq', 'coding', 'mixed'
    durationMinutes: 60,
    passingMarks: 40,
    proctoringMode: 'Strict AI + Screen Lock'
  });

  // ── Step 2: Questions Setup ──
  const [mcqQuestions, setMcqQuestions] = useState([
    {
      id: 'mcq-1',
      title: 'Time Complexity of Binary Search',
      statement: 'What is the worst-case time complexity of binary search on a sorted array of size n?',
      options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
      correctIndex: 1,
      marks: 5,
      explanation: 'Binary search halves the search space at each step, resulting in logarithmic time complexity O(log n).'
    }
  ]);

  const [codingQuestions, setCodingQuestions] = useState([
    {
      id: 'code-1',
      title: 'Reverse a String in Place',
      statement: 'Write a function that reverses an input string. Return the reversed string.',
      inputFormat: 'A string s containing alphanumeric characters',
      outputFormat: 'Return the reversed string',
      constraints: ['1 <= s.length <= 10^5', 's consists of printable ASCII characters'],
      allowedLanguages: ['javascript', 'python'],
      marks: 15,
      sampleTestCases: [
        { input: "reverseString('hello')", expectedOutput: "'olleh'", marks: 5 },
        { input: "reverseString('algorithm')", expectedOutput: "'mhtirogla'", marks: 5 }
      ],
      hiddenTestCases: [
        { input: "reverseString('racecar')", expectedOutput: "'racecar'", marks: 5 }
      ]
    }
  ]);

  // Active question creation tab if mixed
  const [questionTab, setQuestionTab] = useState('mcq');

  // ── Step 3: Student Assignment ──
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [newCandidate, setNewCandidate] = useState({ name: '', studentId: '', email: '' });
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);

  // ── Step 4: Schedule & Time Window ──
  const [schedule, setSchedule] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00 AM',
    endTime: '02:00 PM',
    windowStartDate: new Date().toISOString().split('T')[0],
    windowEndDate: new Date().toISOString().split('T')[0]
  });

  // Load registered students for assignment
  useEffect(() => {
    async function loadRegisteredStudents() {
      try {
        const data = await getStudents();
        if (data && Array.isArray(data)) {
          setAvailableStudents(data);
          // Default assign first 3 students as sample
          const defaultSelected = new Set(data.slice(0, 3).map((s) => s.id));
          setSelectedStudentIds(defaultSelected);
        }
      } catch (err) {
        console.warn('Could not load student roster:', err);
      }
    }
    if (isOpen) {
      loadRegisteredStudents();
    }
  }, [isOpen]);

  // Calculate dynamic totals
  const totalCalculatedMarks = useMemo(() => {
    let sum = 0;
    if (basicDetails.examType === 'mcq' || basicDetails.examType === 'mixed') {
      sum += mcqQuestions.reduce((acc, q) => acc + (Number(q.marks) || 0), 0);
    }
    if (basicDetails.examType === 'coding' || basicDetails.examType === 'mixed') {
      sum += codingQuestions.reduce((acc, q) => acc + (Number(q.marks) || 0), 0);
    }
    return sum;
  }, [basicDetails.examType, mcqQuestions, codingQuestions]);

  // Filter students by search term
  const filteredStudents = useMemo(() => {
    if (!studentSearchTerm.trim()) return availableStudents;
    const term = studentSearchTerm.toLowerCase();
    return availableStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.id.toLowerCase().includes(term) ||
        (s.email && s.email.toLowerCase().includes(term))
    );
  }, [availableStudents, studentSearchTerm]);

  // ── MCQ Question Handlers ──
  const handleAddMcq = () => {
    const newQ = {
      id: `mcq-${Date.now()}`,
      title: `Question ${mcqQuestions.length + 1}`,
      statement: '',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctIndex: 0,
      marks: 5,
      explanation: ''
    };
    setMcqQuestions([...mcqQuestions, newQ]);
  };

  const handleUpdateMcq = (index, field, value) => {
    const updated = [...mcqQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setMcqQuestions(updated);
  };

  const handleUpdateMcqOption = (qIndex, optIndex, value) => {
    const updated = [...mcqQuestions];
    const opts = [...updated[qIndex].options];
    opts[optIndex] = value;
    updated[qIndex].options = opts;
    setMcqQuestions(updated);
  };

  const handleAddMcqOption = (qIndex) => {
    const updated = [...mcqQuestions];
    updated[qIndex].options = [...updated[qIndex].options, `Option ${String.fromCharCode(65 + updated[qIndex].options.length)}`];
    setMcqQuestions(updated);
  };

  const handleRemoveMcqOption = (qIndex, optIndex) => {
    const updated = [...mcqQuestions];
    if (updated[qIndex].options.length <= 2) return;
    const opts = updated[qIndex].options.filter((_, idx) => idx !== optIndex);
    updated[qIndex].options = opts;
    if (updated[qIndex].correctIndex >= opts.length) {
      updated[qIndex].correctIndex = 0;
    }
    setMcqQuestions(updated);
  };

  const handleDeleteMcq = (index) => {
    setMcqQuestions(mcqQuestions.filter((_, i) => i !== index));
  };

  // ── Coding Question Handlers ──
  const handleAddCoding = () => {
    const newCode = {
      id: `code-${Date.now()}`,
      title: `Coding Problem ${codingQuestions.length + 1}`,
      statement: '',
      inputFormat: '',
      outputFormat: '',
      constraints: ['1 <= n <= 10^5'],
      allowedLanguages: ['javascript', 'python'],
      marks: 20,
      sampleTestCases: [{ input: '', expectedOutput: '', marks: 5 }],
      hiddenTestCases: [{ input: '', expectedOutput: '', marks: 5 }]
    };
    setCodingQuestions([...codingQuestions, newCode]);
  };

  const handleUpdateCoding = (index, field, value) => {
    const updated = [...codingQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setCodingQuestions(updated);
  };

  const handleAddSampleTestCase = (qIndex) => {
    const updated = [...codingQuestions];
    updated[qIndex].sampleTestCases = [
      ...updated[qIndex].sampleTestCases,
      { input: '', expectedOutput: '', marks: 5 }
    ];
    setCodingQuestions(updated);
  };

  const handleUpdateSampleTestCase = (qIndex, tcIndex, field, value) => {
    const updated = [...codingQuestions];
    const cases = [...updated[qIndex].sampleTestCases];
    cases[tcIndex] = { ...cases[tcIndex], [field]: value };
    updated[qIndex].sampleTestCases = cases;
    setCodingQuestions(updated);
  };

  const handleDeleteSampleTestCase = (qIndex, tcIndex) => {
    const updated = [...codingQuestions];
    if (updated[qIndex].sampleTestCases.length <= 1) return;
    updated[qIndex].sampleTestCases = updated[qIndex].sampleTestCases.filter((_, i) => i !== tcIndex);
    setCodingQuestions(updated);
  };

  const handleAddHiddenTestCase = (qIndex) => {
    const updated = [...codingQuestions];
    updated[qIndex].hiddenTestCases = [
      ...updated[qIndex].hiddenTestCases,
      { input: '', expectedOutput: '', marks: 5 }
    ];
    setCodingQuestions(updated);
  };

  const handleUpdateHiddenTestCase = (qIndex, tcIndex, field, value) => {
    const updated = [...codingQuestions];
    const cases = [...updated[qIndex].hiddenTestCases];
    cases[tcIndex] = { ...cases[tcIndex], [field]: value };
    updated[qIndex].hiddenTestCases = cases;
    setCodingQuestions(updated);
  };

  const handleDeleteHiddenTestCase = (qIndex, tcIndex) => {
    const updated = [...codingQuestions];
    if (updated[qIndex].hiddenTestCases.length <= 1) return;
    updated[qIndex].hiddenTestCases = updated[qIndex].hiddenTestCases.filter((_, i) => i !== tcIndex);
    setCodingQuestions(updated);
  };

  const handleDeleteCoding = (index) => {
    setCodingQuestions(codingQuestions.filter((_, i) => i !== index));
  };

  // ── Student Assignment Handlers ──
  const toggleStudentSelection = (studentId) => {
    const updated = new Set(selectedStudentIds);
    if (updated.has(studentId)) {
      updated.delete(studentId);
    } else {
      updated.add(studentId);
    }
    setSelectedStudentIds(updated);
  };

  const toggleSelectAllStudents = () => {
    if (selectedStudentIds.size === availableStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(availableStudents.map((s) => s.id)));
    }
  };

  const handleAddManualCandidate = (e) => {
    e.preventDefault();
    if (!newCandidate.name.trim() || !newCandidate.studentId.trim()) return;

    const candObj = {
      id: newCandidate.studentId.trim(),
      name: newCandidate.name.trim(),
      email: newCandidate.email.trim() || `${newCandidate.studentId.toLowerCase()}@university.edu`,
      course: basicDetails.code || 'Assigned Candidate',
      status: 'Active'
    };

    setAvailableStudents([candObj, ...availableStudents]);
    setSelectedStudentIds(new Set(selectedStudentIds).add(candObj.id));
    setNewCandidate({ name: '', studentId: '', email: '' });
    setIsAddingCandidate(false);
  };

  // ── Validation and Save Handler ──
  const validateExam = (isPublish = false) => {
    if (!basicDetails.title.trim()) {
      return 'Please provide an Exam Title.';
    }
    if (!basicDetails.code.trim()) {
      return 'Please enter a Subject / Course Code.';
    }

    if (isPublish) {
      if (basicDetails.examType === 'mcq' && mcqQuestions.length === 0) {
        return 'An MCQ exam must contain at least one question.';
      }
      if (basicDetails.examType === 'coding' && codingQuestions.length === 0) {
        return 'A Coding exam must contain at least one coding problem.';
      }
      if (basicDetails.examType === 'mixed' && (mcqQuestions.length === 0 || codingQuestions.length === 0)) {
        return 'A Mixed exam requires both MCQ questions and Coding problems.';
      }
      if (selectedStudentIds.size === 0) {
        return 'Please assign at least one student to this examination.';
      }
    }
    return null;
  };

  const handleSaveExam = async (status = 'published') => {
    setErrorMsg('');
    const error = validateExam(status === 'published');
    if (error) {
      setErrorMsg(error);
      return;
    }

    setIsSubmitting(true);

    try {
      // Build questions payload
      const questionsPayload = [];

      if (basicDetails.examType === 'mcq' || basicDetails.examType === 'mixed') {
        mcqQuestions.forEach((q, idx) => {
          questionsPayload.push({
            id: q.id.startsWith('mcq-') ? `q-${Date.now()}-${idx}` : q.id,
            type: 'mcq',
            title: q.title || `MCQ ${idx + 1}`,
            question: q.statement || q.title,
            optionsJson: JSON.stringify(q.options),
            correctIndex: q.correctIndex,
            marks: Number(q.marks) || 5,
            difficulty: 'Medium',
            explanation: q.explanation || '',
            orderIndex: idx
          });
        });
      }

      if (basicDetails.examType === 'coding' || basicDetails.examType === 'mixed') {
        codingQuestions.forEach((cq, idx) => {
          const codingId = cq.id.startsWith('code-') ? `q-code-${Date.now()}-${idx}` : cq.id;
          questionsPayload.push({
            id: codingId,
            type: 'coding',
            title: cq.title,
            question: cq.statement,
            inputFormat: cq.inputFormat,
            outputFormat: cq.outputFormat,
            constraintsJson: JSON.stringify(cq.constraints),
            allowedLanguages: (cq.allowedLanguages || ['javascript', 'python']).join(','),
            marks: Number(cq.marks) || 15,
            difficulty: 'Medium',
            orderIndex: mcqQuestions.length + idx,
            sampleTestCases: cq.sampleTestCases.map((stc, stcIdx) => ({
              input: stc.input,
              expectedOutput: stc.expectedOutput,
              isSample: true,
              marks: Number(stc.marks) || 5,
              orderIndex: stcIdx
            })),
            hiddenTestCases: cq.hiddenTestCases.map((htc, htcIdx) => ({
              input: htc.input,
              expectedOutput: htc.expectedOutput,
              isSample: false,
              marks: Number(htc.marks) || 5,
              orderIndex: htcIdx
            }))
          });
        });
      }

      // Build assignments payload
      const assignedStudentsList = availableStudents
        .filter((s) => selectedStudentIds.has(s.id))
        .map((s) => ({
          studentId: s.id,
          studentName: s.name,
          studentEmail: s.email
        }));

      const payload = {
        name: basicDetails.title,
        title: basicDetails.title,
        code: basicDetails.code,
        description: basicDetails.description,
        instructions: basicDetails.instructions,
        examType: basicDetails.examType,
        duration: `${basicDetails.durationMinutes} mins`,
        durationMinutes: Number(basicDetails.durationMinutes),
        totalMarks: totalCalculatedMarks,
        passingMarks: Number(basicDetails.passingMarks),
        status: status,
        proctoringMode: basicDetails.proctoringMode,
        date: schedule.date,
        time: `${schedule.startTime} - ${schedule.endTime}`,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        windowStartDate: schedule.windowStartDate,
        windowEndDate: schedule.windowEndDate,
        questions: questionsPayload,
        assignedStudents: assignedStudentsList
      };

      const result = await createExam(payload);
      if (onExamCreated) {
        onExamCreated(result);
      }
      onClose();
    } catch (err) {
      console.error('Failed to create complete exam:', err);
      setErrorMsg(err.message || 'Failed to save examination. Please verify input data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 28, 48, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          width: '100%',
          maxWidth: '1050px',
          maxHeight: '92vh',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)'
        }}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: 'var(--pt-navy-900)',
            color: '#ffffff',
            padding: '20px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--sidebar-border)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: 'rgba(38, 198, 218, 0.15)',
                border: '1px solid rgba(38, 198, 218, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Sparkles size={22} color="#26c6da" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                Complete Examination Creator &amp; Invigilation Setup
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94b4cf' }}>
                Build comprehensive MCQ &amp; coding assessments with automated test-case evaluation
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#8eaec9',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Stepper Navigation */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            backgroundColor: 'var(--bg-app)',
            borderBottom: '1px solid var(--border-subtle)'
          }}
        >
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isPassed = currentStep > step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStep(step.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '14px 16px',
                  border: 'none',
                  borderBottom: isActive ? '3px solid var(--pt-blue-800)' : '3px solid transparent',
                  backgroundColor: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? 'var(--pt-navy-900)' : isPassed ? 'var(--pt-blue-800)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    backgroundColor: isActive ? 'var(--pt-navy-800)' : isPassed ? 'var(--pt-blue-100)' : 'var(--border-subtle)',
                    color: isActive ? '#ffffff' : isPassed ? 'var(--pt-navy-800)' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                    flexShrink: 0
                  }}
                >
                  {isPassed ? <Check size={14} /> : step.id}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>{step.label}</div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {step.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Dynamic Metric Bar */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            padding: '10px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              Type: <strong style={{ color: 'var(--pt-navy-900)', textTransform: 'uppercase' }}>{basicDetails.examType}</strong>
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>
              MCQs: <strong style={{ color: 'var(--pt-navy-900)' }}>{mcqQuestions.length}</strong>
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>
              Coding Problems: <strong style={{ color: 'var(--pt-navy-900)' }}>{codingQuestions.length}</strong>
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>
              Total Marks: <strong style={{ color: '#0369a1' }}>{totalCalculatedMarks} pts</strong>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              Assigned Students: <strong style={{ color: 'var(--pt-navy-900)' }}>{selectedStudentIds.size} candidates</strong>
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>
              Duration: <strong style={{ color: 'var(--pt-navy-900)' }}>{basicDetails.durationMinutes} mins</strong>
            </span>
          </div>
        </div>

        {/* Error notification banner if any */}
        {errorMsg && (
          <div
            style={{
              padding: '10px 24px',
              backgroundColor: '#fef2f2',
              borderBottom: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {/* ══════════════════════════════════════════════════════════
              STEP 1: BASIC EXAM DETAILS
          ══════════════════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Exam Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Distributed Algorithms & Systems Final Examination"
                    value={basicDetails.title}
                    onChange={(e) => setBasicDetails({ ...basicDetails, title: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Course / Subject Code *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. CS401"
                    value={basicDetails.code}
                    onChange={(e) => setBasicDetails({ ...basicDetails, code: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Exam Description / Syllabus</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Outline the scope, covered modules, and objectives of this assessment..."
                  value={basicDetails.description}
                  onChange={(e) => setBasicDetails({ ...basicDetails, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Exam Format</label>
                  <select
                    className="form-select"
                    value={basicDetails.examType}
                    onChange={(e) => setBasicDetails({ ...basicDetails, examType: e.target.value })}
                  >
                    <option value="mixed">Mixed (MCQs + Coding)</option>
                    <option value="mcq">MCQ Based Only</option>
                    <option value="coding">Coding Based Only</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Duration (Minutes)</label>
                  <input
                    type="number"
                    min="10"
                    max="300"
                    className="form-input"
                    value={basicDetails.durationMinutes}
                    onChange={(e) => setBasicDetails({ ...basicDetails, durationMinutes: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Passing Marks</label>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    className="form-input"
                    value={basicDetails.passingMarks}
                    onChange={(e) => setBasicDetails({ ...basicDetails, passingMarks: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Proctoring Enforcement Policy</label>
                <select
                  className="form-select"
                  value={basicDetails.proctoringMode}
                  onChange={(e) => setBasicDetails({ ...basicDetails, proctoringMode: e.target.value })}
                >
                  <option value="Strict AI + Live Proctor">Strict AI + Live Proctor (Webcam, Tab-lock &amp; Anti-Copy)</option>
                  <option value="Strict AI">Strict AI (Automated Vision &amp; Audio Anomaly)</option>
                  <option value="Standard AI">Standard AI (Basic Verification)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Instructions for Students</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  value={basicDetails.instructions}
                  onChange={(e) => setBasicDetails({ ...basicDetails, instructions: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              STEP 2: EXAM QUESTIONS SETUP
          ══════════════════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Type Switcher tabs if mixed */}
              {basicDetails.examType === 'mixed' && (
                <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setQuestionTab('mcq')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: questionTab === 'mcq' ? 'var(--pt-navy-800)' : 'var(--bg-app)',
                      color: questionTab === 'mcq' ? '#ffffff' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Multiple Choice Questions ({mcqQuestions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionTab('coding')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: questionTab === 'coding' ? 'var(--pt-navy-800)' : 'var(--bg-app)',
                      color: questionTab === 'coding' ? '#ffffff' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Coding Challenges ({codingQuestions.length})
                  </button>
                </div>
              )}

              {/* MCQ SETUP SECTION */}
              {(basicDetails.examType === 'mcq' || (basicDetails.examType === 'mixed' && questionTab === 'mcq')) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--pt-navy-900)', margin: 0 }}>
                        Multiple Choice Questions ({mcqQuestions.length})
                      </h3>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                        Define question statements, choices, and mark the correct answer with the radio selector.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleAddMcq}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Plus size={14} /> Add MCQ
                    </button>
                  </div>

                  {mcqQuestions.map((q, qIdx) => (
                    <div
                      key={q.id}
                      style={{
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '10px',
                        padding: '16px 20px',
                        backgroundColor: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--pt-navy-900)' }}>
                          Question #{qIdx + 1}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Marks:</label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              style={{ width: '60px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}
                              value={q.marks}
                              onChange={(e) => handleUpdateMcq(qIdx, 'marks', e.target.value)}
                            />
                          </div>
                          {mcqQuestions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMcq(qIdx)}
                              style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                              title="Delete Question"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Question Statement *</label>
                        <textarea
                          className="form-textarea"
                          rows={2}
                          placeholder="Enter question text here..."
                          value={q.statement}
                          onChange={(e) => handleUpdateMcq(qIdx, 'statement', e.target.value)}
                        />
                      </div>

                      {/* Options */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label className="form-label" style={{ margin: 0 }}>
                          Answer Options (Select the radio button for the correct answer) *
                        </label>
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="radio"
                              name={`correct-ans-${q.id}`}
                              checked={q.correctIndex === optIdx}
                              onChange={() => handleUpdateMcq(qIdx, 'correctIndex', optIdx)}
                              style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                              title="Mark as correct answer"
                            />
                            <span
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '4px',
                                backgroundColor: q.correctIndex === optIdx ? '#ecfdf5' : 'var(--bg-app)',
                                color: q.correctIndex === optIdx ? '#059669' : 'var(--text-secondary)',
                                fontWeight: 700,
                                fontSize: '11px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid',
                                borderColor: q.correctIndex === optIdx ? '#86efac' : 'var(--border-subtle)'
                              }}
                            >
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <input
                              type="text"
                              className="form-input"
                              value={opt}
                              onChange={(e) => handleUpdateMcqOption(qIdx, optIdx, e.target.value)}
                              placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                              style={{
                                flex: 1,
                                borderColor: q.correctIndex === optIdx ? '#86efac' : 'var(--border-subtle)',
                                backgroundColor: q.correctIndex === optIdx ? '#f0fdf4' : '#ffffff'
                              }}
                            />
                            {q.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMcqOption(qIdx, optIdx)}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleAddMcqOption(qIdx)}
                          style={{
                            alignSelf: 'flex-start',
                            background: 'none',
                            border: 'none',
                            color: 'var(--pt-blue-800)',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '4px'
                          }}
                        >
                          <Plus size={13} /> Add Another Choice
                        </button>
                      </div>

                      {/* Explanation */}
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Explanation / Solution Note (Shown in review)</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Optional explanation of the correct answer"
                          value={q.explanation}
                          onChange={(e) => handleUpdateMcq(qIdx, 'explanation', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* CODING SETUP SECTION */}
              {(basicDetails.examType === 'coding' || (basicDetails.examType === 'mixed' && questionTab === 'coding')) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--pt-navy-900)', margin: 0 }}>
                        Coding Challenges ({codingQuestions.length})
                      </h3>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                        Configure problem statement, constraints, visible sample test cases, and private hidden test cases.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleAddCoding}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Plus size={14} /> Add Coding Problem
                    </button>
                  </div>

                  {codingQuestions.map((cq, cqIdx) => (
                    <div
                      key={cq.id}
                      style={{
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '10px',
                        padding: '18px 20px',
                        backgroundColor: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Code2 size={18} color="var(--pt-navy-800)" />
                          <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--pt-navy-900)' }}>
                            Coding Challenge #{cqIdx + 1}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Problem Marks:</label>
                            <input
                              type="number"
                              min="5"
                              max="200"
                              style={{ width: '60px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}
                              value={cq.marks}
                              onChange={(e) => handleUpdateCoding(cqIdx, 'marks', e.target.value)}
                            />
                          </div>
                          {codingQuestions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCoding(cqIdx)}
                              style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Problem Title *</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Find First Non-Repeating Character"
                          value={cq.title}
                          onChange={(e) => handleUpdateCoding(cqIdx, 'title', e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Problem Statement / Description *</label>
                        <textarea
                          className="form-textarea"
                          rows={3}
                          placeholder="Describe the problem, requirements, expected algorithm behavior..."
                          value={cq.statement}
                          onChange={(e) => handleUpdateCoding(cqIdx, 'statement', e.target.value)}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">Input Format</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. Array of integers nums, integer target"
                            value={cq.inputFormat}
                            onChange={(e) => handleUpdateCoding(cqIdx, 'inputFormat', e.target.value)}
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">Output Format</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. Return indices [i, j]"
                            value={cq.outputFormat}
                            onChange={(e) => handleUpdateCoding(cqIdx, 'outputFormat', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Sample Test Cases (Visible to student) */}
                      <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Eye size={15} color="#0284c7" />
                            <strong style={{ fontSize: '13px', color: '#0369a1' }}>Sample Test Cases (Visible to Students)</strong>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddSampleTestCase(cqIdx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#0284c7',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Plus size={13} /> Add Sample Case
                          </button>
                        </div>

                        {cq.sampleTestCases.map((stc, stcIdx) => (
                          <div
                            key={stcIdx}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '2fr 2fr 1fr auto',
                              gap: '10px',
                              alignItems: 'center',
                              marginBottom: '8px'
                            }}
                          >
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Input: e.g. twoSum([2,7,11,15], 9)"
                              value={stc.input}
                              onChange={(e) => handleUpdateSampleTestCase(cqIdx, stcIdx, 'input', e.target.value)}
                            />
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Expected: e.g. [0, 1]"
                              value={stc.expectedOutput}
                              onChange={(e) => handleUpdateSampleTestCase(cqIdx, stcIdx, 'expectedOutput', e.target.value)}
                            />
                            <input
                              type="number"
                              className="form-input"
                              placeholder="Marks"
                              value={stc.marks}
                              onChange={(e) => handleUpdateSampleTestCase(cqIdx, stcIdx, 'marks', e.target.value)}
                            />
                            {cq.sampleTestCases.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteSampleTestCase(cqIdx, stcIdx)}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Hidden Test Cases (Evaluated backend only) */}
                      <div style={{ backgroundColor: '#fdf2f8', padding: '14px', borderRadius: '8px', border: '1px solid #fbcfe8' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <EyeOff size={15} color="#db2777" />
                            <strong style={{ fontSize: '13px', color: '#be185d' }}>
                              Hidden Test Cases (Confidential - Backend Execution Only)
                            </strong>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddHiddenTestCase(cqIdx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#db2777',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Plus size={13} /> Add Hidden Case
                          </button>
                        </div>

                        {cq.hiddenTestCases.map((htc, htcIdx) => (
                          <div
                            key={htcIdx}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '2fr 2fr 1fr auto',
                              gap: '10px',
                              alignItems: 'center',
                              marginBottom: '8px'
                            }}
                          >
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Input: e.g. twoSum([3,3], 6)"
                              value={htc.input}
                              onChange={(e) => handleUpdateHiddenTestCase(cqIdx, htcIdx, 'input', e.target.value)}
                            />
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Expected: e.g. [0, 1]"
                              value={htc.expectedOutput}
                              onChange={(e) => handleUpdateHiddenTestCase(cqIdx, htcIdx, 'expectedOutput', e.target.value)}
                            />
                            <input
                              type="number"
                              className="form-input"
                              placeholder="Marks"
                              value={htc.marks}
                              onChange={(e) => handleUpdateHiddenTestCase(cqIdx, htcIdx, 'marks', e.target.value)}
                            />
                            {cq.hiddenTestCases.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteHiddenTestCase(cqIdx, htcIdx)}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              STEP 3: STUDENT ASSIGNMENT
          ══════════════════════════════════════════════════════════ */}
          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--pt-navy-900)', margin: 0 }}>
                    Assign Students ({selectedStudentIds.size} Selected)
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                    Only assigned candidates will be granted access to start and attempt this examination.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIsAddingCandidate(!isAddingCandidate)}
                  >
                    <UserPlus size={14} /> Add Candidate Manually
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={toggleSelectAllStudents}
                  >
                    {selectedStudentIds.size === availableStudents.length ? 'Deselect All' : 'Select All Students'}
                  </button>
                </div>
              </div>

              {/* Manual Candidate Form */}
              {isAddingCandidate && (
                <form
                  onSubmit={handleAddManualCandidate}
                  style={{
                    backgroundColor: 'var(--bg-app)',
                    padding: '16px 20px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1.5fr auto',
                    gap: '12px',
                    alignItems: 'flex-end'
                  }}
                >
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Student Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Jordan Miller"
                      value={newCandidate.name}
                      onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Student ID *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. STU008"
                      value={newCandidate.studentId}
                      onChange={(e) => setNewCandidate({ ...newCandidate, studentId: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="e.g. j.miller@university.edu"
                      value={newCandidate.email}
                      onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm">
                    Enroll Candidate
                  </button>
                </form>
              )}

              {/* Search Bar */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search students by name, candidate ID, or email..."
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                />
              </div>

              {/* Student Roster Table */}
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '10px', overflow: 'hidden' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.size > 0 && selectedStudentIds.size === availableStudents.length}
                          onChange={toggleSelectAllStudents}
                          style={{ cursor: 'pointer' }}
                        />
                      </th>
                      <th>Candidate Name</th>
                      <th>Student ID</th>
                      <th>Email</th>
                      <th>Course</th>
                      <th>Assignment Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s) => {
                      const isSelected = selectedStudentIds.has(s.id);
                      return (
                        <tr
                          key={s.id}
                          onClick={() => toggleStudentSelection(s.id)}
                          style={{
                            cursor: 'pointer',
                            backgroundColor: isSelected ? '#f0fdf4' : 'transparent'
                          }}
                        >
                          <td>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleStudentSelection(s.id)}
                              onClick={(e) => e.stopPropagation()}
                              style={{ cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--pt-navy-900)' }}>{s.name}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{s.id}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{s.email}</td>
                          <td>{s.course || 'Enrolled'}</td>
                          <td>
                            {isSelected ? (
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: '#15803d',
                                  backgroundColor: '#dcfce7',
                                  padding: '2px 8px',
                                  borderRadius: '4px'
                                }}
                              >
                                Assigned
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Unassigned</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              STEP 4: SCHEDULE & TIME WINDOW
          ══════════════════════════════════════════════════════════ */}
          {currentStep === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--pt-navy-900)', margin: 0 }}>
                  Exam Schedule &amp; Access Window Configuration
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                  Define the availability timeframe during which candidates are permitted to initialize their attempt.
                </p>
              </div>

              {/* Window Explanation Card */}
              <div
                style={{
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '10px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}
              >
                <Clock size={20} color="#0284c7" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <strong style={{ fontSize: '13px', color: '#0369a1' }}>Availability Window vs. Exam Duration</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#0c4a6e', lineHeight: 1.5 }}>
                    Candidates may initiate the exam at any time between <strong>{schedule.startTime}</strong> and{' '}
                    <strong>{schedule.endTime}</strong>. Once started, their countdown timer runs for precisely{' '}
                    <strong>{basicDetails.durationMinutes} minutes</strong> (or until the availability window closes, whichever occurs first).
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Exam Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={schedule.date}
                    onChange={(e) =>
                      setSchedule({
                        ...schedule,
                        date: e.target.value,
                        windowStartDate: e.target.value,
                        windowEndDate: e.target.value
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Window Opens (Start Time) *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 10:00 AM or 10:00"
                    value={schedule.startTime}
                    onChange={(e) => setSchedule({ ...schedule, startTime: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Window Closes (End Time) *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 02:00 PM or 14:00"
                    value={schedule.endTime}
                    onChange={(e) => setSchedule({ ...schedule, endTime: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              STEP 5: REVIEW & PUBLISH
          ══════════════════════════════════════════════════════════ */}
          {currentStep === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--pt-navy-900)', margin: 0 }}>
                  Review &amp; Finalize Examination
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                  Verify configuration parameters before publishing or saving as an editable draft.
                </p>
              </div>

              {/* Summary Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Exam Info
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--pt-navy-900)', marginTop: '4px' }}>
                    {basicDetails.title || 'Untitled Assessment'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--pt-blue-800)', fontWeight: 700, marginTop: '2px' }}>
                    Code: {basicDetails.code || 'N/A'}
                  </div>
                </div>

                <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Questions &amp; Marks
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--pt-navy-900)', marginTop: '4px' }}>
                    {basicDetails.examType === 'mcq'
                      ? `${mcqQuestions.length} MCQs`
                      : basicDetails.examType === 'coding'
                      ? `${codingQuestions.length} Coding Problems`
                      : `${mcqQuestions.length} MCQs + ${codingQuestions.length} Coding`}
                  </div>
                  <div style={{ fontSize: '12px', color: '#0369a1', fontWeight: 700, marginTop: '2px' }}>
                    Total: {totalCalculatedMarks} pts · Pass: {basicDetails.passingMarks} pts
                  </div>
                </div>

                <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Access &amp; Schedule
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--pt-navy-900)', marginTop: '4px' }}>
                    {selectedStudentIds.size} Candidates Assigned
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {schedule.date} ({schedule.startTime} - {schedule.endTime})
                  </div>
                </div>
              </div>

              {/* Candidate Roster Preview */}
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '16px' }}>
                <strong style={{ fontSize: '13px', color: 'var(--pt-navy-900)' }}>Assigned Candidates Preview:</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                  {availableStudents
                    .filter((s) => selectedStudentIds.has(s.id))
                    .map((s) => (
                      <span
                        key={s.id}
                        style={{
                          fontSize: '12px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#f1f5f9',
                          color: '#334155',
                          border: '1px solid #cbd5e1'
                        }}
                      >
                        <strong>{s.name}</strong> ({s.id})
                      </span>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div
          style={{
            padding: '16px 28px',
            backgroundColor: '#ffffff',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCurrentStep(currentStep - 1)}
                disabled={isSubmitting}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowLeft size={15} /> Previous Step
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleSaveExam('draft')}
              disabled={isSubmitting}
            >
              Save as Draft
            </button>

            {currentStep < 5 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setCurrentStep(currentStep + 1)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                Next Step <ArrowRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleSaveExam('published')}
                disabled={isSubmitting}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <CheckCircle size={16} />
                {isSubmitting ? 'Publishing Exam...' : 'Publish Examination'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
