/**
 * StatCard.jsx
 * Clean, modern metric card for university examination portal.
 * Focuses on clarity, professional blue/navy accents, and zero visual clutter.
 */
export default function StatCard({
  title,
  value,
  icon: Icon,
  accentColor = '#2563eb',
  iconBg = '#eff6ff',
  subtext,
  badgeText,
}) {
  return (
    <div
      className="card"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#cbd5e1';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e2e8f0';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.03)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#64748b',
          }}
        >
          {title}
        </span>

        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '9px',
            backgroundColor: iconBg,
            color: accentColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {Icon && <Icon size={19} />}
        </div>
      </div>

      <div style={{ marginTop: '12px' }}>
        <div
          style={{
            fontSize: '28px',
            fontWeight: 800,
            color: '#0f172a',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}
        >
          {value}
        </div>

        {(subtext || badgeText) && (
          <div
            style={{
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: '#64748b',
            }}
          >
            {badgeText && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: '4px',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                }}
              >
                {badgeText}
              </span>
            )}
            {subtext && <span>{subtext}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
