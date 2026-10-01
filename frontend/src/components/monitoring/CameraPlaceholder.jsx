import { Camera, ShieldCheck, Wifi, Lock, Mic, Monitor } from 'lucide-react';

/**
 * Proctortrack™ Enterprise Candidate Video Feed Simulator
 * Incorporates authentic ProctorTrack watermark, biometric facial landmarks,
 * hardware integrity status, and acoustic telemetry.
 */
export default function CameraPlaceholder({
  candidateName = 'Candidate',
  risk = 'Low',
  aspectRatio = '16/9',
  isCompact = false,
  sessionId = 'PT-8942'
}) {
  const isHighRisk = risk === 'High';
  const isWarning = risk === 'Medium';

  const boxColor = isHighRisk ? '#ef4444' : isWarning ? '#f78d2b' : '#26c6da';
  const statusLabel = isHighRisk
    ? 'PEEP VIOLATION DETECTED'
    : isWarning
    ? 'BEHAVIOR FLAGGED • REVIEW'
    : 'PROCTORID™ BIOMETRICS OK (99.2%)';

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: aspectRatio,
        backgroundColor: '#071524',
        borderRadius: '8px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: isCompact ? '10px' : '14px',
        color: '#ffffff',
        boxShadow: 'inset 0 0 25px rgba(0, 0, 0, 0.85)',
        border: `1.5px solid ${isHighRisk ? '#dc2626' : isWarning ? '#f78d2b' : '#163b60'}`
      }}
    >
      {/* Background simulated invigilation room silhouette and technical scan grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle at 50% 45%, rgba(22, 59, 96, 0.45) 0%, rgba(7, 21, 36, 0.95) 75%), linear-gradient(rgba(38, 198, 218, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(38, 198, 218, 0.05) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 24px 24px, 24px 24px',
          opacity: 0.85
        }}
      />

      {/* Top Telemetry Header */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          fontWeight: 600,
          textShadow: '0 1px 3px rgba(0, 0, 0, 0.9)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: isHighRisk ? '#ef4444' : '#10b981',
                boxShadow: isHighRisk ? '0 0 8px #ef4444' : '0 0 8px #10b981',
                animation: 'pulse 1.4s infinite'
              }}
            />
            <span style={{ letterSpacing: '0.06em', color: isHighRisk ? '#fca5a5' : '#34d399', fontSize: '10px', fontWeight: 800 }}>
              PROCTORLIVE™
            </span>
          </div>

          <span
            style={{
              fontSize: '9.5px',
              fontFamily: 'var(--font-mono)',
              color: '#8eaec9',
              background: 'rgba(10, 28, 48, 0.75)',
              padding: '1px 6px',
              borderRadius: '3px',
              border: '1px solid rgba(38, 198, 218, 0.2)'
            }}
          >
            {sessionId}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94b4cf' }}>
          <span style={{ fontSize: '10px', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px' }}>
            1080p • 30fps
          </span>
          <Wifi size={12} color="#10b981" />
        </div>
      </div>

      {/* Simulated AI Face Recognition Bounding Box */}
      <div
        style={{
          position: 'absolute',
          top: '24%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: isCompact ? '90px' : '140px',
          height: isCompact ? '110px' : '160px',
          border: `2px dashed ${boxColor}`,
          borderRadius: '10px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 16px ${boxColor}33`,
          pointerEvents: 'none',
          zIndex: 5
        }}
      >
        {/* Silhouette avatar inside box */}
        <div
          style={{
            width: isCompact ? '42px' : '62px',
            height: isCompact ? '42px' : '62px',
            borderRadius: '50%',
            backgroundColor: 'rgba(38, 198, 218, 0.12)',
            border: '1px solid rgba(38, 198, 218, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#8eaec9',
            marginBottom: '6px'
          }}
        >
          <Camera size={isCompact ? 18 : 24} color="#26c6da" />
        </div>

        {/* AI Confidence Tag */}
        <div
          style={{
            position: 'absolute',
            bottom: '-12px',
            backgroundColor: boxColor,
            color: '#ffffff',
            fontSize: '9px',
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: '4px',
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.5)'
          }}
        >
          {statusLabel}
        </div>
      </div>

      {/* Bottom Telemetry & Hardware Lockdown Bar */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          backgroundColor: 'rgba(7, 21, 36, 0.8)',
          padding: '6px 10px',
          borderRadius: '6px',
          border: '1px solid rgba(22, 59, 96, 0.6)',
          backdropFilter: 'blur(4px)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={13} color="#26c6da" />
          <span style={{ color: '#ffffff', fontWeight: 600, fontSize: '11.5px' }}>{candidateName}</span>
        </div>

        {/* Hardware Status Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div title="Desktop Lock: Active" style={{ display: 'flex', alignItems: 'center', color: '#34d399' }}>
            <Lock size={11} />
          </div>
          <div title="Mic Active" style={{ display: 'flex', alignItems: 'center', color: '#34d399' }}>
            <Mic size={11} />
          </div>
          <div title="Secondary Screen Blocked" style={{ display: 'flex', alignItems: 'center', color: '#38bdf8' }}>
            <Monitor size={11} />
          </div>

          {/* Audio Waveform Simulator */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '11px', marginLeft: '4px' }}>
            <span style={{ width: '2px', height: '4px', backgroundColor: '#26c6da', borderRadius: '1px' }} />
            <span style={{ width: '2px', height: '10px', backgroundColor: '#26c6da', borderRadius: '1px' }} />
            <span style={{ width: '2px', height: '7px', backgroundColor: '#26c6da', borderRadius: '1px' }} />
            <span style={{ width: '2px', height: '3px', backgroundColor: '#26c6da', borderRadius: '1px' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
