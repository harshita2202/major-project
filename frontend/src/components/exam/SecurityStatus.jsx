import { Shield, ShieldAlert, ShieldOff } from 'lucide-react';

/**
 * SecurityStatus.jsx
 * Displays current security state + violation counters.
 *
 * Props:
 *   status    'SECURE' | 'WARNING' | 'HIGH_RISK'
 *   counts    { tabSwitches, fullscreenExits, copyAttempts, pasteAttempts, shortcutAttempts, total }
 */
export default function SecurityStatus({ status, counts }) {
  const configs = {
    SECURE: {
      label: 'SECURE',
      icon: <Shield size={15} />,
      bg: '#ecfdf5',
      color: '#047857',
      border: '#a7f3d0',
      dotColor: '#16a34a',
    },
    WARNING: {
      label: 'WARNING',
      icon: <ShieldAlert size={15} />,
      bg: '#fffbeb',
      color: '#b45309',
      border: '#fde68a',
      dotColor: '#d97706',
    },
    HIGH_RISK: {
      label: 'HIGH RISK',
      icon: <ShieldOff size={15} />,
      bg: '#fef2f2',
      color: '#b91c1c',
      border: '#fecaca',
      dotColor: '#dc2626',
    },
  };

  const cfg = configs[status] || configs.SECURE;

  const counterItems = [
    { label: 'Tab switches', value: counts.tabSwitches },
    { label: 'Fullscreen exits', value: counts.fullscreenExits },
    { label: 'Copy attempts', value: counts.copyAttempts },
    { label: 'Paste attempts', value: counts.pasteAttempts },
    { label: 'Shortcut blocks', value: counts.shortcutAttempts },
  ];

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Status header */}
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: cfg.bg,
          borderBottom: `1px solid ${cfg.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ color: cfg.color }}>{cfg.icon}</span>
          <span style={{ fontSize: '12px', fontWeight: 800, color: cfg.color, letterSpacing: '0.06em' }}>
            Security Status
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: cfg.dotColor,
              display: 'inline-block',
              boxShadow: status === 'SECURE' ? `0 0 6px ${cfg.dotColor}` : 'none',
              animation: status !== 'SECURE' ? 'sec-blink 1.2s ease-in-out infinite' : 'none',
            }}
          />
          <span style={{ fontSize: '12px', fontWeight: 800, color: cfg.color }}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Total events badge */}
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
          Security Events
        </span>
        <span
          style={{
            fontSize: '18px',
            fontWeight: 800,
            color: counts.total === 0 ? '#047857' : cfg.color,
          }}
        >
          {counts.total}
        </span>
      </div>

      {/* Counter breakdown */}
      <div style={{ padding: '10px 16px 12px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {counterItems.map(({ label, value }) => (
          <div
            key={label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
            }}
          >
            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
            <span
              style={{
                fontWeight: 700,
                color: value === 0 ? 'var(--text-muted)' : '#b91c1c',
                minWidth: '20px',
                textAlign: 'right',
              }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes sec-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
