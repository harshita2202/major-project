import { ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';

/**
 * Proctortrack™ PEEP Risk Badge - ProctorTrack integrity risk profiling
 */
export default function RiskBadge({ level = 'Low', score, showIcon = true }) {
  const norm = (level || '').toLowerCase();

  let badgeStyle = {
    bg: '#ecfdf5',
    text: '#047857',
    border: '#a7f3d0',
    icon: <ShieldCheck size={13} />
  };

  if (norm.includes('med')) {
    badgeStyle = {
      bg: '#fffbeb',
      text: '#b45309',
      border: '#fde68a',
      icon: <AlertTriangle size={13} />
    };
  } else if (norm.includes('high') || norm.includes('danger')) {
    badgeStyle = {
      bg: '#fef2f2',
      text: '#b91c1c',
      border: '#fecaca',
      icon: <AlertOctagon size={13} />
    };
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 10px',
        borderRadius: '9999px',
        fontSize: '11.5px',
        fontWeight: 700,
        backgroundColor: badgeStyle.bg,
        color: badgeStyle.text,
        border: `1px solid ${badgeStyle.border}`,
        letterSpacing: '0.01em'
      }}
    >
      {showIcon && badgeStyle.icon}
      <span>{level} Risk</span>
      {score !== undefined && (
        <span style={{ opacity: 0.85, fontWeight: 700, marginLeft: 2 }}>({score}%)</span>
      )}
    </span>
  );
}
