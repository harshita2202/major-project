import { BookOpen, Clock, ArrowRight, ShieldCheck, PlayCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * ActiveExamsCard.jsx
 * Displays active and scheduled university exams in a clean, compact list.
 * Includes direct links to Live Invigilation and Exam Management.
 */
export default function ActiveExamsCard({ exams = [] }) {
  // Filter active and upcoming exams, prioritizing active ones
  const activeExamsList = exams
    .filter((e) => {
      const status = (e.status || '').toLowerCase();
      return status === 'active' || status === 'in-progress' || status === 'live' || status === 'upcoming';
    })
    .slice(0, 4);

  return (
    <div
      className="card"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '18px 22px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h3
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: '#0f172a',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            Active Examinations
          </h3>
          <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
            Current sessions & upcoming university assessments
          </div>
        </div>
        <span
          style={{
            fontSize: '11.5px',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '6px',
            backgroundColor: '#eff6ff',
            color: '#1d4ed8',
          }}
        >
          {activeExamsList.length} Sessions
        </span>
      </div>

      {/* Body List */}
      <div style={{ padding: '16px 22px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {activeExamsList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748b', fontSize: '13px' }}>
            No exams are currently active. Scheduled exams will appear here.
          </div>
        ) : (
          activeExamsList.map((exam) => {
            const isLive = ['active', 'in-progress', 'live'].includes((exam.status || '').toLowerCase());

            return (
              <div
                key={exam.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #eef2f6',
                  transition: 'background-color 0.15s ease',
                }}
              >
                {/* Left: Code, Name, Details */}
                <div style={{ minWidth: 0, flex: 1, paddingRight: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        backgroundColor: '#e2e8f0',
                        color: '#334155',
                        flexShrink: 0,
                      }}
                    >
                      {exam.code || 'EXAM'}
                    </span>
                    <span
                      style={{
                        fontSize: '13.5px',
                        fontWeight: 700,
                        color: '#0f172a',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {exam.name}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '12px',
                      color: '#64748b',
                      marginTop: '4px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      {exam.duration || '60 mins'}
                    </span>
                    <span>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldCheck size={12} color="#2563eb" />
                      {exam.proctoringMode ? exam.proctoringMode.replace(/ProctorTrack™|Verificient/gi, '').trim() : 'AI Supervised'}
                    </span>
                  </div>
                </div>

                {/* Right: Status & Action */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '4px',
                      backgroundColor: isLive ? '#ecfdf5' : '#f1f5f9',
                      color: isLive ? '#047857' : '#475569',
                      border: `1px solid ${isLive ? '#a7f3d0' : '#e2e8f0'}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {isLive && (
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: '#10b981',
                        }}
                      />
                    )}
                    {isLive ? 'In Progress' : 'Scheduled'}
                  </span>

                  <Link
                    to="/live-monitoring"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 10px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: '#2563eb',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      textDecoration: 'none',
                    }}
                    title="Open Live Invigilation"
                  >
                    <PlayCircle size={12} />
                    <span>Monitor</span>
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Link */}
      <div
        style={{
          padding: '12px 22px',
          borderTop: '1px solid #f1f5f9',
          backgroundColor: '#fafbfc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        <Link
          to="/exams"
          style={{
            fontSize: '12.5px',
            fontWeight: 600,
            color: '#2563eb',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>Manage All Exams</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}
