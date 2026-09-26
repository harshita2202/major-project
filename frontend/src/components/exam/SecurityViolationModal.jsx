import { Maximize, ShieldAlert, AlertOctagon, XCircle } from 'lucide-react';

/**
 * SecurityViolationModal.jsx
 * Blocking overlay shown when a security violation occurs (fullscreen exit, tab switch, etc.)
 * or when the risk threshold has been reached and exam is auto-submitted.
 */
export default function SecurityViolationModal({
  isVisible,
  violationType,
  warningMessage = '',
  isMediumWarning = false,
  isTerminated = false,
  terminationReason = '',
  onReturnToFullscreen,
  onAcknowledgeTermination,
}) {
  if (!isVisible) return null;

  const isFullscreenExit = violationType === 'FULLSCREEN_EXIT';

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
          maxWidth: '500px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px rgba(7,21,36,0.6)',
          animation: 'modal-pop 0.2s ease-out',
          border: isTerminated ? '2px solid #ef4444' : isMediumWarning ? '2px solid #f59e0b' : '1px solid var(--border-subtle)',
        }}
      >
        {/* Alert header */}
        <div
          style={{
            backgroundColor: isTerminated ? '#7f1d1d' : isMediumWarning ? '#fffbeb' : '#fef2f2',
            borderBottom: `1px solid ${isTerminated ? '#991b1b' : isMediumWarning ? '#fde68a' : '#fecaca'}`,
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
              backgroundColor: isTerminated ? 'rgba(239, 68, 68, 0.2)' : isMediumWarning ? '#fef3c7' : '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {isTerminated ? (
              <AlertOctagon size={26} color="#ef4444" />
            ) : isMediumWarning ? (
              <ShieldAlert size={26} color="#d97706" />
            ) : (
              <ShieldAlert size={24} color="#b91c1c" />
            )}
          </div>
          <div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 800,
                color: isTerminated ? '#ffffff' : isMediumWarning ? '#92400e' : '#b91c1c',
                letterSpacing: '-0.01em',
              }}
            >
              {isTerminated ? '⛔ EXAM AUTO-SUBMITTED' : isMediumWarning ? '⚠ SECURITY ELEVATION WARNING' : '⚠ PROCTORING WARNING'}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: isTerminated ? '#fca5a5' : isMediumWarning ? '#b45309' : '#991b1b',
                marginTop: '2px',
                fontWeight: 600,
              }}
            >
              {isTerminated
                ? 'High-Risk Integrity Threshold Exceeded'
                : 'ProctorTrack™ Integrity Safeguard Active'}
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
                padding: '16px',
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
                  marginBottom: '8px',
                }}
              >
                <XCircle size={18} color="#dc2626" />
                Exam Auto-Submitted &amp; Finalized
              </div>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#7f1d1d', lineHeight: 1.55 }}>
                {terminationReason ||
                  'Your exam has been automatically submitted because the proctoring risk threshold was reached.'}
              </p>
            </div>
          ) : (
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  fontSize: '14.5px',
                  color: 'var(--text-primary)',
                  lineHeight: 1.6,
                  fontWeight: 600,
                  padding: '14px 16px',
                  borderRadius: '10px',
                  backgroundColor: isMediumWarning ? '#fffbeb' : '#fef2f2',
                  border: `1px solid ${isMediumWarning ? '#fcd34d' : '#fca5a5'}`,
                  color: isMediumWarning ? '#92400e' : '#991b1b',
                }}
              >
                {warningMessage ||
                  (isFullscreenExit
                    ? 'Do not exit fullscreen. Repeated violations may result in automatic exam submission.'
                    : 'A proctoring violation has been detected. Please adhere strictly to exam security protocols.')}
              </div>
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
              View Exam Summary &amp; Status
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
              {isFullscreenExit ? 'Return to Fullscreen & Continue Exam' : 'Acknowledge Warning & Continue'}
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
