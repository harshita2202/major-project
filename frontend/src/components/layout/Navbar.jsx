import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  Menu,
  Shield,
  User,
  LogOut,
  CheckCircle,
  Building2,
  Clock,
} from 'lucide-react';
import SearchBar from '../common/SearchBar';
import { logout } from '../../services/auth';

const ROUTE_META = {
  '/dashboard': {
    title: 'Operations Center',
    description: 'ProctorTrack™ Real-Time Telemetry & Session Integrity Index'
  },
  '/live-monitoring': {
    title: 'Live Invigilation (ProctorLive™)',
    description: 'Multi-stream biometric webcam & screen anomaly supervision'
  },
  '/exams': {
    title: 'Exam Management',
    description: 'Active & scheduled examination sessions across LMS integrations'
  },
  '/students': {
    title: 'Candidate Directory (ProctorID™)',
    description: 'Biometric enrollment, government ID scans, and device pre-checks'
  },
  '/violations': {
    title: 'Incident Audit Registry (PEEP)',
    description: 'ProctorTrack Exam Electronic Protocol infraction logs and adjudications'
  },
  '/reports': {
    title: 'Integrity Analytics & Reports',
    description: 'Executive compliance indices, trust metrics, and accredited audit files'
  },
  '/settings': {
    title: 'ProctorTrack Configuration',
    description: 'Automated AI threshold parameters, browser lock, and LMS gradebook sync'
  }
};

