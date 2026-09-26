import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Clock, Eye, CheckCircle, XCircle, ShieldAlert } from 'lucide-react';
import RiskBadge from '../components/common/RiskBadge';
import StatusBadge from '../components/common/StatusBadge';
import SearchBar from '../components/common/SearchBar';
import UserAvatar from '../components/common/UserAvatar';
import Modal from '../components/common/Modal';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { getAllViolations } from '../services/api';

export default function Violations() {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [actionFeedback, setActionFeedback] = useState('');

  useEffect(() => {
    async function loadViolations() {
      try {
        const data = await getAllViolations();
        setViolations(data);
      } catch (err) {
        console.error('Failed to load violations:', err);
      } finally {
        setLoading(false);
      }
    }
    loadViolations();
  }, []);

  const filteredViolations = useMemo(() => {
    let list = [...violations];

    if (severityFilter !== 'All') {
      list = list.filter((v) => v.severity.toLowerCase() === severityFilter.toLowerCase());
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (v) =>
          v.student.toLowerCase().includes(term) ||
          v.exam.toLowerCase().includes(term) ||
          v.violation.toLowerCase().includes(term)
      );
    }

    return list;
  }, [violations, severityFilter, searchTerm]);

  const handleResolution = (statusText) => {
    if (!selectedViolation) return;
    setViolations(
      violations.map((v) =>
        v.id === selectedViolation.id ? { ...v, status: statusText } : v
      )
    );
    setActionFeedback(`Violation ${selectedViolation.id} marked as: ${statusText}`);
    setTimeout(() => {
      setActionFeedback('');
      setSelectedViolation(null);
    }, 1500);
  };

  if (loading) {
    return <LoadingSpinner text="Retrieving security violation logs..." size={36} />;
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--pt-navy-900)', margin: 0, letterSpacing: '-0.02em' }}>
          PEEP Incident Registry & Adjudication
        </h2>
        <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '3px', margin: 0 }}>
          ProctorTrack™ automated sensor infractions: facial, acoustic, screen, and gaze anomalies
        </p>
      </div>

      {/* Filter and Search */}
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
          {['All', 'High', 'Medium', 'Low'].map((sev) => (
            <button
              key={sev}
              type="button"
              onClick={() => setSeverityFilter(sev)}
              style={{
                padding: '7px 14px',
                borderRadius: '7px',
                fontSize: '12.5px',
                fontWeight: severityFilter === sev ? 700 : 500,
                border: '1px solid',
                borderColor: severityFilter === sev ? 'var(--pt-navy-800)' : 'var(--border-subtle)',
                backgroundColor: severityFilter === sev ? 'var(--pt-navy-800)' : '#ffffff',
                color: severityFilter === sev ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {sev === 'All' ? 'All Severities' : `${sev} Severity`}
            </button>
          ))}
        </div>

        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Filter candidate, exam, or infraction..."
          maxWidth="300px"
        />
      </div>

      {/* Violations Table */}
      <div className="card">
        {filteredViolations.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="No Violations Found"
            description="No infractions match the current search or severity level."
            actionText="Reset Filter"
            onAction={() => {
              setSeverityFilter('All');
              setSearchTerm('');
            }}
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Exam</th>
                  <th>Violation Type</th>
                  <th>Severity</th>
                  <th>Timestamp</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredViolations.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <UserAvatar avatar={v.avatar} name={v.student} size={32} />
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>
                          {v.student}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500, color: '#334155' }}>{v.exam}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#dc2626' }}>{v.violation}</span>
                    </td>
                    <td>
                      <RiskBadge level={v.severity} showIcon={false} />
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12.5px', color: '#64748b' }}>
                        <Clock size={12} /> {v.time}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={v.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedViolation(v)}
                      >
                        <Eye size={13} /> Review Evidence
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed Violation Inspection Modal */}
      {selectedViolation && (
        <Modal
          isOpen={Boolean(selectedViolation)}
          onClose={() => setSelectedViolation(null)}
          title={`Violation Case ${selectedViolation.id}`}
          subtitle={`${selectedViolation.student} • ${selectedViolation.exam}`}
          maxWidth="620px"
          footer={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span style={{ fontSize: '12.5px', color: '#059669', fontWeight: 600 }}>
                {actionFeedback}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleResolution('Dismissed')}
                >
                  <CheckCircle size={14} color="#059669" /> Dismiss Flag
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => handleResolution('Disqualified')}
                >
                  <XCircle size={14} /> Disqualify Exam
                </button>
              </div>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Snapshot Placeholder */}
            <div
              style={{
                height: '180px',
                backgroundColor: '#0a0f1d',
                borderRadius: '10px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                border: '1px solid #1e293b'
              }}
            >
              <ShieldAlert size={36} color="#ef4444" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '14px', fontWeight: 600 }}>
                Automated Infraction Snapshot Frame
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                Captured at {selectedViolation.time} • AI Confidence: {selectedViolation.confidenceScore}
              </div>
            </div>

            {/* Violation Details */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '13px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Infraction:</span>
                <span style={{ fontWeight: 700, color: '#dc2626' }}>{selectedViolation.violation}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Severity Level:</span>
                <RiskBadge level={selectedViolation.severity} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Current Status:</span>
                <StatusBadge status={selectedViolation.status} />
              </div>
              <div style={{ marginTop: '6px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  Audited Log Explanation:
                </span>
                <p style={{ color: '#0f172a', fontWeight: 500, margin: 0 }}>
                  {selectedViolation.description}
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
