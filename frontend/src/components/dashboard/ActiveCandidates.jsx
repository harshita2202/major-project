import { useState } from 'react';
import { Camera, Users, ChevronRight, CheckCircle2, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';
import RiskBadge from '../common/RiskBadge';
import UserAvatar from '../common/UserAvatar';

/**
 * ActiveCandidates.jsx
 * Admin Dashboard Student Directory & Camera Invigilation Roster.
 *
 * Displays student names clearly without loading simultaneous camera feeds for every student.
 * Clicking any student's name, avatar, or "View Camera" button opens the live camera view.
 */
export default function ActiveCandidates({ candidates = [], onMonitorCandidate }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = candidates.filter((c) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (c.candidate && c.candidate.toLowerCase().includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.exam && c.exam.toLowerCase().includes(term))
    );
  });

  return (
    <div className="card">
      <div className="card-header" style={{ flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 className="card-title" style={{ margin: 0 }}>
              <Users size={18} color="var(--pt-blue-800)" />
              Active Monitored Students
            </h3>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: '#e0f2fe',
                color: '#0284c7',
                border: '1px solid #bae6fd',
              }}
            >
              {candidates.length} Students Active
            </span>
          </div>
          <div className="card-subtitle" style={{ marginTop: '4px' }}>
            Click on any student&apos;s name or action button to view their live camera feed. Camera monitoring is displayed on-demand.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Quick Filter */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search
              size={14}
              color="#94a3b8"
              style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by student name..."
              style={{
                padding: '6px 12px 6px 30px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                fontSize: '12px',
                backgroundColor: 'var(--bg-app)',
                color: 'var(--text-primary)',
                outline: 'none',
                minWidth: '180px',
              }}
            />
          </div>

          <Link
            to="/live-monitoring"
            className="btn btn-secondary btn-sm"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
          >
            Live Grid <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Student Name (Click to View Camera)</th>
              <th>Enrolled Assessment</th>
              <th>Risk Level</th>
              <th>Progress</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Camera Inspection</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  {candidates.length === 0
                    ? 'No students are currently attempting exams. Real-time active attempts will appear here automatically.'
                    : `No active students matched "${searchTerm}"`}
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr
                  key={c.id}
                  style={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                  onClick={() => onMonitorCandidate && onMonitorCandidate(c)}
                  title={`Click to inspect camera feed for ${c.candidate}`}
                >
                  {/* Student Name column - Prominently Clickable */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <UserAvatar avatar={c.avatar} name={c.candidate} size={36} />
                      <div>
                        <div
                          style={{
                            fontWeight: 800,
                            color: 'var(--pt-navy-900)',
                            fontSize: '13.5px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span
                            style={{
                              color: 'var(--pt-navy-900)',
                              borderBottom: '1.5px dashed var(--pt-blue-600)',
                              paddingBottom: '1px',
                            }}
                          >
                            {c.candidate}
                          </span>
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 700,
                              color: '#0284c7',
                              backgroundColor: '#e0f2fe',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <Camera size={10} /> Camera View
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            marginTop: '2px',
                          }}
                        >
                          <span>{c.email}</span>
                          <span style={{ color: 'var(--border-strong)' }}>•</span>
                          <span
                            style={{
                              color: '#047857',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                              fontWeight: 600,
                            }}
                          >
                            <CheckCircle2 size={10} /> Biometrics OK
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Exam name */}
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--pt-navy-800)', fontSize: '13px' }}>
                      {c.exam}
                    </span>
                  </td>

                  {/* Risk Level Badge */}
                  <td>
                    <RiskBadge level={c.risk} score={c.riskScore} />
                  </td>

                  {/* Progress bar */}
                  <td style={{ minWidth: '140px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          flex: 1,
                          height: '6px',
                          backgroundColor: 'var(--border-subtle)',
                          borderRadius: '9999px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${c.progress}%`,
                            height: '100%',
                            backgroundColor: c.risk === 'High' ? '#dc2626' : 'var(--pt-blue-600)',
                            borderRadius: '9999px',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {c.progress}%
                      </span>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                      <StatusBadge status={c.status} size="sm" />
                      {c.cheatingFlag && (
                        <span
                          style={{
                            fontSize: '9.5px',
                            fontWeight: 800,
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid #fca5a5',
                            borderRadius: '3px',
                            padding: '1px 5px',
                            letterSpacing: '0.03em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Cheating Flagged
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Action button */}
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{
                        borderColor: 'var(--pt-blue-600)',
                        color: 'var(--pt-navy-800)',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onMonitorCandidate) onMonitorCandidate(c);
                      }}
                    >
                      <Camera size={13} color="var(--pt-blue-800)" />
                      <span>Show Camera</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
