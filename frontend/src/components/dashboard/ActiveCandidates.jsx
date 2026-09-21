import { Eye, Users, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';

export default function ActiveCandidates({ candidates = [], onMonitorCandidate }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">
            <Users size={18} color="var(--pt-blue-800)" />
            Active ProctorTrack™ Monitored Candidates
          </h3>
          <div className="card-subtitle">Live candidate biometric telemetry and continuous test validation</div>
        </div>
        <Link
          to="/live-monitoring"
          className="btn btn-secondary btn-sm"
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
        >
          Open ProctorLive™ Grid <ChevronRight size={14} />
        </Link>
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Candidate & ProctorID™</th>
              <th>Assessment</th>
              <th>Biometric Progress</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Live Action</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <tr key={c.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="avatar-circle">
                      {c.avatar || c.candidate.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--pt-navy-900)' }}>{c.candidate}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{c.email}</span>
                        <span style={{ color: 'var(--border-strong)' }}>•</span>
                        <span style={{ color: '#047857', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}>
                          <CheckCircle2 size={10} /> Biometrics OK
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <span style={{ fontWeight: 600, color: 'var(--pt-navy-800)' }}>{c.exam}</span>
                </td>
                <td style={{ minWidth: '170px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        flex: 1,
                        height: '6px',
                        backgroundColor: 'var(--border-subtle)',
                        borderRadius: '9999px',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          width: `${c.progress}%`,
                          height: '100%',
                          backgroundColor: c.risk === 'High' ? '#dc2626' : 'var(--pt-blue-600)',
                          borderRadius: '9999px',
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', minWidth: '32px' }}>
                      {c.progress}%
                    </span>
                  </div>
                </td>
                <td>
                  <StatusBadge status={c.status} size="sm" />
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{
                      borderColor: 'var(--pt-blue-600)',
                      color: 'var(--pt-navy-800)',
                      fontWeight: 600
                    }}
                    onClick={() => onMonitorCandidate && onMonitorCandidate(c)}
                  >
                    <Eye size={13} color="var(--pt-blue-800)" /> Inspect Feed
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
