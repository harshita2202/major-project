import { useState } from 'react';
import { Clock, Eye, Check, AlertCircle, ShieldAlert, Camera, EyeOff } from 'lucide-react';
import CameraPlaceholder from './CameraPlaceholder';
import RiskBadge from '../common/RiskBadge';
import StatusBadge from '../common/StatusBadge';

import UserAvatar from '../common/UserAvatar';

/**
 * CandidateMonitorCard.jsx
 * Monitored candidate card.
 *
 * To avoid streaming camera monitoring for every student simultaneously,
 * camera feeds are on-demand: clicking "Show Camera" or the candidate name
 * reveals the camera stream for that individual student.
 */
export default function CandidateMonitorCard({ candidate, onMonitor }) {
  const [showInlineCamera, setShowInlineCamera] = useState(false);
  const { checks, risk, riskScore } = candidate;

  const isHighRisk = risk === 'High';
  const isWarning = risk === 'Medium';

  return (
    <div
      className="card"
      style={{
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        borderColor: isHighRisk ? '#fecaca' : isWarning ? '#fde68a' : 'var(--border-subtle)',
        boxShadow: isHighRisk ? '0 4px 14px rgba(220, 38, 38, 0.12)' : 'var(--shadow-sm)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Top Candidate & Session Info */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          backgroundColor: isHighRisk ? '#fff5f5' : isWarning ? '#fffdf5' : '#ffffff',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            minWidth: 0,
            flex: 1,
          }}
          onClick={() => onMonitor && onMonitor(candidate)}
          title="Click to view candidate camera"
        >
          <UserAvatar avatar={candidate.avatar} name={candidate.candidate} size={38} />
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <h4
              style={{
                fontSize: '13.5px',
                fontWeight: 800,
                color: 'var(--pt-navy-900)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{candidate.candidate}</span>
              <Camera size={12} color="var(--pt-blue-600)" style={{ flexShrink: 0 }} />
            </h4>
            <div
              style={{
                fontSize: '11.5px',
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginTop: '1px',
              }}
            >
              {candidate.exam}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', fontSize: '12px', fontWeight: 700, color: 'var(--pt-navy-900)' }}>
            <Clock size={12} color="var(--pt-blue-800)" /> {candidate.timeRemaining}
          </div>
          <div style={{ marginTop: '2px' }}>
            <StatusBadge status={candidate.status} size="sm" />
          </div>
        </div>
      </div>

      {/* On-Demand Camera Area - Does NOT display camera feeds for all students simultaneously */}
      <div style={{ padding: '14px 18px 0 18px' }}>
        {showInlineCamera ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6px' }}>
              <button
                type="button"
                onClick={() => setShowInlineCamera(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <EyeOff size={11} /> Hide Camera Feed
              </button>
            </div>
            <CameraPlaceholder
              candidateName={candidate.candidate}
              risk={candidate.risk}
              aspectRatio="16/9"
              isCompact={true}
              sessionId={`PT-${candidate.id?.toUpperCase() || 'SESSION'}`}
            />
          </div>
        ) : (
          <div
            onClick={() => setShowInlineCamera(true)}
            style={{
              width: '100%',
              aspectRatio: '16/8',
              backgroundColor: '#0a1c30',
              borderRadius: '8px',
              border: '1.5px dashed rgba(38, 198, 218, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: '16px',
              textAlign: 'center',
              transition: 'all 0.2s ease',
              boxShadow: 'inset 0 0 15px rgba(0,0,0,0.5)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#26c6da';
              e.currentTarget.style.backgroundColor = '#0e243c';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(38, 198, 218, 0.35)';
              e.currentTarget.style.backgroundColor = '#0a1c30';
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: 'rgba(38, 198, 218, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px',
                border: '1px solid rgba(38, 198, 218, 0.3)',
              }}
            >
              <Camera size={18} color="#26c6da" />
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.01em' }}>
              Click to View Camera Feed
            </div>
            <div style={{ fontSize: '11px', color: '#8eaec9', marginTop: '3px' }}>
              1080p WebCam &bull; Biometric Stream Standby
            </div>
          </div>
        )}
      </div>

      {/* Proctortrack PEEP Telemetry Checklist */}
      <div style={{ padding: '14px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Facial Landmarks</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: checks.faceStatus === 'danger' ? '#dc2626' : '#059669' }}>
            {checks.faceStatus === 'normal' ? <Check size={13} /> : <AlertCircle size={13} />}
            {checks.faceDetected}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Secondary Face Scan</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: checks.multipleFacesStatus === 'danger' ? '#dc2626' : '#059669' }}>
            {checks.multipleFacesStatus === 'normal' ? <Check size={13} /> : <AlertCircle size={13} />}
            {checks.multipleFaces}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Browser Unfocus / Alt-Tab</span>
          <span style={{ fontWeight: 700, color: checks.tabSwitch > 0 ? '#d97706' : '#059669' }}>
            {checks.tabSwitch} events
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Acoustic Noise Floor</span>
          <span style={{ fontWeight: 700, color: checks.audioStatus === 'danger' ? '#dc2626' : checks.audioStatus === 'warning' ? '#d97706' : '#059669' }}>
            {checks.audio}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', borderTop: '1px dashed var(--border-subtle)', paddingTop: '6px' }}>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>PEEP Risk Score</span>
          <RiskBadge level={risk} score={riskScore} />
        </div>
      </div>

      {/* Action Footer */}
      <div
        style={{
          padding: '12px 18px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Exam Progress: <strong style={{ color: 'var(--pt-navy-900)' }}>{candidate.progress}%</strong>
        </span>

        <button
          type="button"
          className={isHighRisk ? 'btn btn-orange btn-sm' : 'btn btn-primary btn-sm'}
          onClick={() => onMonitor && onMonitor(candidate)}
          style={{ fontSize: '12px', gap: '5px' }}
        >
          {isHighRisk ? <ShieldAlert size={13} /> : <Camera size={13} />}
          <span>{isHighRisk ? 'Audit Incident' : 'View Camera Feed'}</span>
        </button>
      </div>
    </div>
  );
}
