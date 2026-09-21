import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Video,
  BookOpen,
  Users,
  AlertTriangle,
  FileBarChart2,
  Settings,
  Shield,
  X,
  Lock,
  Headphones
} from 'lucide-react';

const NAV_GROUPS = [
  {
    label: 'Live Operations',
    items: [
      { name: 'Operations Center', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Live Invigilation', path: '/live-monitoring', icon: Video, badge: 'Live', badgeType: 'live' }
    ]
  },
  {
    label: 'Session Management',
    items: [
      { name: 'Exam Schedules', path: '/exams', icon: BookOpen },
      { name: 'Candidate Roster', path: '/students', icon: Users, badge: 'ProctorID' }
    ]
  },
  {
    label: 'Audit & Compliance',
    items: [
      { name: 'Incident Logs', path: '/violations', icon: AlertTriangle, badge: '17', badgeType: 'alert' },
      { name: 'Integrity Reports', path: '/reports', icon: FileBarChart2 }
    ]
  },
  {
    label: 'Configuration',
    items: [
      { name: 'ProctorTrack Settings', path: '/settings', icon: Settings }
    ]
  }
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(7, 21, 36, 0.75)',
            zIndex: 40,
            backdropFilter: 'blur(3px)'
          }}
          className="lg:hidden"
        />
      )}

      {/* Proctortrack Sidebar Container */}
      <aside
        style={{
          width: 'var(--sidebar-width)',
          backgroundColor: 'var(--sidebar-bg)',
          color: 'var(--sidebar-text)',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--sidebar-border)',
          transform: isOpen ? 'translateX(0)' : undefined,
          transition: 'transform var(--transition-normal)'
        }}
        className={isOpen ? 'sidebar-open' : 'sidebar-responsive'}
      >
        {/* Proctortrack Brand Header */}
        <div
          style={{
            height: 'var(--navbar-height)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            borderBottom: '1px solid var(--sidebar-border)',
            background: 'linear-gradient(180deg, #0d233a 0%, #0a1c30 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Proctortrack Dual Radar Emblem */}
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '9px',
                background: 'linear-gradient(135deg, #0f2b48 0%, #1565c0 100%)',
                border: '1.5px solid #26c6da',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 0 14px rgba(38, 198, 218, 0.35)',
                position: 'relative'
              }}
            >
              <Shield size={20} color="#26c6da" />
              <div
                style={{
                  position: 'absolute',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#f78d2b',
                  top: '5px',
                  right: '5px',
                  boxShadow: '0 0 6px #f78d2b'
                }}
              />
            </div>

            <div>
              <div
                style={{
                  fontSize: '17px',
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px'
                }}
              >
                <span>Proctor</span>
                <span style={{ color: '#26c6da' }}>track</span>
                <span style={{ fontSize: '10px', verticalAlign: 'super', color: '#8eaec9', marginLeft: '1px' }}>™</span>
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color: '#8eaec9',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginTop: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>by</span>
                <span style={{ color: '#ffffff', fontWeight: 700 }}>VERIFICIENT</span>
              </div>
            </div>
          </div>

          {/* Close button for mobile screen */}
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#8eaec9',
              cursor: 'pointer',
              display: 'none',
              padding: '6px'
            }}
            className="sidebar-close-btn"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items with Groups */}
        <nav
          style={{
            flex: 1,
            padding: '16px 14px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {NAV_GROUPS.map((group) => (
            <div key={group.label} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#4d7294',
                  padding: '4px 10px 6px 10px'
                }}
              >
                {group.label}
              </div>

              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#ffffff' : '#94b4cf',
                      backgroundColor: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                      borderLeft: isActive ? '3px solid var(--sidebar-active-border)' : '3px solid transparent',
                      textDecoration: 'none',
                      transition: 'all 0.15s ease'
                    })}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                      <Icon size={17} />
                      <span>{item.name}</span>
                    </div>

                    {item.badge && (
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '9999px',
                          backgroundColor:
                            item.badgeType === 'live'
                              ? '#dc2626'
                              : item.badgeType === 'alert'
                              ? '#f78d2b'
                              : item.badgeType === 'student'
                              ? '#0284c7'
                              : 'rgba(38, 198, 218, 0.2)',
                          color:
                            item.badgeType === 'alert' || item.badgeType === 'live' || item.badgeType === 'student'
                              ? '#ffffff'
                              : '#26c6da',
                          letterSpacing: '0.02em'
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Institutional Compliance & Status Footer */}
        <div
          style={{
            padding: '14px',
            borderTop: '1px solid var(--sidebar-border)',
            background: 'linear-gradient(180deg, #0a1c30 0%, #071524 100%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          {/* Institutional Integration Status */}
          <div
            style={{
              backgroundColor: 'rgba(15, 43, 72, 0.65)',
              borderRadius: '8px',
              padding: '10px 12px',
              border: '1px solid #163b60',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  boxShadow: '0 0 6px #10b981'
                }}
              />
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#ffffff' }}>
                  Canvas LTI 1.3 Active
                </div>
                <div style={{ fontSize: '10px', color: '#8eaec9' }}>
                  SOC 2 Type II • FERPA Compliant
                </div>
              </div>
            </div>
            <Lock size={12} color="#26c6da" />
          </div>

          {/* Invigilator Support Hotline */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 4px',
              fontSize: '11px',
              color: '#8eaec9'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Headphones size={13} color="#f78d2b" />
              <span>Proctor Hotline</span>
            </div>
            <span style={{ color: '#ffffff', fontWeight: 600 }}>24/7 Live</span>
          </div>

          {/* Lead Proctor Profile */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 10px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1565c0 0%, #26c6da 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '12px'
              }}
            >
              PT
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#ffffff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                Lead Invigilator
              </div>
              <div style={{ fontSize: '10.5px', color: '#26c6da' }}>
                Verificient Certified
              </div>
            </div>
          </div>
        </div>
      </aside>

      <style>{`
        @media (max-width: 1024px) {
          .sidebar-responsive {
            transform: translateX(-100%);
          }
          .sidebar-open {
            transform: translateX(0);
          }
          .sidebar-close-btn {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
}
