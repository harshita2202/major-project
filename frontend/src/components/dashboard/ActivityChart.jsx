import { useState } from 'react';
import { BarChart3 } from 'lucide-react';

export default function ActivityChart({ data = [] }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const maxStudents = Math.max(...data.map((d) => d.activeStudents), 350);

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <div>
          <h3 className="card-title">
            <BarChart3 size={18} color="var(--pt-blue-800)" />
            ProctorTrack™ Invigilation Volume
          </h3>
          <div className="card-subtitle">
            Daily monitored sessions vs. automated verifications across university sections
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: 'var(--pt-navy-800)' }} />
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Active Candidates</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: 'var(--pt-cyan-500)' }} />
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Completed Audits</span>
          </div>
        </div>
      </div>

      <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingTop: '28px' }}>
        {/* Bars Container */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '12px',
            height: '210px',
            position: 'relative',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '8px'
          }}
        >
          {/* Horizontal grid lines */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, borderTop: '1px dashed var(--border-subtle)' }} />
          <div style={{ position: 'absolute', top: '33%', left: 0, right: 0, borderTop: '1px dashed var(--border-subtle)' }} />
          <div style={{ position: 'absolute', top: '66%', left: 0, right: 0, borderTop: '1px dashed var(--border-subtle)' }} />

          {data.map((item, idx) => {
            const studentHeightPct = (item.activeStudents / maxStudents) * 100;
            const examHeightPct = (item.completedExams / 20) * 100;
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={item.day}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Tooltip */}
                {isHovered && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '108%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: 'var(--pt-navy-950)',
                      color: '#ffffff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      whiteSpace: 'nowrap',
                      zIndex: 20,
                      boxShadow: 'var(--shadow-lg)',
                      pointerEvents: 'none',
                      border: '1px solid var(--pt-navy-700)'
                    }}
                  >
                    <div style={{ fontWeight: 700, color: 'var(--pt-cyan-400)', marginBottom: '2px' }}>
                      {item.day} Invigilation Summary
                    </div>
                    <div>Monitored Candidates: <strong>{item.activeStudents}</strong></div>
                    <div>Completed Exams: <strong>{item.completedExams}</strong></div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '3px' }}>
                      Integrity Index: 98.7%
                    </div>
                  </div>
                )}

                {/* Paired Bars */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '100%' }}>
                  {/* Students bar */}
                  <div
                    style={{
                      width: '18px',
                      height: `${studentHeightPct}%`,
                      backgroundColor: isHovered ? 'var(--pt-blue-700)' : 'var(--pt-navy-800)',
                      borderRadius: '3px 3px 0 0',
                      transition: 'height 0.4s ease, background-color 0.15s ease'
                    }}
                  />
                  {/* Completed exams bar */}
                  <div
                    style={{
                      width: '14px',
                      height: `${examHeightPct}%`,
                      backgroundColor: isHovered ? 'var(--pt-cyan-400)' : 'var(--pt-cyan-500)',
                      borderRadius: '3px 3px 0 0',
                      transition: 'height 0.4s ease, background-color 0.15s ease'
                    }}
                  />
                </div>

                {/* Day label */}
                <div
                  style={{
                    marginTop: '10px',
                    fontSize: '12px',
                    fontWeight: isHovered ? 700 : 600,
                    color: isHovered ? 'var(--pt-blue-800)' : 'var(--text-secondary)'
                  }}
                >
                  {item.day}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
