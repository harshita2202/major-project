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
  Award,
  AlertTriangle,
} from 'lucide-react';
import { getCurrentUser, logout } from '../../services/auth';
import { fetchCategorizedStudentExams } from '../../services/studentExams';

export default function AttemptedExams() {
  const navigate = useNavigate();
  const user = getCurrentUser() || { name: 'Student', userId: 'STU001' };

  const [attemptedExams, setAttemptedExams] = useState([]);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadExams() {
      try {
        const { upcomingExams, attemptedExams: attempts } = await fetchCategorizedStudentExams(user.userId);
        if (isMounted) {
          setAttemptedExams(attempts);
          setUpcomingCount(upcomingExams.length);
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

  const formatAttemptDate = (rawDate) => {
    if (!rawDate) return 'Completed';
    try {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    } catch (e) {
      void e;
    }
    return rawDate;
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

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          maxWidth: '1200px',
          width: '100%',
          margin: '0 auto',
          padding: '32px 24px 60px',
        }}
      >
        {/* Welcome / Header Banner */}
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
              Academic Year 2026 · Submission History
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              My Attempted Examinations
            </h1>
            <p style={{ fontSize: '13.5px', color: '#94b4cf', margin: 0, maxWidth: '640px', lineHeight: 1.5 }}>
              Review your completed assessment records, evaluation scores, and proctored examination details.
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
              {attemptedExams.length}
            </div>
            <div style={{ fontSize: '11px', color: '#8eaec9', fontWeight: 600, textTransform: 'uppercase' }}>
              Attempted Exams
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
            onClick={() => navigate('/student')}
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
            <Calendar size={15} color="var(--text-secondary)" />
            Upcoming Exams
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
              {upcomingCount}
            </span>
          </button>

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
            <CheckCircle size={15} color="#26c6da" />
            My Attempts
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
              {attemptedExams.length}
            </span>
          </button>
        </div>

        {/* Section Heading */}
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--pt-navy-900)', margin: '0 0 2px' }}>
              Attempted Examinations
            </h2>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0 }}>
              Completed and evaluated assessments for candidate ID {user.userId}
            </p>
          </div>
        </div>

        {/* Loading State */}
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
            <p style={{ fontSize: '13px' }}>Loading attempted assessments...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : attemptedExams.length === 0 ? (
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
              No Attempted Examinations
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
              You have not attempted or completed any examinations yet.
            </p>
            <button
              type="button"
              onClick={() => navigate('/student')}
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
              View Upcoming Exams <ArrowRight size={14} />
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
            {attemptedExams.map((exam) => {
              const isTerminated = exam.autoTerminated || exam.attemptStatus?.toLowerCase() === 'disqualified';
              const isInProgress = exam.isInProgress;

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

                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        backgroundColor: isTerminated
                          ? '#fee2e2'
                          : isInProgress
                          ? '#fef3c7'
                          : '#ecfdf5',
                        color: isTerminated
                          ? '#b91c1c'
                          : isInProgress
                          ? '#b45309'
                          : '#047857',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      {isTerminated ? (
                        <>
                          <AlertTriangle size={12} /> Disqualified
                        </>
                      ) : isInProgress ? (
                        'In Progress'
                      ) : (
                        <>
                          <CheckCircle size={12} /> Completed
                        </>
                      )}
                    </span>
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

                    {/* Metadata & Scorecard Grid */}
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
                      {/* Score Result */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: isTerminated ? '#b91c1c' : 'var(--text-primary)',
                        }}
                      >
                        <Award size={14} color={isTerminated ? '#b91c1c' : '#047857'} />
                        <span>
                          Score: <strong>{exam.percentage !== null ? `${exam.percentage}%` : 'Recorded'}</strong>
                        </span>
                      </div>

                      {/* Total Questions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                        <FileQuestion size={13} color="var(--pt-navy-800)" />
                        <span>
                          <strong>{exam.totalQuestions} Questions</strong>
                        </span>
                      </div>

                      {/* Attempt Date */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <Calendar size={13} color="#64748b" />
                        <span>{formatAttemptDate(exam.submittedAt)}</span>
                      </div>

                      {/* Duration */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <Clock size={13} color="#64748b" />
                        <span>{exam.duration || '60 mins'}</span>
                      </div>
                    </div>

                    {/* Card Action */}
                    {isInProgress ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/student/exam/${exam.id}`)}
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
                        Resume Exam <ArrowRight size={15} />
                      </button>
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          backgroundColor: isTerminated ? '#fef2f2' : 'var(--bg-surface-subtle)',
                          border: `1px solid ${isTerminated ? '#fecaca' : 'var(--border-subtle)'}`,
                          color: isTerminated ? '#991b1b' : 'var(--text-secondary)',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <CheckCircle size={14} color={isTerminated ? '#dc2626' : '#059669'} />
                        {isTerminated ? 'Session Terminated' : 'Attempt Recorded & Evaluated'}
                      </div>
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
