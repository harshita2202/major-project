import { CheckCircle2, AlertTriangle, AlertOctagon, Info } from 'lucide-react';

export default function MonitoringTimeline({ events = [] }) {
  if (!events || events.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
        No timeline events recorded yet.
      </div>
    );
  }

  const getIcon = (type) => {
    switch (type) {
      case 'danger':
        return <AlertOctagon size={15} color="#dc2626" />;
      case 'warning':
        return <AlertTriangle size={15} color="#d97706" />;
      case 'success':
        return <CheckCircle2 size={15} color="#059669" />;
      default:
        return <Info size={15} color="#2563eb" />;
    }
  };

  return (
    <div style={{ position: 'relative', paddingLeft: '24px' }}>
      {/* Vertical Track line */}
      <div
        style={{
          position: 'absolute',
          left: '7px',
          top: '6px',
          bottom: '6px',
          width: '2px',
          backgroundColor: '#e2e8f0'
        }}
      />

      {events.map((ev, idx) => (
        <div
          key={idx}
          style={{
            position: 'relative',
            marginBottom: idx < events.length - 1 ? '16px' : 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}
        >
          {/* Node Icon */}
          <div
            style={{
              position: 'absolute',
              left: '-24px',
              top: '2px',
              width: '16px',
              height: '16px',
              backgroundColor: '#ffffff',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {getIcon(ev.type)}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11.5px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
              {ev.time}
            </span>
          </div>
          <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>
            {ev.event}
          </div>
        </div>
      ))}
    </div>
  );
}
