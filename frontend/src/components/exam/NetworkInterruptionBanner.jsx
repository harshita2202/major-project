import { WifiOff, Wifi, AlertTriangle, CheckCircle2, Clock, X } from 'lucide-react';

/**
 * NetworkInterruptionBanner.jsx
 *
 * Implements the 10-Second Network Interruption Grace Period Banner.
 *
 * Display States:
 * 1. Offline (within 10s grace period):
 *    - Message: "Network connection interrupted. Please restore your connection."
 *    - Countdown: 10s -> 0s
 * 2. Offline (10s+ elapsed):
 *    - Message: "Network connection interrupted. Please restore your connection."
 *    - Details: Grace period expired. NETWORK_INTERRUPTION event logged (+5 risk score).
 * 3. Restored:
 *    - Message: "Network connection restored. You may continue the exam."
 */
export default function NetworkInterruptionBanner({
  isOffline,
  graceSecondsRemaining,
  hasRecordedInterruption,
  restoredMessage,
  onDismissRestored,
  onSimulateOffline,
  onSimulateRestore,
}) {
  if (!isOffline && !restoredMessage) {
    return null;
  }

  // ── State 1: Connection Restored Notice ──────────────────────────────────────
  if (!isOffline && restoredMessage) {
    return (
      <div
        role="alert"
        aria-live="polite"
        style={{
          backgroundColor: '#ecfdf5',
          borderBottom: '2px solid #10b981',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
          animation: 'slide-down 0.25s ease-out',
          zIndex: 1000,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#d1fae5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={20} color="#059669" />
          </div>
          <div>
            <div
              style={{
                fontSize: '14.5px',
                fontWeight: 800,
                color: '#065f46',
                letterSpacing: '-0.01em',
              }}
            >
              {restoredMessage}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#047857',
                marginTop: '1px',
                fontWeight: 500,
              }}
            >
              Your network connection is stable. Exam progress and security telemetry are active.
            </div>
          </div>
        </div>

        {onDismissRestored && (
          <button
            type="button"
            onClick={onDismissRestored}
            title="Dismiss notification"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              color: '#047857',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>
    );
  }

  // ── State 2: Offline - Within Grace Period (< 10s) ───────────────────────────
  const inGracePeriod = !hasRecordedInterruption && graceSecondsRemaining > 0;

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        backgroundColor: inGracePeriod ? '#fffbeb' : '#fef2f2',
        borderBottom: `2px solid ${inGracePeriod ? '#f59e0b' : '#ef4444'}`,
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: inGracePeriod
          ? '0 4px 16px rgba(245, 158, 11, 0.2)'
          : '0 4px 16px rgba(239, 68, 68, 0.25)',
        animation: 'slide-down 0.25s ease-out',
        zIndex: 1000,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '280px', flex: 1 }}>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            backgroundColor: inGracePeriod ? '#fef3c7' : '#fee2e2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            animation: inGracePeriod ? 'pulse 1.5s infinite' : 'none',
          }}
        >
          {inGracePeriod ? (
            <WifiOff size={22} color="#d97706" />
          ) : (
            <AlertTriangle size={22} color="#dc2626" />
          )}
        </div>

        <div>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 800,
              color: inGracePeriod ? '#92400e' : '#991b1b',
              letterSpacing: '-0.01em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>Network connection interrupted. Please restore your connection.</span>
          </div>

          <div
            style={{
              fontSize: '12.5px',
              color: inGracePeriod ? '#b45309' : '#b91c1c',
              marginTop: '3px',
              fontWeight: 500,
            }}
          >
            {inGracePeriod ? (
              <span>
                10-second grace period active. If connection is restored within 10 seconds, no violation or penalty will be incurred.
              </span>
            ) : (
              <span>
                Grace period exceeded (10s+). <strong>NETWORK_INTERRUPTION</strong> recorded (+5 risk points). No repeated points will be added while offline continues.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right side: Countdown Timer or Persistent Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {inGracePeriod ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#fef3c7',
              border: '1.5px solid #fde68a',
              borderRadius: '9999px',
              padding: '6px 14px',
              color: '#92400e',
              fontWeight: 700,
              fontSize: '13px',
            }}
          >
            <Clock size={16} color="#d97706" />
            <span>Grace Period:</span>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '15px',
                fontWeight: 900,
                color: '#b45309',
                minWidth: '28px',
                textAlign: 'center',
              }}
            >
              {graceSecondsRemaining}s
            </span>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#fee2e2',
              border: '1.5px solid #fecaca',
              borderRadius: '9999px',
              padding: '6px 14px',
              color: '#991b1b',
              fontWeight: 700,
              fontSize: '12px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#dc2626',
                display: 'inline-block',
                animation: 'pulse 1s infinite',
              }}
            />
            <span>Penalty Logged (+5) · Awaiting Connection</span>
          </div>
        )}

        {/* Development / Testing Simulators */}
        {onSimulateRestore && (
          <button
            type="button"
            onClick={onSimulateRestore}
            style={{
              padding: '5px 10px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: '#ffffff',
              color: '#374151',
              cursor: 'pointer',
            }}
            title="Simulate restoring network connection"
          >
            Simulate Restore
          </button>
        )}
      </div>
    </div>
  );
}
