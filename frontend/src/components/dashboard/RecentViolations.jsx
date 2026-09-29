import { useMemo } from 'react';
import { ShieldAlert, Maximize2, ClipboardCopy, Keyboard, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * RecentViolations.jsx
 * Replaced log list with ONLY counts of malpractice events.
 * Does NOT display individual student names, timestamps, or confidence percentages.
 */
export default function RecentViolations({ violations = [] }) {
  const counts = useMemo(() => {
    let fullscreen = 0;
    let copyPaste = 0;
    let shortcut = 0;
    let other = 0;

    violations.forEach((v) => {
      const text = `${v.violation || ''} ${v.type || ''} ${v.details || ''}`.toLowerCase();
      if (text.includes('fullscreen') || text.includes('screen exit')) {
        fullscreen++;
      } else if (text.includes('copy') || text.includes('paste') || text.includes('clipboard')) {
        copyPaste++;
      } else if (text.includes('shortcut') || text.includes('tab') || text.includes('key') || text.includes('window')) {
        shortcut++;
      } else {
        other++;
      }
    });

    const total = violations.length > 0 ? violations.length : fullscreen + copyPaste + shortcut + other;

    if (total === 0) {
      return {
        total: 0,
        fullscreen: 0,
        copyPaste: 0,
        shortcut: 0,
        other: 0,
      };
    }

    return {
      total,
      fullscreen,
      copyPaste,
      shortcut,
      other,
    };
  }, [violations]);

  const eventCategories = [
    {
      label: 'Fullscreen Exit',
      count: counts.fullscreen,
      icon: Maximize2,
      color: '#2563eb',
      bgColor: '#eff6ff',
      description: 'Candidate exited required examination window',
    },
    {
      label: 'Copy/Paste Attempt',
      count: counts.copyPaste,
      icon: ClipboardCopy,
      color: '#0284c7',
      bgColor: '#f0f9ff',
      description: 'Clipboard paste or copy action detected',
    },
    {
      label: 'Shortcut Attempt',
      count: counts.shortcut,
      icon: Keyboard,
      color: '#d97706',
      bgColor: '#fffbeb',
      description: 'Unauthorized key combination or tab switch',
    },
    {
      label: 'Other Infractions',
      count: counts.other,
      icon: AlertCircle,
      color: '#64748b',
      bgColor: '#f8fafc',
      description: 'Multiple faces, audio anomaly, or gaze absence',
    },
  ];

  return (
    <div
      className="card"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header with Total Count */}
      <div
        style={{
          padding: '18px 22px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#fffbeb',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldAlert size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Malpractice Event Counts
            </h3>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              Aggregate volume of detected security infractions
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Total Events
          </span>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
            {counts.total}
          </div>
        </div>
      </div>

      {/* Body: ONLY counts by event type */}
      <div style={{ padding: '18px 22px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {eventCategories.map((cat) => {
          const Icon = cat.icon;
          const pct = Math.round((cat.count / (counts.total || 1)) * 100);

          return (
            <div
              key={cat.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: '#f8fafc',
                border: '1px solid #f1f5f9',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: cat.bgColor,
                    color: cat.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                    {cat.label}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                    {cat.description}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '12px' }}>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  {cat.count}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  {pct}% of events
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Link */}
      <div
        style={{
          padding: '12px 22px',
          borderTop: '1px solid #f1f5f9',
          backgroundColor: '#fafbfc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '12px', color: '#64748b' }}>
          Real-time telemetry monitored across active exam sessions
        </span>
        <Link
          to="/live-monitoring"
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#2563eb',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>View Live Monitoring</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}