export default function Navbar({ onOpenMobileSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentMeta = ROUTE_META[location.pathname] || {
    title: 'Proctortrack™ Platform',
    description: 'Trusted Remote Exam Integrity & Biometric Invigilation'
  };

  const [searchVal, setSearchVal] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  // Synchronized Exam Clock for High-Stakes Invigilation
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      setCurrentTime(timeStr);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const notifications = [
    {
      id: 1,
      title: 'Secondary face anomaly in viewport',
      time: '2 min ago',
      student: 'Rahul Sharma',
      severity: 'high',
      exam: 'CS-401 Data Structures',
      unread: true
    },
    {
      id: 2,
      title: 'Browser unfocused / external monitor',
      time: '8 min ago',
      student: 'Priya Singh',
      severity: 'medium',
      exam: 'CS-302 Operating Systems',
      unread: true
    },
    {
      id: 3,
      title: 'ProctorID™ Identity Verification Approved',
      time: '25 min ago',
      student: 'Sneha Patel',
      severity: 'low',
      exam: 'CS-204 Database Systems',
      unread: false
    }
  ];

  return (
    <header
      style={{
        height: 'var(--navbar-height)',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        boxShadow: 'var(--shadow-xs)'
      }}
    >
      {/* Left Title & Mobile Menu Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--pt-navy-800)',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            display: 'none'
          }}
          className="navbar-mobile-toggle"
          aria-label="Open navigation menu"
        >
          <Menu size={22} />
        </button>

        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1
              style={{
                fontSize: '17px',
                fontWeight: 700,
                color: 'var(--pt-navy-800)',
                letterSpacing: '-0.02em',
                margin: 0,
                lineHeight: 1.2
              }}
            >
              {currentMeta.title}
            </h1>
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: 'var(--pt-blue-50)',
                color: 'var(--pt-blue-800)',
                border: '1px solid var(--primary-100)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}
              className="navbar-product-tag"
            >
              Proctortrack Enterprise
            </span>
          </div>

          <p
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              margin: '2px 0 0 0',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
            className="navbar-description"
          >
            {currentMeta.description}
          </p>
        </div>
      </div>

      {/* Right Controls: Institution, Exam Clock, Search, Notifications, Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Institution Badge & Term */}
        <div
          className="navbar-institution-badge"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            backgroundColor: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            fontSize: '12px',
            color: 'var(--pt-navy-800)',
            fontWeight: 600
          }}
        >
          <Building2 size={14} color="var(--pt-blue-800)" />
          <span>Rutgers University</span>
          <span style={{ color: 'var(--border-strong)' }}>|</span>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Spring 2026</span>
        </div>

        {/* Synchronized Exam Clock */}
        <div
          className="navbar-clock-badge"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            color: 'var(--pt-navy-900)'
          }}
        >
          <Clock size={13} color="#f78d2b" />
          <span>{currentTime || '12:00:00 PM'}</span>
        </div>

        {/* Global Candidate / Exam Search */}
        <div className="navbar-search-wrapper">
          <SearchBar
            value={searchVal}
            onChange={setSearchVal}
            placeholder="Search candidates, exams, incidents..."
            maxWidth="260px"
          />
        </div>

        {/* Notifications Popover */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="btn-icon"
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              position: 'relative',
              borderRadius: '8px',
              width: '38px',
              height: '38px',
              borderColor: 'var(--border-subtle)'
            }}
            aria-label="Notifications"
          >
            <Bell size={17} color="var(--pt-navy-800)" />
            <span
              style={{
                position: 'absolute',
                top: '7px',
                right: '7px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#f78d2b',
                boxShadow: '0 0 6px #f78d2b',
                border: '2px solid #ffffff'
              }}
            />
          </button>

          {showNotifications && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '340px',
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 60,
                overflow: 'hidden',
                animation: 'fadeIn 0.15s ease'
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--bg-surface-subtle)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--pt-navy-800)' }}>
                    ProctorTrack Incidents
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      backgroundColor: '#f78d2b',
                      color: '#ffffff',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontWeight: 700
                    }}
                  >
                    2 New
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--pt-blue-800)', fontWeight: 600, cursor: 'pointer' }}>
                  Mark all read
                </span>
              </div>

              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: item.unread ? '#fbfcfe' : '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: item.unread ? 700 : 500, color: 'var(--pt-navy-900)' }}>
                        {item.title}
                      </span>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{item.time}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      <span>Candidate: <strong>{item.student}</strong></span>
                      <span style={{ color: 'var(--pt-blue-800)', fontSize: '10.5px' }}>{item.exam}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lead Invigilator Profile */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '5px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #0f2b48 0%, #1565c0 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(15, 43, 72, 0.2)'
              }}
            >
              LI
            </div>
            <div style={{ textAlign: 'left' }} className="navbar-admin-label">
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--pt-navy-800)', lineHeight: 1.2 }}>
                Lead Invigilator
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                Verificient Staff
              </div>
            </div>
            <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
          </button>

          {showProfileMenu && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '220px',
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 60,
                padding: '6px',
                animation: 'fadeIn 0.15s ease'
              }}
            >
              <div
                style={{
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12.5px',
                  color: 'var(--pt-navy-800)',
                  cursor: 'pointer',
                  borderRadius: '6px'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <User size={15} color="var(--pt-navy-800)" /> Invigilator Profile
              </div>
              <div
                style={{
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12.5px',
                  color: 'var(--pt-navy-800)',
                  cursor: 'pointer',
                  borderRadius: '6px'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Shield size={15} color="var(--pt-blue-800)" /> Verificient Credentials
              </div>
              <div
                style={{
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12.5px',
                  color: 'var(--pt-navy-800)',
                  cursor: 'pointer',
                  borderRadius: '6px'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <CheckCircle size={15} color="#059669" /> System Health Diagnostics
              </div>
              <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 0' }} />
              <div
                style={{
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12.5px',
                  color: '#dc2626',
                  cursor: 'pointer',
                  borderRadius: '6px'
                }}
                onClick={() => {
                  logout();
                  navigate('/', { replace: true });
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fee2e2')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <LogOut size={15} /> Sign Out Session
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .navbar-mobile-toggle {
            display: inline-flex !important;
          }
        }
        @media (max-width: 1200px) {
          .navbar-institution-badge {
            display: none !important;
          }
        }
        @media (max-width: 768px) {
          .navbar-description, .navbar-search-wrapper, .navbar-admin-label, .navbar-clock-badge, .navbar-product-tag {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
