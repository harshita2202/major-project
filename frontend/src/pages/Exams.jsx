import { useState, useEffect, useMemo } from 'react';
import { Plus, BookOpen, Clock, Calendar, Users, Eye, Play, CheckCircle } from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import SearchBar from '../components/common/SearchBar';
import Modal from '../components/common/Modal';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { getExams, createExam } from '../services/api';

export default function Exams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    duration: '60',
    date: '2026-09-22',
    time: '10:00 AM',
    proctoringMode: 'Strict AI'
  });

  useEffect(() => {
    async function loadExams() {
      try {
        const data = await getExams();
        setExams(data);
      } catch (err) {
        console.error('Failed to load exams:', err);
      } finally {
        setLoading(false);
      }
    }
    loadExams();
  }, []);

  const filteredExams = useMemo(() => {
    let list = [...exams];

    if (filterStatus !== 'All') {
      list = list.filter((e) => e.status.toLowerCase() === filterStatus.toLowerCase());
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(term) ||
          e.code.toLowerCase().includes(term) ||
          (e.description && e.description.toLowerCase().includes(term))
      );
    }

    return list;
  }, [exams, filterStatus, searchTerm]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      const newExam = await createExam(formData);
      setExams([newExam, ...exams]);
      setIsModalOpen(false);
      setFormData({
        name: '',
        code: '',
        description: '',
        duration: '60',
        date: '2026-09-22',
        time: '10:00 AM',
        proctoringMode: 'Strict AI'
      });
    } catch (err) {
      console.error('Failed to create exam:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading examinations..." size={36} />;
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header with Action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--pt-navy-900)', margin: 0, letterSpacing: '-0.02em' }}>
            Exam Schedule & ProctorTrack™ Configuration
          </h2>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '3px', margin: 0 }}>
            Create and manage assessments with ProctorAuto™, ProctorLive™, and ProctorQA™ invigilation modes
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={16} /> Schedule New Exam
        </button>
      </div>

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
          {['All', 'Live', 'Upcoming', 'Completed'].map((status) => (
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
                  <th>Exam Name</th>
                  <th>Date & Time</th>
                  <th>Duration</th>
                  <th>Students</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExams.map((exam) => (
                  <tr key={exam.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--pt-navy-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{exam.name}</span>
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
                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                          {exam.description}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '13px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--pt-navy-900)', fontWeight: 600 }}>
                          <Calendar size={13} color="var(--pt-blue-800)" /> {exam.date}
                        </span>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                          {exam.time}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569' }}>
                        <Clock size={13} color="#64748b" /> {exam.duration}
                      </span>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                        <Users size={13} color="#2563eb" /> {exam.studentsCount} Candidates
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={exam.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        {exam.status === 'Live' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              color: '#dc2626',
                              fontWeight: 600,
                              backgroundColor: '#fef2f2',
                              padding: '4px 8px',
                              borderRadius: '6px'
                            }}
                          >
                            <Play size={12} fill="#dc2626" /> Supervising
                          </span>
                        ) : exam.status === 'Completed' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              color: '#059669',
                              backgroundColor: '#ecfdf5',
                              padding: '4px 8px',
                              borderRadius: '6px'
                            }}
                          >
                            <CheckCircle size={12} /> Archived
                          </span>
                        ) : (
                          <button type="button" className="btn btn-secondary btn-sm">
                            <Eye size={13} /> View
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Exam Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule New Examination"
        subtitle="Configure session parameters and AI proctoring policies"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.name.trim()}
            >
              {isSubmitting ? 'Creating...' : 'Create Examination'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Exam Name *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Distributed Systems & Algorithms"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Course Code</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. CS402"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description / Syllabus</label>
            <textarea
              className="form-textarea"
              placeholder="Provide a brief summary of topics covered..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-input"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Start Time</label>
              <input
                type="text"
                className="form-input"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Duration (Minutes)</label>
              <input
                type="number"
                min="15"
                max="240"
                className="form-input"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Proctoring Enforcement Level</label>
            <select
              className="form-select"
              value={formData.proctoringMode}
              onChange={(e) => setFormData({ ...formData, proctoringMode: e.target.value })}
            >
              <option value="Strict AI + Live Proctor">Strict AI + Live Proctor (Highest Security)</option>
              <option value="Strict AI">Strict AI (Standard Vision + Audio Anomaly)</option>
              <option value="Standard AI">Standard AI (Basic Face Verification)</option>
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
}
