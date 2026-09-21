import { Clock, Eye, Check, AlertCircle, ShieldAlert } from 'lucide-react';
import CameraPlaceholder from './CameraPlaceholder';
import RiskBadge from '../common/RiskBadge';
import StatusBadge from '../common/StatusBadge';

export default function CandidateMonitorCard({ candidate, onMonitor }) {
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
        boxShadow: isHighRisk ? '0 4px 14px rgba(220, 38, 38, 0.12)' : 'var(--shadow-sm)'
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
          backgroundColor: isHighRisk ? '#fff5f5' : isWarning ? '#fffdf5' : '#ffffff'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="avatar-circle">
            {candidate.avatar || candidate.candidate.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--pt-navy-900)', margin: 0 }}>
              {candidate.candidate}
            </h4>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              {candidate.exam}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: 'var(--pt-navy-900)' }}>
            <Clock size={12} color="var(--pt-blue-800)" /> {candidate.timeRemaining}
          </div>
          <div style={{ marginTop: '2px' }}>
            <StatusBadge status={candidate.status} size="sm" />
          </div>
        </div>
      </div>

      {/* Proctortrack Camera Feed */}
      <div style={{ padding: '14px 18px 0 18px' }}>
        <CameraPlaceholder
          candidateName={candidate.candidate}
          risk={candidate.risk}
          aspectRatio="16/9"
          isCompact={true}
          sessionId={`PT-${candidate.id?.toUpperCase() || 'SESSION'}`}
        />
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
          justifyContent: 'space-between'
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
          {isHighRisk ? <ShieldAlert size={13} /> : <Eye size={13} />}
          <span>{isHighRisk ? 'Audit Incident' : 'Live Supervise'}</span>
        </button>
      </div>
    </div>
  );
}
