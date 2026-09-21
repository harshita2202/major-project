import { Link } from 'react-router-dom';
import {
  Shield,
  GraduationCap,
  UserCheck,
  Lock,
  Eye,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

export default function Home() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#071524',
        backgroundImage:
          'radial-gradient(circle at 50% 0%, rgba(38, 198, 218, 0.12) 0%, transparent 60%), radial-gradient(circle at 85% 30%, rgba(15, 43, 72, 0.6) 0%, transparent 50%)',
        color: '#ffffff',
        fontFamily: 'var(--font-family)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top institutional header */}
      <header
        style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '16px 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(7, 21, 36, 0.85)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Shield size={26} color="#26c6da" />
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Proctor
              </span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#26c6da' }}>
                track
              </span>
              <span style={{ fontSize: '10px', verticalAlign: 'super', color: '#8eaec9', marginLeft: '2px' }}>
                ™
              </span>
            </div>
            <div
              style={{
                fontSize: '9.5px',
                color: '#8eaec9',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              by <span style={{ color: '#ffffff', fontWeight: 700 }}>VERIFICIENT</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span
            style={{
              fontSize: '11px',
              padding: '4px 10px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(38, 198, 218, 0.12)',
              border: '1px solid rgba(38, 198, 218, 0.3)',
              color: '#26c6da',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                display: 'inline-block',
              }}
            />
            System Secure & Active
          </span>
        </div>
      </header>

      {/* Main hero section */}
      <main
        style={{
          flex: 1,
          maxWidth: '1100px',
          width: '100%',
          margin: '0 auto',
          padding: '48px 24px 60px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(38, 198, 218, 0.08)',
            border: '1px solid rgba(38, 198, 218, 0.25)',
            marginBottom: '20px',
          }}
        >
          <Lock size={13} color="#26c6da" />
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#26c6da',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Enterprise Remote Invigilation Platform
          </span>
        </div>

        <h1
          style={{
            fontSize: ' clamp(28px, 4vw, 44px)',
            fontWeight: 800,
            color: '#ffffff',
            margin: '0 0 16px',
            letterSpacing: '-0.03em',
            lineHeight: 1.2,
          }}
        >
          Online Examination &amp; Proctoring System
        </h1>

        <p
          style={{
            fontSize: '16px',
            color: '#94b4cf',
            maxWidth: '680px',
            margin: '0 0 44px',
            lineHeight: 1.6,
          }}
        >
          Automated AI &amp; human-assisted academic integrity verification.
          Select your portal below to proceed with authorized credentials.
        </p>

        {/* Two prominent role portals */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            width: '100%',
            maxWidth: '820px',
            marginBottom: '48px',
          }}
        >
          {/* Student Login Card */}
          <div
            style={{
              backgroundColor: 'rgba(15, 43, 72, 0.55)',
              borderRadius: '16px',
              border: '1.5px solid rgba(38, 198, 218, 0.3)',
              padding: '36px 28px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.25s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(38, 198, 218, 0.25) 0%, rgba(13, 148, 136, 0.25) 100%)',
                border: '1px solid rgba(38, 198, 218, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <GraduationCap size={32} color="#26c6da" />
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', margin: '0 0 10px' }}>
              Student Portal
            </h2>

            <p style={{ fontSize: '13.5px', color: '#94b4cf', margin: '0 0 24px', lineHeight: 1.5 }}>
              Access scheduled assessments, review proctoring rules, and start secure examinations with automated biometric supervision.
            </p>

            <div
              style={{
                fontSize: '11px',
                color: '#64748b',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                padding: '6px 12px',
                borderRadius: '6px',
                marginBottom: '24px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Demo: ID <strong>STU001</strong> · Pass <strong>student123</strong>
            </div>

            <Link
              to="/student-login"
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: '10px',
                backgroundColor: '#26c6da',
                color: '#071524',
                fontSize: '14.5px',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
                boxShadow: '0 4px 14px rgba(38, 198, 218, 0.35)',
              }}
            >
              Student Login <ArrowRight size={17} />
            </Link>
          </div>

          {/* Invigilator Login Card */}
          <div
            style={{
              backgroundColor: 'rgba(15, 43, 72, 0.55)',
              borderRadius: '16px',
              border: '1.5px solid rgba(255, 255, 255, 0.12)',
              padding: '36px 28px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.25s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.25) 0%, rgba(30, 64, 175, 0.25) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <UserCheck size={32} color="#60a5fa" />
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', margin: '0 0 10px' }}>
              Invigilator Portal
            </h2>

            <p style={{ fontSize: '13.5px', color: '#94b4cf', margin: '0 0 24px', lineHeight: 1.5 }}>
              Manage exam sessions, monitor live video &amp; telemetry streams, investigate security breaches, and export compliance audit reports.
            </p>

            <div
              style={{
                fontSize: '11px',
                color: '#64748b',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                padding: '6px 12px',
                borderRadius: '6px',
                marginBottom: '24px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Demo: User <strong>admin</strong> · Pass <strong>admin123</strong>
            </div>

            <Link
              to="/invigilator-login"
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: '10px',
                backgroundColor: '#1d4ed8',
                color: '#ffffff',
                fontSize: '14.5px',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
                boxShadow: '0 4px 14px rgba(29, 78, 216, 0.35)',
              }}
            >
              Invigilator Login <ArrowRight size={17} />
            </Link>
          </div>
        </div>

        {/* Feature pillars */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            width: '100%',
            maxWidth: '820px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '32px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
            <Eye size={18} color="#26c6da" />
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#ffffff' }}>Live Biometrics</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Webcam &amp; face tracking</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
            <Lock size={18} color="#26c6da" />
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#ffffff' }}>Deterrence Engine</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Fullscreen &amp; tab monitor</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
            <CheckCircle2 size={18} color="#26c6da" />
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#ffffff' }}>Audit Integrity</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Tamper-evident logs</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '16px 24px',
          textAlign: 'center',
          fontSize: '11.5px',
          color: '#64748b',
        }}
      >
        © {new Date().getFullYear()} ProctorTrack™ Enterprise Invigilation Suite. Verificient Technologies Inc. All rights reserved.
      </footer>
    </div>
  );
}
