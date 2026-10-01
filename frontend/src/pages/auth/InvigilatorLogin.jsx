import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, UserCheck, ArrowLeft, AlertCircle, Lock, User, LogIn } from 'lucide-react';
import { login, ROLES, DEMO_CREDENTIALS } from '../../services/auth';

export default function InvigilatorLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState(DEMO_CREDENTIALS.invigilator.username);
  const [password, setPassword] = useState(DEMO_CREDENTIALS.invigilator.password);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    setTimeout(() => {
      const result = login(ROLES.INVIGILATOR, username, password);
      setIsSubmitting(false);

      if (result.success) {
        navigate('/dashboard', { replace: true });
      } else {
        setError(result.error || 'Authentication failed');
      }
    }, 250);
  };

  const handleFillDemo = () => {
    setUsername(DEMO_CREDENTIALS.invigilator.username);
    setPassword(DEMO_CREDENTIALS.invigilator.password);
    setError('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#071524',
        backgroundImage:
          'radial-gradient(circle at 50% 20%, rgba(37, 99, 235, 0.15) 0%, transparent 60%)',
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
          <Shield size={20} color="#2563eb" />
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
            Proctor<span style={{ color: '#60a5fa' }}>track</span>™ Admin
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
            border: '1.5px solid rgba(59, 130, 246, 0.35)',
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
                backgroundColor: 'rgba(37, 99, 235, 0.2)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <UserCheck size={28} color="#60a5fa" />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', margin: '0 0 6px' }}>
              Invigilator &amp; Admin Portal
            </h1>
            <p style={{ fontSize: '13px', color: '#94b4cf', margin: 0 }}>
              Authorized invigilators and academic controllers only
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

            {/* Username */}
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="invigilator-username-input"
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
                Administrator Username
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={16}
                  color="#64748b"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id="invigilator-username-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin"
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
                htmlFor="invigilator-password-input"
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
                Security Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  color="#64748b"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id="invigilator-password-input"
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
                backgroundColor: 'rgba(37, 99, 235, 0.12)',
                border: '1px dashed rgba(59, 130, 246, 0.4)',
                borderRadius: '8px',
                padding: '10px 12px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: '11.5px', color: '#93c5fd' }}>
                Demo: <strong style={{ color: '#ffffff' }}>admin</strong> / <strong style={{ color: '#ffffff' }}>admin123</strong>
              </div>
              <button
                type="button"
                onClick={handleFillDemo}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#60a5fa',
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
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: isSubmitting ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                transition: 'all 0.15s ease',
              }}
            >
              <LogIn size={16} />
              {isSubmitting ? 'Authorizing Invigilator...' : 'Access Dashboard'}
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
            Looking for candidate exam?{' '}
            <Link to="/student-login" style={{ color: '#26c6da', textDecoration: 'none', fontWeight: 600 }}>
              Student Login
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
