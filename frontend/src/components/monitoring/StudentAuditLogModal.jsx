import { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Camera,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Filter,
  Eye,
  RefreshCw,
  Search,
  ExternalLink,
  Shield,
  User
} from 'lucide-react';
import Modal from '../common/Modal';
import RiskBadge from '../common/RiskBadge';
import StatusBadge from '../common/StatusBadge';
import EvidenceSnapshotModal from './EvidenceSnapshotModal';
import { getStudentEvents } from '../../services/api';

export default function StudentAuditLogModal({ student, isOpen, onClose }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'MULTIPLE_FACES' | 'HIGH' | 'VOICE'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvidence, setSelectedEvidence] = useState(null);

  const studentId = student?.id || student?.studentId || student?.candidateId;
  const studentName = student?.name || student?.candidate || student?.student || 'Candidate';

  const fetchLogs = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const data = await getStudentEvents(studentId);
      setEvents(data);
    } catch (err) {
      console.error('Failed to fetch student audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && studentId) {
      fetchLogs();
    }
  }, [isOpen, studentId]);

  const filteredEvents = useMemo(() => {
    let list = [...events];

    if (activeFilter === 'MULTIPLE_FACES') {
      list = list.filter(
        (ev) =>
          ev.eventType === 'MULTIPLE_FACES' ||
          (ev.details && ev.details.toLowerCase().includes('multiple face')) ||
          Boolean(ev.snapshot)
      );
    } else if (activeFilter === 'HIGH') {
      list = list.filter(
        (ev) => (ev.severity || '').toLowerCase() === 'high' || (ev.severity || '').toLowerCase() === 'critical'
      );
    } else if (activeFilter === 'VOICE') {
      list = list.filter(
        (ev) =>
          ev.eventType === 'MULTIPLE_VOICES' ||
          ev.eventType === 'VOICE_WARNING' ||
          ev.eventType === 'AUDIO_ANOMALY' ||
          (ev.details && ev.details.toLowerCase().includes('voice'))
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (ev) =>
          (ev.eventType && ev.eventType.toLowerCase().includes(q)) ||
          (ev.details && ev.details.toLowerCase().includes(q)) ||
          (ev.timestamp && String(ev.timestamp).toLowerCase().includes(q))
      );
    }

    return list;
  }, [events, activeFilter, searchQuery]);

  const multiFacesCount = useMemo(() => {
    return events.filter(
      (ev) =>
        ev.eventType === 'MULTIPLE_FACES' ||
        (ev.details && ev.details.toLowerCase().includes('multiple face')) ||
        Boolean(ev.snapshot)
    ).length;
  }, [events]);

  if (!student) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Student Proctoring Audit Log: ${studentName}`}
        subtitle={`Student ID: ${studentId} • Total Recorded Incidents: ${events.length}`}
        maxWidth="960px"
        footer={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Showing {filteredEvents.length} of {events.length} logs for candidate {studentName}
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Close Audit Log
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Candidate Summary Header Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc',
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: '#e2e8f0',
                  color: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '14px',
                }}
              >
                {studentName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{studentName}</div>
                <div style={{ fontSize: '11.5px', color: '#64748b' }}>{student.email || `${studentId.toLowerCase()}@university.edu`}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                  Current Risk Tier
                </div>
                <div style={{ marginTop: '3px' }}>
                  <RiskBadge level={student.risk || student.riskLevel || 'LOW'} score={student.riskScore || 0} />
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                  Multiple Face Flag
                </div>
                <div style={{ marginTop: '3px' }}>
                  {multiFacesCount > 0 ? (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: '1px solid #fecaca',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Camera size={12} /> {multiFacesCount} Captured
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: '#f0fdf4',
                        color: '#16a34a',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: '1px solid #bbf7d0',
                      }}
                    >
                      0 Detected
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={fetchLogs}
                disabled={loading}
                title="Refresh student logs"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setActiveFilter('ALL')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: activeFilter === 'ALL' ? 'var(--pt-navy-800)' : '#cbd5e1',
                  backgroundColor: activeFilter === 'ALL' ? 'var(--pt-navy-800)' : '#ffffff',
                  color: activeFilter === 'ALL' ? '#ffffff' : '#475569',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                All Logs ({events.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('MULTIPLE_FACES')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: activeFilter === 'MULTIPLE_FACES' ? '#dc2626' : '#cbd5e1',
                  backgroundColor: activeFilter === 'MULTIPLE_FACES' ? '#dc2626' : '#ffffff',
                  color: activeFilter === 'MULTIPLE_FACES' ? '#ffffff' : '#dc2626',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Camera size={13} /> Multiple Faces ({multiFacesCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('HIGH')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: activeFilter === 'HIGH' ? '#ea580c' : '#cbd5e1',
                  backgroundColor: activeFilter === 'HIGH' ? '#ea580c' : '#ffffff',
                  color: activeFilter === 'HIGH' ? '#ffffff' : '#ea580c',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                High Severity
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('VOICE')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: activeFilter === 'VOICE' ? '#2563eb' : '#cbd5e1',
                  backgroundColor: activeFilter === 'VOICE' ? '#2563eb' : '#ffffff',
                  color: activeFilter === 'VOICE' ? '#ffffff' : '#2563eb',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Voice Infractions
              </button>
            </div>

            {/* Search Box */}
            <div style={{ position: 'relative', width: '220px' }}>
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '5px 10px 5px 28px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                }}
              />
              <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: '8px', top: '8px' }} />
            </div>
          </div>

          {/* Logs Table */}
          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              overflow: 'hidden',
              maxHeight: '400px',
              overflowY: 'auto',
            }}
          >
            {loading ? (
              <div style={{ padding: '36px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                <RefreshCw size={22} className="animate-spin" style={{ margin: '0 auto 8px', color: '#2563eb' }} />
                Loading candidate audit records...
              </div>
            ) : filteredEvents.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                <FileText size={28} style={{ opacity: 0.4, margin: '0 auto 8px' }} />
                No proctoring logs match your current filter.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '10px 14px', width: '120px' }}>Timestamp</th>
                    <th style={{ padding: '10px 14px', width: '180px' }}>Incident Type</th>
                    <th style={{ padding: '10px 14px', width: '90px' }}>Severity</th>
                    <th style={{ padding: '10px 14px' }}>Details & Context</th>
                    <th style={{ padding: '10px 14px', width: '150px', textAlign: 'center' }}>Photo Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((ev, i) => {
                    const isMultipleFaces =
                      ev.eventType === 'MULTIPLE_FACES' ||
                      (ev.details && ev.details.toLowerCase().includes('multiple face')) ||
                      Boolean(ev.snapshot);

                    const isHigh =
                      (ev.severity || '').toLowerCase() === 'high' || (ev.severity || '').toLowerCase() === 'critical';

                    return (
                      <tr
                        key={ev.id || i}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: isMultipleFaces ? '#fff7ed' : i % 2 === 0 ? '#ffffff' : '#fcfcfd',
                        }}
                      >
                        <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', color: '#64748b' }}>
                          {ev.timestamp ? String(ev.timestamp).slice(-8) : 'Live'}
                        </td>

                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: isMultipleFaces ? '#c2410c' : '#1e293b' }}>
                            {isMultipleFaces ? (
                              <Camera size={14} color="#ea580c" />
                            ) : isHigh ? (
                              <AlertOctagon size={14} color="#dc2626" />
                            ) : (
                              <AlertTriangle size={14} color="#d97706" />
                            )}
                            <span>{ev.eventType || 'SECURITY_EVENT'}</span>
                          </div>
                        </td>

                        <td style={{ padding: '10px 14px' }}>
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: isHigh ? '#fee2e2' : '#fef3c7',
                              color: isHigh ? '#b91c1c' : '#92400e',
                            }}
                          >
                            {ev.severity || 'Medium'}
                          </span>
                        </td>

                        <td style={{ padding: '10px 14px', color: '#334155', maxWidth: '320px', lineHeight: 1.4 }}>
                          {ev.details || 'Proctoring event logged'}
                          {ev.pointsAdded ? (
                            <span style={{ marginLeft: '6px', fontSize: '11px', fontWeight: 700, color: '#dc2626' }}>
                              (+{ev.pointsAdded} pts)
                            </span>
                          ) : null}
                        </td>

                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          {ev.snapshot ? (
                            <button
                              type="button"
                              onClick={() => setSelectedEvidence({ ...ev, candidateName: studentName, candidateId: studentId })}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: '1px solid #f87171',
                                backgroundColor: '#fee2e2',
                                color: '#b91c1c',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              title="Click to inspect captured multiple faces screenshot"
                            >
                              <Camera size={12} color="#dc2626" />
                              <span>View Evidence</span>
                            </button>
                          ) : isMultipleFaces ? (
                            <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                              Camera flag
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#cbd5e1' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </Modal>

      {/* Enlarged Evidence Inspection Modal */}
      {selectedEvidence && (
        <EvidenceSnapshotModal
          evidence={selectedEvidence}
          isOpen={Boolean(selectedEvidence)}
          onClose={() => setSelectedEvidence(null)}
        />
      )}
    </>
  );
}
