import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock, ShieldAlert } from 'lucide-react';
import RiskBadge from '../common/RiskBadge';
import UserAvatar from '../common/UserAvatar';

export default function RecentViolations({ violations = [], onSelectViolation }) {
  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <div>
          <h3 className="card-title">
            <ShieldAlert size={18} color="#f78d2b" />
            Recent Malpractice Incidents (PEEP)
          </h3>
          <div className="card-subtitle">
            Automated sensor anomalies flagged during live proctoring sessions
          </div>
        </div>
        <Link
          to="/violations"
          className="btn btn-secondary btn-sm"
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
        >
          View Full Registry <ArrowUpRight size={13} />
        </Link>
      </div>

      <div className="card-body" style={{ padding: '0', flex: 1, overflowY: 'auto' }}>
        {violations.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No recent infractions detected. All sessions compliant.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {violations.map((v, index) => (
              <div
                key={v.id || index}
                onClick={() => onSelectViolation && onSelectViolation(v)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '13px 20px',
                  borderBottom: index < violations.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  cursor: onSelectViolation ? 'pointer' : 'default',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (onSelectViolation) e.currentTarget.style.backgroundColor = 'var(--bg-surface-subtle)';
                }}
                onMouseLeave={(e) => {
                  if (onSelectViolation) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {/* Student & Violation Detail */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <UserAvatar avatar={v.avatar} name={v.student} size={36} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--pt-navy-900)' }}>
                        {v.student}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--border-strong)' }}>•</span>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                        {v.exam}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#b91c1c', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{v.violation}</span>
                      {v.confidence && (
                        <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 500, backgroundColor: 'var(--bg-app)', padding: '0 5px', borderRadius: '3px' }}>
                          Confidence: {v.confidence}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Metadata */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    <Clock size={12} />
                    {v.time}
                  </div>
                  <RiskBadge level={v.severity} showIcon={false} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
