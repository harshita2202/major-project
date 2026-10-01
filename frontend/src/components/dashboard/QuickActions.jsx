import { Video, PlusCircle, Users, FileText, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * QuickActions.jsx
 * Clean, modern quick action navigation cards for university invigilators.
 */
export default function QuickActions() {
  const actions = [
    {
      title: 'Live Invigilation',
      description: 'Monitor active student camera feeds and live telemetry',
      to: '/live-monitoring',
      icon: Video,
      color: '#2563eb',
      bgColor: '#eff6ff',
      badge: 'Real-time',
    },
    {
      title: 'Schedule Exam',
      description: 'Create new assessment schedules and questions',
      to: '/exams',
      icon: PlusCircle,
      color: '#0f2b48',
      bgColor: '#f0f7ff',
      badge: 'Management',
    },
    {
      title: 'Student Roster',
      description: 'Verify candidate enrollments and biometrics',
      to: '/students',
      icon: Users,
      color: '#d97706',
      bgColor: '#fffbeb',
      badge: 'Roster',
    },
    {
      title: 'Integrity Reports',
      description: 'View institutional summaries, scores, and pass rates',
      to: '/reports',
      icon: FileText,
      color: '#059669',
      bgColor: '#ecfdf5',
      badge: 'Analytics',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3
          style={{
            fontSize: '15px',
            fontWeight: 700,
            color: '#0f172a',
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          Quick Actions
        </h3>
        <span style={{ fontSize: '12.5px', color: '#64748b' }}>
          Frequently accessed invigilation tools
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '14px',
        }}
      >
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <Link
              key={act.title}
              to={act.to}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '16px 18px',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.06)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: act.bgColor,
                    color: act.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={18} />
                </div>
                <ArrowUpRight size={15} color="#94a3b8" />
              </div>

              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                  {act.title}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#64748b',
                    marginTop: '3px',
                    lineHeight: 1.4,
                  }}
                >
                  {act.description}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
