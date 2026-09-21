/**
 * SecurityActivity.jsx
 * Live security event log panel.
 *
 * Props:
 *   events  Array of security event objects (newest first preferred)
 */
export default function SecurityActivity({ events }) {
  const severityConfig = {
    INFO: { color: '#0369a1', bg: '#e0f2fe', label: 'INFO' },
    LOW: { color: '#047857', bg: '#ecfdf5', label: 'LOW' },
    MEDIUM: { color: '#b45309', bg: '#fffbeb', label: 'MED' },
    HIGH: { color: '#b91c1c', bg: '#fef2f2', label: 'HIGH' },
    CRITICAL: { color: '#7c2d12', bg: '#fff1f2', label: 'CRIT' },
  };

  const formatTime = (isoString) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-US', { hour12: false });
    } catch (fmtErr) {
      void fmtErr;
      return '--:--:--';
    }
  };

  const formatType = (type) =>
    type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  // Show most recent first, limit to 20 items
  const displayed = [...events].reverse().slice(0, 20);

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
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: '12px',
            fontWeight: 800,
            color: 'var(--pt-navy-800)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          Security Activity
        </span>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--text-muted)',
            backgroundColor: 'var(--bg-app)',
            padding: '2px 8px',
            borderRadius: '9999px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {events.length}
        </span>
      </div>

      {/* Event list */}
      <div
        style={{
          maxHeight: '280px',
          overflowY: 'auto',
        }}
      >
        {displayed.length === 0 ? (
          <div
            style={{
              padding: '20px 16px',
              textAlign: 'center',
              fontSize: '12px',
              color: 'var(--text-muted)',
            }}
          >
            No security events yet
          </div>
        ) : (
          displayed.map((event, idx) => {
            const cfg = severityConfig[event.severity] || severityConfig.INFO;
            return (
              <div
                key={idx}
                style={{
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start',
                }}
              >
                {/* Severity badge */}
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: '9.5px',
                    fontWeight: 800,
                    padding: '2px 5px',
                    borderRadius: '4px',
                    backgroundColor: cfg.bg,
                    color: cfg.color,
                    letterSpacing: '0.04em',
                    marginTop: '1px',
                  }}
                >
                  {cfg.label}
                </span>
                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: '2px',
                    }}
                  >
                    {formatType(event.type)}
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                    {formatTime(event.timestamp)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
