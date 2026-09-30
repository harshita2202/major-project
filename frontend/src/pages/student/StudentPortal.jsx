import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Clock,
  Calendar,
  FileQuestion,
  Eye,
  LogOut,
  ArrowRight,
  BookOpen,
  CheckCircle,
  Lock,
} from 'lucide-react';
import { getCurrentUser, logout } from '../../services/auth';
import { fetchCategorizedStudentExams } from '../../services/studentExams';

export default function StudentPortal() {
  const navigate = useNavigate();
  const user = getCurrentUser() || { name: 'Student', userId: 'STU001' };

  const [upcomingExams, setUpcomingExams] = useState([]);
  const [attemptedCount, setAttemptedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadExams() {
      try {
        const { upcomingExams: upcoming, attemptedExams: attempts } = await fetchCategorizedStudentExams(user.userId);
        if (isMounted) {
          setUpcomingExams(upcoming);
          setAttemptedCount(attempts.length);
        }
      } catch (err) {
        void err;
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadExams();
    return () => {
      isMounted = false;
    };
  }, [user.userId]);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const handleStartExam = (examId) => {
    navigate(`/student/exam/${examId}`);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-app)',
        fontFamily: 'var(--font-family)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Student Header */}
      <header
        style={{
          backgroundColor: 'var(--pt-navy-900)',
          borderBottom: '1px solid var(--sidebar-border)',
          padding: '0 32px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Shield size={22} color="#26c6da" />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
            <span style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
              Proctor<span style={{ color: '#26c6da' }}>track</span>™
            </span>
            <span
              style={{
                fontSize: '11px',
                color: '#8eaec9',
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginLeft: '8px',
              }}
            >
              Candidate Portal
            </span>
          </div>
        </div>

        {/* Student Profile & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
              {user.name}
            </div>
            <div style={{ fontSize: '11px', color: '#8eaec9', fontFamily: 'var(--font-mono)' }}>
              ID: {user.userId}
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      {/* Main Student Portal Content */}
      <main
        style={{
          flex: 1,
          maxWidth: '1200px',
          width: '100%',
          margin: '0 auto',
          padding: '32px 24px 60px',
        }}
      >
        {/* Welcome Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0a1c30 0%, #0f2b48 100%)',
            borderRadius: '16px',
            padding: '28px 32px',
            color: '#ffffff',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#26c6da',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              Academic Year 2026 · Remote Proctored Sessions
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              Welcome, {user.name}
            </h1>
            <p style={{ fontSize: '13.5px', color: '#94b4cf', margin: 0, maxWidth: '640px', lineHeight: 1.5 }}>
              Select an upcoming examination below to review candidate regulations and start your proctored session.
            </p>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(38, 198, 218, 0.12)',
              border: '1px solid rgba(38, 198, 218, 0.3)',
              borderRadius: '10px',
              padding: '12px 18px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#26c6da' }}>
              {upcomingExams.length}
            </div>
            <div style={{ fontSize: '11px', color: '#8eaec9', fontWeight: 600, textTransform: 'uppercase' }}>
              Upcoming Exams
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '12px',
          }}
        >
          <button
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'var(--pt-navy-800)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'default',
            }}
          >
            <Calendar size={15} color="#26c6da" />
            Upcoming Exams
            <span
              style={{
                fontSize: '11px',
                padding: '2px 7px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                fontWeight: 700,
              }}
            >
              {upcomingExams.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/student/attempts')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: '#ffffff',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <CheckCircle size={15} color="var(--text-secondary)" />
            My Attempts
            <span
              style={{
                fontSize: '11px',
                padding: '2px 7px',
                borderRadius: '9999px',
                backgroundColor: 'var(--bg-app)',
                color: 'var(--text-secondary)',
                fontWeight: 700,
              }}
            >
              {attemptedCount}
            </span>
          </button>
        </div>

        {/* Section Heading */}
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--pt-navy-900)', margin: '0 0 2px' }}>
              Upcoming Examinations
            </h2>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0 }}>
              Scheduled assessments ready for candidate ID {user.userId}
            </p>
          </div>
        </div>

        {/* Exam Cards Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                border: '3px solid var(--border-subtle)',
                borderTopColor: 'var(--pt-navy-800)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 12px',
              }}
            />
            <p style={{ fontSize: '13px' }}>Loading examination schedule...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : upcomingExams.length === 0 ? (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              padding: '48px 24px',
              textAlign: 'center',
            }}
          >
            <BookOpen size={40} color="var(--border-strong)" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--pt-navy-900)', margin: '0 0 4px' }}>
              No Upcoming Examinations Scheduled
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
              There are currently no upcoming exams scheduled. You can review your previous assessment attempts below.
            </p>
            <button
              type="button"
              onClick={() => navigate('/student/attempts')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--pt-navy-800)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              View My Attempts <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '20px',
            }}
          >
            {upcomingExams.map((exam) => {
              return (
                <div
                  key={exam.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '14px',
                    border: '1px solid var(--border-subtle)',
                    boxShadow: 'var(--shadow-sm)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Top Bar of Card */}
                  <div
                    style={{
                      padding: '16px 20px',
                      borderBottom: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#e0f2fe',
                        color: '#0369a1',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {exam.code}
                    </span>

                    {exam.windowStatus === 'UPCOMING' ? (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          backgroundColor: '#fef3c7',
                          color: '#b45309',
                        }}
                      >
                        Starts at {exam.startTime || exam.time || 'Scheduled Time'}
                      </span>
                    ) : exam.windowStatus === 'CLOSED' ? (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          backgroundColor: '#fee2e2',
                          color: '#b91c1c',
                        }}
                      >
                        Window Closed
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          backgroundColor: '#dcfce7',
                          color: '#15803d',
                        }}
                      >
                        Available Now
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h3
                      style={{
                        fontSize: '17px',
                        fontWeight: 800,
                        color: 'var(--pt-navy-900)',
                        margin: '0 0 6px',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {exam.name}
                    </h3>
                    <p
                      style={{
                        fontSize: '12.5px',
                        color: 'var(--text-secondary)',
                        margin: '0 0 18px',
                        lineHeight: 1.5,
                        flex: 1,
                      }}
                    >
                      {exam.description}
                    </p>

                    {/* Metadata specs */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '10px',
                        padding: '12px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-app)',
                        marginBottom: '18px',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                        <Clock size={13} color="var(--pt-navy-800)" />
                        <span><strong>{exam.duration}</strong></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                        <FileQuestion size={13} color="var(--pt-navy-800)" />
                        <span><strong>{exam.totalQuestions || 20} Questions</strong></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <Calendar size={13} color="#64748b" />
                        <span>{exam.date}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <Eye size={13} color="#64748b" />
                        <span style={{ fontSize: '11px' }}>{exam.proctoringMode || 'Strict AI'}</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    {exam.windowStatus === 'UPCOMING' ? (
                      <button
                        type="button"
                        disabled
                        style={{
                          width: '100%',
                          padding: '11px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-subtle)',
                          backgroundColor: '#f1f5f9',
                          color: '#64748b',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                        }}
                      >
                        <Lock size={14} /> Starts at {exam.startTime || exam.time}
                      </button>
                    ) : exam.windowStatus === 'CLOSED' ? (
                      <button
                        type="button"
                        disabled
                        style={{
                          width: '100%',
                          padding: '11px',
                          borderRadius: '8px',
                          border: '1px solid #fecaca',
                          backgroundColor: '#fef2f2',
                          color: '#b91c1c',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                        }}
                      >
                        <Lock size={14} /> Exam Window Closed
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartExam(exam.id)}
                        style={{
                          width: '100%',
                          padding: '11px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: 'var(--pt-navy-800)',
                          color: '#ffffff',
                          fontSize: '13.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        Start Exam <ArrowRight size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
