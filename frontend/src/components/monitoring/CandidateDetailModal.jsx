import { useState } from 'react';
import { Clock, ShieldAlert, AlertTriangle, UserX, Flag } from 'lucide-react';
import Modal from '../common/Modal';
import CameraPlaceholder from './CameraPlaceholder';
import RiskBadge from '../common/RiskBadge';
import StatusBadge from '../common/StatusBadge';
import MonitoringTimeline from './MonitoringTimeline';

export default function CandidateDetailModal({ candidate, isOpen, onClose }) {
  const [actionNotice, setActionNotice] = useState('');

  if (!candidate) return null;

  const handleAction = (msg) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(''), 4000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Live Candidate Inspection: ${candidate.candidate}`}
      subtitle={`${candidate.exam} • Session ID: ${candidate.id}`}
      maxWidth="840px"
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ fontSize: '12.5px', color: '#059669', fontWeight: 600 }}>
            {actionNotice}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleAction(`Proctor warning sent to ${candidate.candidate}.`)}
            >
              <AlertTriangle size={14} color="#d97706" /> Issue Warning
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleAction(`Session ${candidate.id} flagged for administrative review.`)}
            >
              <Flag size={14} color="#2563eb" /> Flag Session
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => handleAction(`Session ${candidate.id} disqualified & terminated.`)}
            >
              <UserX size={14} /> Terminate Exam
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        {/* Left Column: Live Feed & Telemetry */}
        <div>
          <div style={{ marginBottom: '16px' }}>
            <CameraPlaceholder
              candidateName={candidate.candidate}
              risk={candidate.risk}
              aspectRatio="16/10"
            />
          </div>

          {/* Key Metrics Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
              backgroundColor: '#f8fafc',
              padding: '14px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                Status
              </span>
              <div style={{ marginTop: '4px' }}>
                <StatusBadge status={candidate.status} />
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                Threat Risk
              </span>
              <div style={{ marginTop: '4px' }}>
                <RiskBadge level={candidate.risk} score={candidate.riskScore} />
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                Time Remaining
              </span>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <Clock size={14} color="#2563eb" /> {candidate.timeRemaining}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                Exam Progress
              </span>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                {candidate.progress}% completed
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                Cheating Status
              </span>
              <div style={{ marginTop: '4px' }}>
                {candidate.cheatingFlag ? (
                  <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '4px', padding: '2px 8px' }}>
                    FLAGGED
                  </span>
                ) : (
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#059669' }}>
                    CLEAN
                  </span>
                )}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                Latest Infraction
              </span>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: candidate.latestEvent ? '#dc2626' : '#64748b', marginTop: '4px' }}>
                {candidate.latestEvent || 'None'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Checklist & Event Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* AI Automated Verifications */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldAlert size={15} color="#2563eb" /> AI Diagnostics Checklist
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#475569' }}>Face Detection:</span>
                <span style={{ fontWeight: 600, color: candidate.checks.faceStatus === 'danger' ? '#dc2626' : '#059669' }}>
                  {candidate.checks.faceDetected}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#475569' }}>Multiple Faces:</span>
                <span style={{ fontWeight: 600, color: candidate.checks.multipleFacesStatus === 'danger' ? '#dc2626' : '#059669' }}>
                  {candidate.checks.multipleFaces}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#475569' }}>Tab Switches:</span>
                <span style={{ fontWeight: 600, color: candidate.checks.tabSwitch > 2 ? '#dc2626' : candidate.checks.tabSwitch > 0 ? '#d97706' : '#059669' }}>
                  {candidate.checks.tabSwitch} times
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#475569' }}>Audio Status:</span>
                <span style={{ fontWeight: 600, color: candidate.checks.audioStatus === 'danger' ? '#dc2626' : candidate.checks.audioStatus === 'warning' ? '#d97706' : '#059669' }}>
                  {candidate.checks.audio}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#475569' }}>Suspicious Gaze:</span>
                <span style={{ fontWeight: 600, color: candidate.checks.movementStatus === 'danger' ? '#dc2626' : candidate.checks.movementStatus === 'warning' ? '#d97706' : '#059669' }}>
                  {candidate.checks.suspiciousMovement}
                </span>
              </div>
            </div>
          </div>

          {/* Event Timeline */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', flex: 1, maxHeight: '220px', overflowY: 'auto' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>
              Session Event Log
            </h4>
            <MonitoringTimeline events={candidate.timeline} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
