import { useState, useMemo } from 'react';
import { Camera, FileText, AlertTriangle, AlertOctagon, User, ArrowRight, ShieldAlert } from 'lucide-react';
import EvidenceSnapshotModal from '../monitoring/EvidenceSnapshotModal';
import StudentAuditLogModal from '../monitoring/StudentAuditLogModal';
import RiskBadge from '../common/RiskBadge';

export default function StudentWiseLogsCard({ violations = [], candidates = [] }) {
  const [selectedStudentForLogs, setSelectedStudentForLogs] = useState(null);
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState('ALL');

  // Group violations student-wise
  const studentLogsMap = useMemo(() => {
    const map = new Map();

    // Group by student / candidate
    violations.forEach((v) => {
      const studentId = v.candidateId || v.studentId || 'UNKNOWN';
      const studentName = v.candidateName || v.student || v.candidate || studentId;
      if (!map.has(studentId)) {
        map.set(studentId, {
          id: studentId,
          name: studentName,
          risk: v.severity || 'Medium',
          events: [],
          hasMultiFaceSnapshot: false,
          snapshotCount: 0,
        });
      }
      const item = map.get(studentId);
      item.events.push(v);
      if (v.snapshot || v.type === 'MULTIPLE_FACES' || v.violation === 'MULTIPLE_FACES') {
        item.hasMultiFaceSnapshot = true;
        if (v.snapshot) item.snapshotCount += 1;
      }
    });

    return Array.from(map.values());
  }, [violations]);

  // Flattened view for selected student
  const displayedViolations = useMemo(() => {
    if (selectedStudentId === 'ALL') {
      return violations.slice(0, 8);
    }
    return violations.filter(
      (v) => (v.candidateId || v.studentId) === selectedStudentId
    );
  }, [violations, selectedStudentId]);

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 800,
              color: '#0f172a',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <ShieldAlert size={18} color="#2563eb" />
            <span>Student-Wise Proctoring Logs & Biometric Evidence</span>
          </h3>
          <p style={{ fontSize: '12.5px', color: '#64748b', margin: '3px 0 0 0' }}>
            Individual candidate audit trails, chronological infractions, and instant camera photo snapshots of multiple face detections.
          </p>
        </div>

        {/* Candidate Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Filter Candidate:</span>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              fontWeight: 600,
              color: '#1e293b',
              backgroundColor: '#f8fafc',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Candidates ({violations.length} logs)</option>
            {studentLogsMap.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.id}) - {s.events.length} logs {s.snapshotCount > 0 ? `[📸 ${s.snapshotCount} photos]` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Candidate Badges Row */}
      {studentLogsMap.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '12px',
            marginBottom: '14px',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          {studentLogsMap.map((s) => {
            const isSelected = selectedStudentId === s.id;
            return (
              <div
                key={s.id}
                onClick={() => setSelectedStudentId(isSelected ? 'ALL' : s.id)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: isSelected ? '#eff6ff' : '#f8fafc',
                  cursor: 'pointer',
                  minWidth: '170px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{s.name}</div>
                  <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                    {s.events.length} recorded events
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                  {s.snapshotCount > 0 && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        backgroundColor: '#fee2e2',
                        color: '#b91c1c',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        border: '1px solid #fca5a5',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                      }}
                      title="Multiple faces detected photo evidence"
                    >
                      <Camera size={10} /> {s.snapshotCount}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedStudentForLogs(s);
                    }}
                    style={{
                      border: 'none',
                      background: 'none',
                      fontSize: '10.5px',
                      color: '#2563eb',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    View Log
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Infractions Table */}
      {displayedViolations.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
          No proctoring logs or infractions recorded yet for this selection.
        </div>
      ) : (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '8px 12px' }}>Student</th>
                <th style={{ padding: '8px 12px' }}>Timestamp</th>
                <th style={{ padding: '8px 12px' }}>Infraction Type</th>
                <th style={{ padding: '8px 12px' }}>Details</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>Multiple Faces Evidence</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedViolations.map((v, idx) => {
                const isMulti =
                  v.type === 'MULTIPLE_FACES' ||
                  v.violation === 'MULTIPLE_FACES' ||
                  Boolean(v.snapshot);

                return (
                  <tr
                    key={v.id || idx}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: isMulti ? '#fff7ed' : '#ffffff',
                    }}
                  >
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>
                        {v.candidateName || v.student || v.candidate || 'Candidate'}
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                        {v.candidateId || v.studentId || 'ID'}
                      </div>
                    </td>

                    <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', color: '#64748b' }}>
                      {v.timestamp || v.time || 'Recorded'}
                    </td>

                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700, color: isMulti ? '#c2410c' : '#1e293b' }}>
                        {isMulti ? (
                          <Camera size={13} color="#ea580c" />
                        ) : (
                          <AlertTriangle size={13} color="#d97706" />
                        )}
                        <span>{v.type || v.violation || 'Event'}</span>
                      </div>
                    </td>

                    <td style={{ padding: '8px 12px', color: '#334155', maxWidth: '300px' }}>
                      {v.details || 'Infraction registered by proctoring engine'}
                    </td>

                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      {v.snapshot ? (
                        <button
                          type="button"
                          onClick={() => setSelectedEvidence(v)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '5px',
                            border: '1px solid #f87171',
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                          title="Click to view webcam snapshot at the time multiple faces were detected"
                        >
                          <Camera size={12} color="#dc2626" />
                          <span>📸 View Snapshot</span>
                        </button>
                      ) : isMulti ? (
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                          Multiple faces flag
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#cbd5e1' }}>—</span>
                      )}
                    </td>

                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedStudentForLogs({
                            id: v.candidateId || v.studentId,
                            name: v.candidateName || v.student || v.candidate,
                          })
                        }
                        style={{
                          border: 'none',
                          background: 'none',
                          color: '#2563eb',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <span>Student Logs</span>
                        <ArrowRight size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Snapshot Preview Modal */}
      {selectedEvidence && (
        <EvidenceSnapshotModal
          evidence={selectedEvidence}
          isOpen={Boolean(selectedEvidence)}
          onClose={() => setSelectedEvidence(null)}
        />
      )}

      {/* Student Audit Log Modal */}
      {selectedStudentForLogs && (
        <StudentAuditLogModal
          student={selectedStudentForLogs}
          isOpen={Boolean(selectedStudentForLogs)}
          onClose={() => setSelectedStudentForLogs(null)}
        />
      )}
    </div>
  );
}
