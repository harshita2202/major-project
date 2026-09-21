

/**
 * Proctortrack™ LoadingSpinner with institutional brand animation
 */
export default function LoadingSpinner({ text = 'Loading Proctortrack data...', size = 32 }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        gap: '16px',
        minHeight: '300px'
      }}
    >
      {/* Proctortrack dual-ring spinner */}
      <div style={{ position: 'relative', width: `${size}px`, height: `${size}px` }}>
        <div
          style={{
            width: `${size}px`,
            height: `${size}px`,
            border: '3px solid var(--border-subtle)',
            borderTopColor: 'var(--pt-navy-800)',
            borderRadius: '50%',
            animation: 'pt-spin 0.9s linear infinite',
            position: 'absolute',
            top: 0,
            left: 0
          }}
        />
        <div
          style={{
            width: `${size * 0.65}px`,
            height: `${size * 0.65}px`,
            border: '2px solid var(--border-subtle)',
            borderTopColor: 'var(--pt-cyan-500)',
            borderRadius: '50%',
            animation: 'pt-spin 0.6s linear infinite reverse',
            position: 'absolute',
            top: `${size * 0.175}px`,
            left: `${size * 0.175}px`
          }}
        />
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '13.5px', color: 'var(--pt-navy-800)', fontWeight: 600 }}>
          {text}
        </div>
        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Proctortrack™ by Verificient Technologies
        </div>
      </div>

      <style>{`
        @keyframes pt-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div style={{ width: '100%', padding: '16px' }}>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '14px',
            alignItems: 'center'
          }}
        >
          {Array.from({ length: cols }).map((__, c) => (
            <div
              key={c}
              style={{
                flex: 1,
                height: '18px',
                backgroundColor: '#f1f6fb',
                borderRadius: '4px',
                animation: 'pt-pulse 1.5s infinite ease-in-out'
              }}
            />
          ))}
        </div>
      ))}
      <style>{`
        @keyframes pt-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
