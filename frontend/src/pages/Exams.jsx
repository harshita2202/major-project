import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  BookOpen,
  Clock,
  Calendar,
  Users,
  Eye,
  Play,
  CheckCircle,
  Award,
  Trash2,
  Send,
  FileText,
  Code2,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import SearchBar from '../components/common/SearchBar';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import CreateExamWizard from '../components/exam-creator/CreateExamWizard';
import ExamResultsModal from '../components/exam-creator/ExamResultsModal';
import { getExams, publishExam, deleteExam } from '../services/api';

export default function Exams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [selectedExamForResults, setSelectedExamForResults] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);

  const loadExams = async () => {
    try {
      const data = await getExams();
      setExams(data);
    } catch (err) {
      console.error('Failed to load exams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  const showNotice = (msg, isError = false) => {
    setActionNotice({ text: msg, isError });
    setTimeout(() => {
      setActionNotice(null);
    }, 4000);
  };

  const handlePublish = async (examId) => {
    try {
      await publishExam(examId);
      showNotice('Exam successfully published and active for assigned candidates!');
      loadExams();
    } catch (err) {
      showNotice(err.message || 'Failed to publish exam', true);
    }
  };

  const handleDelete = async (examId, examName) => {
    if (!window.confirm(`Are you sure you want to delete "${examName}"?`)) {
      return;
    }
    try {
      await deleteExam(examId);
      setExams(exams.filter((e) => e.id !== examId));
      showNotice(`Exam "${examName}" deleted.`);
    } catch (err) {
      showNotice(err.message || 'Failed to delete exam', true);
    }
  };

  const handleOpenResults = (exam) => {
    setSelectedExamForResults(exam);
    setIsResultsModalOpen(true);
  };

  const handleExamCreated = (newExam) => {
    showNotice(`Exam "${newExam.title || newExam.name}" created successfully!`);
    loadExams();
  };

  const filteredExams = useMemo(() => {
    let list = [...exams];

    if (filterStatus !== 'All') {
      const filterLower = filterStatus.toLowerCase();
      list = list.filter((e) => {
        const s = (e.status || '').toLowerCase();
        if (filterLower === 'published') return s === 'published' || s === 'active';
        if (filterLower === 'draft') return s === 'draft';
        if (filterLower === 'live') return s === 'live' || s === 'in-progress';
        if (filterLower === 'completed') return s === 'completed';
        return s === filterLower;
      });
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (e) =>
          (e.name && e.name.toLowerCase().includes(term)) ||
          (e.title && e.title.toLowerCase().includes(term)) ||
          (e.code && e.code.toLowerCase().includes(term)) ||
          (e.description && e.description.toLowerCase().includes(term))
      );
    }

    return list;
  }, [exams, filterStatus, searchTerm]);

  if (loading) {
    return <LoadingSpinner text="Loading examinations..." size={36} />;
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header with Action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--pt-navy-900)', margin: 0, letterSpacing: '-0.02em' }}>
            Exam Management &amp; ProctorTrack™ Configuration
          </h2>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '3px', margin: 0 }}>
            Create, schedule, and grade full assessments with automated test case evaluation &amp; student assignments
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setIsWizardOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} /> Create New Exam
        </button>
      </div>

      {/* Action Notice Alert */}
      {actionNotice && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '8px',
            backgroundColor: actionNotice.isError ? '#fef2f2' : '#f0fdf4',
            border: '1px solid',
            borderColor: actionNotice.isError ? '#fecaca' : '#bbf7d0',
            color: actionNotice.isError ? '#dc2626' : '#15803d',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CheckCircle size={16} />
          <span>{actionNotice.text}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {['All', 'Live', 'Published', 'Draft', 'Completed'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              style={{
                padding: '7px 14px',
                borderRadius: '7px',
                fontSize: '12.5px',
                fontWeight: filterStatus === status ? 700 : 500,
                border: '1px solid',
                borderColor: filterStatus === status ? 'var(--pt-navy-800)' : 'var(--border-subtle)',
                backgroundColor: filterStatus === status ? 'var(--pt-navy-800)' : '#ffffff',
                color: filterStatus === status ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {status}
            </button>
          ))}
        </div>

        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by exam name or course code..."
          maxWidth="300px"
        />
      </div>

      {/* Exams Table Card */}
      <div className="card">
        {filteredExams.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No Examinations Found"
            description="No exams match the selected filter or search query."
            actionText="Clear Filters"
            onAction={() => {
              setFilterStatus('All');
              setSearchTerm('');
            }}
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Exam Name &amp; Code</th>
                  <th>Format</th>
                  <th>Availability Window</th>
                  <th>Duration &amp; Marks</th>
                  <th>Candidates</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExams.map((exam) => {
                  const examTitle = exam.title || exam.name;
                  const isDraft = (exam.status || '').toLowerCase() === 'draft';
                  const isLive = (exam.status || '').toLowerCase() === 'live' || (exam.status || '').toLowerCase() === 'in-progress';
                  const isPublished = (exam.status || '').toLowerCase() === 'published' || (exam.status || '').toLowerCase() === 'active';
                  const isCompleted = (exam.status || '').toLowerCase() === 'completed';

                  const formatBadge = exam.examType === 'coding' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#e0e7ff', color: '#3730a3' }}>
                      <Code2 size={12} /> Coding
                    </span>
                  ) : exam.examType === 'mcq' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                      <HelpCircle size={12} /> MCQ
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#f3e8ff', color: '#6b21a8' }}>
                      <Sparkles size={12} /> Mixed
                    </span>
                  );

                  return (
                    <tr key={exam.id}>
                      <td>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--pt-navy-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{examTitle}</span>
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: 'var(--pt-blue-50)',
                                color: 'var(--pt-navy-800)',
                                fontFamily: 'var(--font-mono)',
                                border: '1px solid var(--primary-100)'
                              }}
                            >
                              {exam.code}
                            </span>
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '3px', maxWidth: '320px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {exam.description}
                          </div>
                        </div>
                      </td>

                      <td>{formatBadge}</td>

                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12.5px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--pt-navy-900)', fontWeight: 600 }}>
                            <Calendar size={13} color="var(--pt-blue-800)" /> {exam.date || exam.windowStartDate || 'Today'}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {exam.time || `${exam.startTime || '10:00 AM'} - ${exam.endTime || '12:00 PM'}`}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12.5px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                            <Clock size={13} color="#64748b" /> {exam.durationMinutes ? `${exam.durationMinutes} mins` : exam.duration}
                          </span>
                          <span style={{ fontSize: '11px', color: '#0369a1', fontWeight: 600 }}>
                            Total: {exam.totalMarks || 100} pts
                          </span>
                        </div>
                      </td>

                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>
                          <Users size={13} color="#2563eb" /> {exam.studentsCount || (exam.assignedStudents ? exam.assignedStudents.length : 0)} Candidates
                        </span>
                      </td>

                      <td>
                        {isDraft ? (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '9999px',
                              backgroundColor: '#f1f5f9',
                              color: '#64748b',
                              border: '1px solid #cbd5e1'
                            }}
                          >
                            Draft
                          </span>
                        ) : isPublished ? (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '9999px',
                              backgroundColor: '#dbeafe',
                              color: '#1e40af',
                              border: '1px solid #bfdbfe'
                            }}
                          >
                            Published
                          </span>
                        ) : (
                          <StatusBadge status={exam.status} />
                        )}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          {isDraft ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => handlePublish(exam.id)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                                title="Publish Exam to Students"
                              >
                                <Send size={12} /> Publish
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleDelete(exam.id, examTitle)}
                                style={{ color: '#dc2626', border: '1px solid #fecaca' }}
                                title="Delete Draft"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOpenResults(exam)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                              >
                                <Award size={13} color="var(--pt-blue-800)" /> Results
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleDelete(exam.id, examTitle)}
                                style={{ color: '#94a3b8' }}
                                title="Delete Examination"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Complete Exam Creation Wizard Modal */}
      {isWizardOpen && (
        <CreateExamWizard
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onExamCreated={handleExamCreated}
        />
      )}

      {/* Exam Results & History Detail Modal */}
      {selectedExamForResults && (
        <ExamResultsModal
          isOpen={isResultsModalOpen}
          onClose={() => {
            setIsResultsModalOpen(false);
            setSelectedExamForResults(null);
          }}
          exam={selectedExamForResults}
        />
      )}
    </div>
  );
}
