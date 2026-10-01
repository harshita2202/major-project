import { useMemo } from 'react';
import { Maximize2, ClipboardCopy, Keyboard, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * MalpracticeBreakdown.jsx
 * Displays a clean breakdown of malpractice incidents categorized into:
 * - Fullscreen Exit
 * - Copy/Paste Attempt
 * - Shortcut Attempt
 * - Other
 */
export default function MalpracticeBreakdown({ violations = [] }) {
  const breakdownData = useMemo(() => {
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

    const total = fullscreen + copyPaste + shortcut + other;

    // If no infractions, return real 0s
    if (total === 0) {
      return {
        total: 0,
        items: [
          {
            label: 'Fullscreen Exit',
            count: 0,
            percentage: 0,
            color: '#2563eb',
            bgColor: '#eff6ff',
            icon: Maximize2,
          },
          {
            label: 'Copy/Paste Attempt',
            count: 0,
            percentage: 0,
            color: '#0284c7',
            bgColor: '#f0f9ff',
            icon: ClipboardCopy,
          },
          {
            label: 'Shortcut Attempt',
            count: 0,
            percentage: 0,
            color: '#d97706',
            bgColor: '#fffbeb',
            icon: Keyboard,
          },
          {
            label: 'Other Infractions',
            count: 0,
            percentage: 0,
            color: '#64748b',
            bgColor: '#f8fafc',
            icon: AlertCircle,
          },
        ],
      };
    }

    return {
      total,
      items: [
        {
          label: 'Fullscreen Exit',
          count: fullscreen,
          percentage: Math.round((fullscreen / total) * 100) || 0,
          color: '#2563eb',
          bgColor: '#eff6ff',
          icon: Maximize2,
        },
        {
          label: 'Copy/Paste Attempt',
          count: copyPaste,
          percentage: Math.round((copyPaste / total) * 100) || 0,
          color: '#0284c7',
          bgColor: '#f0f9ff',
          icon: ClipboardCopy,
        },
        {
          label: 'Shortcut Attempt',
          count: shortcut,
          percentage: Math.round((shortcut / total) * 100) || 0,
          color: '#d97706',
          bgColor: '#fffbeb',
          icon: Keyboard,
        },
        {
          label: 'Other Infractions',
          count: other,
          percentage: Math.round((other / total) * 100) || 0,
          color: '#64748b',
          bgColor: '#f8fafc',
          icon: AlertCircle,
        },
      ],
    };
  }, [violations]);

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
      {/* Header */}
      <div
        style={{
          padding: '18px 22px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h3
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: '#0f172a',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            Malpractice Breakdown
          </h3>
          <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
            Classification across active and past sessions
          </div>
        </div>
        <span
          style={{
            fontSize: '11.5px',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '6px',
            backgroundColor: '#f1f5f9',
            color: '#334155',
          }}
        >
          {breakdownData.total} Total
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '22px', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Visual Stacked Progress Bar */}
        <div
          style={{
            width: '100%',
            height: '8px',
            borderRadius: '9999px',
            backgroundColor: '#f1f5f9',
            overflow: 'hidden',
            display: 'flex',
          }}
        >
          {breakdownData.items.map((item) => (
            <div
              key={item.label}
              style={{
                width: `${item.percentage}%`,
                height: '100%',
                backgroundColor: item.color,
                transition: 'width 0.4s ease',
              }}
              title={`${item.label}: ${item.count} (${item.percentage}%)`}
            />
          ))}
        </div>

        {/* Categories List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
          {breakdownData.items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        backgroundColor: item.bgColor,
                        color: item.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={14} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                      {item.label}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                      {item.count}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b', minWidth: '32px', textAlign: 'right' }}>
                      {item.percentage}%
                    </span>
                  </div>
                </div>

                {/* Subtle individual progress track */}
                <div
                  style={{
                    width: '100%',
                    height: '4px',
                    borderRadius: '2px',
                    backgroundColor: '#f8fafc',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${item.percentage}%`,
                      height: '100%',
                      backgroundColor: item.color,
                      borderRadius: '2px',
                      opacity: 0.8,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Link */}
      <div
        style={{
          padding: '12px 22px',
          borderTop: '1px solid #f1f5f9',
          backgroundColor: '#fafbfc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        <Link
          to="/live-monitoring"
          style={{
            fontSize: '12.5px',
            fontWeight: 600,
            color: '#2563eb',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>View Live Invigilation</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}
