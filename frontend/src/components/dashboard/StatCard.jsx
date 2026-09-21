/**
 * Proctortrack™ Enterprise StatCard
 * High-contrast institutional metric indicator with top accent border
 */
export default function StatCard({
  title,
  value,
  trend,
  isPositive = true,
  icon: Icon,
  accentColor = 'var(--pt-navy-800)',
  iconBg = 'var(--pt-blue-50)',
  subtext = 'vs previous session',
  borderTopColor = 'var(--pt-blue-600)'
}) {
  return (
    <div
      className="card"
      style={{
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        borderTop: `3px solid ${borderTopColor}`
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em'
            }}
          >
            {title}
          </span>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 800,
              color: 'var(--pt-navy-900)',
              marginTop: '4px',
              letterSpacing: '-0.03em',
              fontFamily: 'var(--font-family)'
            }}
          >
            {value}
          </div>
        </div>

        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            backgroundColor: iconBg,
            color: accentColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: '1px solid rgba(15, 43, 72, 0.08)'
          }}
        >
          {Icon && <Icon size={21} />}
        </div>
      </div>

      <div
        style={{
          marginTop: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          fontWeight: 500
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: isPositive ? '#ecfdf5' : '#fff7ed',
            color: isPositive ? '#047857' : '#c2410c',
            fontWeight: 700,
            fontSize: '11px',
            border: `1px solid ${isPositive ? '#a7f3d0' : '#ffedd5'}`
          }}
        >
          {trend}
        </span>
        <span style={{ color: 'var(--text-muted)' }}>{subtext}</span>
      </div>
    </div>
  );
}
