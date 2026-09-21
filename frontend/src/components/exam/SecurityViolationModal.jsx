import { Maximize, ShieldAlert } from 'lucide-react';

/**
 * SecurityViolationModal.jsx
 * Blocking overlay shown when a security violation occurs (e.g. fullscreen exit).
 *
 * Props:
 *   isVisible         boolean
 *   violationType     'FULLSCREEN_EXIT' | 'TAB_SWITCH' | string
 *   fullscreenExits   number
 *   tabSwitches       number
 *   onReturnToFullscreen  () => void
 */
export default function SecurityViolationModal({
  isVisible,
  violationType,
  fullscreenExits,
  tabSwitches,
  onReturnToFullscreen,
}) {
  if (!isVisible) return null;

  const isFullscreenExit = violationType === 'FULLSCREEN_EXIT';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(7, 21, 36, 0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)',
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '460px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px rgba(7,21,36,0.5)',
          animation: 'modal-pop 0.2s ease-out',
        }}
      >
        {/* Alert header */}
        <div
          style={{
            backgroundColor: '#fef2f2',
            borderBottom: '1px solid #fecaca',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ShieldAlert size={24} color="#b91c1c" />
          </div>
          <div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 800,
                color: '#b91c1c',
                letterSpacing: '-0.01em',
              }}
            >
              ⚠ SECURITY WARNING
            </div>
            <div style={{ fontSize: '12.5px', color: '#991b1b', marginTop: '2px' }}>
              ProctorTrack™ Integrity Violation Detected
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          <p
            style={{
              fontSize: '15px',
              color: 'var(--text-primary)',
              lineHeight: 1.6,
              marginBottom: '20px',
              fontWeight: 500,
            }}
          >
            {isFullscreenExit
              ? 'You have exited fullscreen mode. The examination requires you to remain in fullscreen at all times.'
              : 'A security violation has been detected. This incident has been recorded.'}
          </p>

          {/* Violation counters */}
          <div
            style={{
              backgroundColor: 'var(--bg-app)',
              borderRadius: '10px',
              padding: '14px 18px',
              marginBottom: '22px',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              gap: '24px',
            }}
          >
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#b91c1c' }}>
                {fullscreenExits}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                Fullscreen Exits
              </div>
            </div>
            <div
              style={{ width: '1px', backgroundColor: 'var(--border-subtle)', alignSelf: 'stretch' }}
            />
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#b45309' }}>
                {tabSwitches}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                Tab Switches
              </div>
            </div>
          </div>

          <p
            style={{
              fontSize: '12.5px',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              marginBottom: '20px',
            }}
          >
            All violations are recorded and will be included in your exam security report. Repeated
            violations may result in exam termination.
          </p>

          {/* Action button */}
          <button
            type="button"
            onClick={onReturnToFullscreen}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '10px',
              border: 'none',
              background: 'var(--primary-gradient)',
              color: '#ffffff',
              fontSize: '14.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              letterSpacing: '0.01em',
            }}
          >
            <Maximize size={17} />
            Return to Fullscreen & Continue Exam
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modal-pop {
          from { opacity: 0; transform: scale(0.93); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
