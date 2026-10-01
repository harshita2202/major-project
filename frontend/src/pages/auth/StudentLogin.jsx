import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, GraduationCap, ArrowLeft, AlertCircle, Lock, User, LogIn } from 'lucide-react';
import { login, ROLES, DEMO_CREDENTIALS } from '../../services/auth';

export default function StudentLogin() {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState(DEMO_CREDENTIALS.student.id);
  const [password, setPassword] = useState(DEMO_CREDENTIALS.student.password);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    setTimeout(() => {
      const result = login(ROLES.STUDENT, studentId, password);
      setIsSubmitting(false);

      if (result.success) {
        navigate('/student', { replace: true });
      } else {
        setError(result.error || 'Authentication failed');
      }
    }, 250);
  };

  const handleFillDemo = () => {
    setStudentId(DEMO_CREDENTIALS.student.id);
    setPassword(DEMO_CREDENTIALS.student.password);
    setError('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#071524',
        backgroundImage:
          'radial-gradient(circle at 50% 20%, rgba(38, 198, 218, 0.15) 0%, transparent 60%)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-family)',
      }}
    >
      {/* Top bar */}
      <header
        style={{
          padding: '16px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#8eaec9',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={16} /> Back to Portal Selection
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={20} color="#26c6da" />
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
            Proctor<span style={{ color: '#26c6da' }}>track</span>™
          </span>
        </div>
      </header>

      {/* Login Card */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '440px',
            backgroundColor: 'rgba(15, 43, 72, 0.85)',
            border: '1.5px solid rgba(38, 198, 218, 0.3)',
            borderRadius: '16px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
            overflow: 'hidden',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '28px 28px 20px',
              textAlign: 'center',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                backgroundColor: 'rgba(38, 198, 218, 0.15)',
                border: '1px solid rgba(38, 198, 218, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <GraduationCap size={28} color="#26c6da" />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', margin: '0 0 6px' }}>
              Student Examination Login
            </h1>
            <p style={{ fontSize: '13px', color: '#94b4cf', margin: 0 }}>
              Enter your student identifier to access scheduled exams
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ padding: '24px 28px 28px' }}>
            {error && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#fca5a5',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '18px',
                }}
              >
                <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Student ID */}
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="student-id-input"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#cbd5e1',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Student ID
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={16}
                  color="#64748b"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id="student-id-input"
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. STU001"
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 38px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    backgroundColor: 'rgba(7, 21, 36, 0.6)',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '20px' }}>
              <label
                htmlFor="student-password-input"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#cbd5e1',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  color="#64748b"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id="student-password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 38px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    backgroundColor: 'rgba(7, 21, 36, 0.6)',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Demo fill helper banner */}
            <div
              style={{
                backgroundColor: 'rgba(38, 198, 218, 0.08)',
                border: '1px dashed rgba(38, 198, 218, 0.35)',
                borderRadius: '8px',
                padding: '10px 12px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: '11.5px', color: '#8eaec9' }}>
                Demo: <strong style={{ color: '#26c6da' }}>STU001</strong> / <strong style={{ color: '#26c6da' }}>student123</strong>
              </div>
              <button
                type="button"
                onClick={handleFillDemo}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#26c6da',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                Auto-fill
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#26c6da',
                color: '#071524',
                fontSize: '14px',
                fontWeight: 700,
                cursor: isSubmitting ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(38, 198, 218, 0.3)',
                transition: 'all 0.15s ease',
              }}
            >
              <LogIn size={16} />
              {isSubmitting ? 'Verifying Identity...' : 'Login as Student'}
            </button>
          </form>

          {/* Footer note */}
          <div
            style={{
              padding: '14px 28px',
              backgroundColor: 'rgba(7, 21, 36, 0.4)',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              textAlign: 'center',
              fontSize: '11.5px',
              color: '#64748b',
            }}
          >
            Are you an administrator?{' '}
            <Link to="/invigilator-login" style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>
              Invigilator Login
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
