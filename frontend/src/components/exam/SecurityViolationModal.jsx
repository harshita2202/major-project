import { Maximize, ShieldAlert, AlertOctagon, XCircle } from 'lucide-react';

/**
 * SecurityViolationModal.jsx
 * Blocking overlay shown when a security violation occurs (e.g. fullscreen exit, tab switch).
 * Supports both warning status and automatic termination notice.
 *
 * Props:
 *   isVisible                boolean
 *   violationType            'FULLSCREEN_EXIT' | 'TAB_SWITCH' | string
 *   fullscreenExits          number
 *   tabSwitches              number
 *   maxTabSwitches           number
 *   maxFullscreenExits       number
 *   isTerminated             boolean
 *   terminationReason        string
 *   onReturnToFullscreen     () => void
 *   onAcknowledgeTermination () => void
 */
export default function SecurityViolationModal({
  isVisible,
  violationType,
  fullscreenExits = 0,
  tabSwitches = 0,
  maxTabSwitches = 3,
  maxFullscreenExits = 3,
  isTerminated = false,
  terminationReason = '',
  onReturnToFullscreen,
  onAcknowledgeTermination,
}) {
  if (!isVisible) return null;

  const isFullscreenExit = violationType === 'FULLSCREEN_EXIT';
  const remainingTabSwitches = Math.max(0, maxTabSwitches - tabSwitches);
  const remainingFsExits = Math.max(0, maxFullscreenExits - fullscreenExits);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(7, 21, 36, 0.94)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(5px)',
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '480px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px rgba(7,21,36,0.6)',
          animation: 'modal-pop 0.2s ease-out',
          border: isTerminated ? '2px solid #ef4444' : '1px solid var(--border-subtle)',
        }}
      >
        {/* Alert header */}
        <div
          style={{
            backgroundColor: isTerminated ? '#7f1d1d' : '#fef2f2',
            borderBottom: `1px solid ${isTerminated ? '#991b1b' : '#fecaca'}`,
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              backgroundColor: isTerminated ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {isTerminated ? (
              <AlertOctagon size={26} color="#ef4444" />
            ) : (
              <ShieldAlert size={24} color="#b91c1c" />
            )}
          </div>
          <div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 800,
                color: isTerminated ? '#ffffff' : '#b91c1c',
                letterSpacing: '-0.01em',
              }}
            >
              {isTerminated ? '⛔ EXAM TERMINATED' : '⚠ SECURITY WARNING'}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: isTerminated ? '#fca5a5' : '#991b1b',
                marginTop: '2px',
                fontWeight: 600,
              }}
            >
              {isTerminated
                ? 'Integrity Violation Threshold Exceeded'
                : 'ProctorTrack™ Integrity Violation Detected'}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {isTerminated ? (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1.5px solid #f87171',
                borderRadius: '10px',
                padding: '14px 16px',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 800,
                  color: '#991b1b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '6px',
                }}
              >
                <XCircle size={16} color="#dc2626" />
                Session Disqualified &amp; Closed
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#7f1d1d', lineHeight: 1.5 }}>
                {terminationReason ||
                  'The examination has been automatically terminated due to repeated security policy infractions. Your recorded responses and audit trail have been submitted for institutional review.'}
              </p>
            </div>
          ) : (
            <p
              style={{
                fontSize: '14.5px',
                color: 'var(--text-primary)',
                lineHeight: 1.6,
                marginBottom: '20px',
                fontWeight: 500,
              }}
            >
              {isFullscreenExit
                ? 'You have exited fullscreen mode. The examination requires you to remain in fullscreen at all times.'
                : 'A security violation has been detected. Navigating away or switching tabs is strictly forbidden.'}
            </p>
          )}

          {/* Violation counters */}
          <div
            style={{
              backgroundColor: 'var(--bg-app)',
              borderRadius: '10px',
              padding: '14px 18px',
              marginBottom: '20px',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              gap: '20px',
            }}
          >
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: fullscreenExits >= maxFullscreenExits ? '#dc2626' : '#b91c1c',
                }}
              >
                {fullscreenExits} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ {maxFullscreenExits}</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
                Fullscreen Exits
              </div>
              {!isTerminated && (
                <div style={{ fontSize: '10px', color: '#b91c1c', fontWeight: 700, marginTop: '3px' }}>
                  {remainingFsExits === 1 ? '1 left before termination!' : `${remainingFsExits} attempts left`}
                </div>
              )}
            </div>

            <div style={{ width: '1px', backgroundColor: 'var(--border-subtle)', alignSelf: 'stretch' }} />

            <div style={{ textAlign: 'center', flex: 1 }}>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: tabSwitches >= maxTabSwitches ? '#dc2626' : '#b45309',
                }}
              >
                {tabSwitches} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ {maxTabSwitches}</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
                Tab Switch Violations
              </div>
              {!isTerminated && (
                <div style={{ fontSize: '10px', color: '#b45309', fontWeight: 700, marginTop: '3px' }}>
                  {remainingTabSwitches === 1 ? '1 left before termination!' : `${remainingTabSwitches} attempts left`}
                </div>
              )}
            </div>
          </div>

          {!isTerminated && (
            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fcd34d',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '12px',
                color: '#92400e',
                lineHeight: 1.5,
                marginBottom: '20px',
              }}
            >
              <strong>Notice:</strong> When you reach {maxTabSwitches} tab switches or {maxFullscreenExits} fullscreen exits, this exam will <strong>automatically terminate immediately</strong> with all current answers saved.
            </div>
          )}

          {/* Action button */}
          {isTerminated ? (
            <button
              type="button"
              onClick={onAcknowledgeTermination}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)',
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
              <AlertOctagon size={17} />
              View Exam Termination Summary
            </button>
          ) : (
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
              Return to Fullscreen &amp; Continue Exam
            </button>
          )}
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
