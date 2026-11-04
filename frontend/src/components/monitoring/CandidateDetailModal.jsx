import { useState, useEffect } from 'react';
import { Clock, ShieldAlert, AlertTriangle, UserX, Flag, Smartphone, Video, Wifi, WifiOff } from 'lucide-react';
import Modal from '../common/Modal';
import CameraPlaceholder from './CameraPlaceholder';
import MobileCameraFeed from './MobileCameraFeed';
import RiskBadge from '../common/RiskBadge';
import StatusBadge from '../common/StatusBadge';
import MonitoringTimeline from './MonitoringTimeline';
import { getMobileConnectionStatus, subscribeToMobileCameraStatus } from '../../services/mobileCamera';
import { subscribeToExaminerMobileStatus } from '../../services/websocket';

export default function CandidateDetailModal({ candidate, isOpen, onClose }) {
  const [actionNotice, setActionNotice] = useState('');
  const [activeCamTab, setActiveCamTab] = useState('dual'); // 'dual' | 'laptop' | 'mobile'
  const [mobileConnected, setMobileConnected] = useState(false);

  const sessionId = candidate?.sessionId || candidate?.id;

  useEffect(() => {
    if (!isOpen || !sessionId) return;

    // Fetch initial status
    getMobileConnectionStatus(sessionId)
      .then((res) => {
        if (res && typeof res.mobileConnected === 'boolean') {
          setMobileConnected(res.mobileConnected);
        }
      })
      .catch(() => {});

    // Listen to session-specific mobile status
    const unsubSession = subscribeToMobileCameraStatus(sessionId, (data) => {
      if (data && typeof data.mobileConnected === 'boolean') {
        setMobileConnected(data.mobileConnected);
      }
    });

    // Also listen to general examiner mobile status topic
    const unsubExaminer = subscribeToExaminerMobileStatus((data) => {
      if (
        data &&
        (data.sessionId === sessionId || (candidate?.id && data.candidateId === candidate.id))
      ) {
        setMobileConnected(data.mobileConnected);
      }
    });

    return () => {
      if (unsubSession) unsubSession();
      if (unsubExaminer) unsubExaminer();
    };
  }, [isOpen, sessionId, candidate?.id]);

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
      maxWidth="920px"
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
      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: '20px' }}>
        {/* Left Column: Dual Live Feeds & Telemetry */}
        <div>
          {/* Dual Camera Selection Tabs */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
              backgroundColor: '#f1f5f9',
              padding: '4px',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setActiveCamTab('dual')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: activeCamTab === 'dual' ? '#ffffff' : 'transparent',
                  color: activeCamTab === 'dual' ? 'var(--pt-navy-900)' : '#64748b',
                  boxShadow: activeCamTab === 'dual' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Dual Camera View
              </button>
              <button
                type="button"
                onClick={() => setActiveCamTab('laptop')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: activeCamTab === 'laptop' ? '#ffffff' : 'transparent',
                  color: activeCamTab === 'laptop' ? 'var(--pt-navy-900)' : '#64748b',
                  boxShadow: activeCamTab === 'laptop' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Laptop Webcam
              </button>
              <button
                type="button"
                onClick={() => setActiveCamTab('mobile')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: activeCamTab === 'mobile' ? '#ffffff' : 'transparent',
                  color: activeCamTab === 'mobile' ? 'var(--pt-navy-900)' : '#64748b',
                  boxShadow: activeCamTab === 'mobile' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Mobile Camera
              </button>
            </div>

            {/* Mobile Connection Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', paddingRight: '6px' }}>
              {mobileConnected ? (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Wifi size={11} color="#059669" /> Mobile Paired
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <WifiOff size={11} color="#dc2626" /> Mobile Disconnected
                </span>
              )}
            </div>
          </div>

          {/* Disconnection Alert Banner if mobile is not connected */}
          {!mobileConnected && (
            <div
              style={{
                marginBottom: '10px',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                fontSize: '11px',
                color: '#b91c1c',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 600,
              }}
            >
              <AlertTriangle size={13} color="#dc2626" />
              <span>Secondary camera alert: Smartphone connection is currently disconnected.</span>
            </div>
          )}

          {/* Camera Viewports */}
          <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(activeCamTab === 'dual' || activeCamTab === 'laptop') && (
              <div>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    color: 'var(--pt-navy-800)',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Video size={12} /> Primary Camera – Laptop Webcam
                  </span>
                  <span style={{ fontSize: '9px', color: '#059669', fontWeight: 700 }}>LIVE WEBCAM</span>
                </div>
                <CameraPlaceholder
                  candidateName={candidate.candidate}
                  risk={candidate.risk}
                  aspectRatio={activeCamTab === 'dual' ? '16/9' : '16/10'}
                />
              </div>
            )}

            {(activeCamTab === 'dual' || activeCamTab === 'mobile') && (
              <div>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    color: 'var(--pt-navy-800)',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Smartphone size={12} /> Secondary Camera – Mobile Phone
                  </span>
                  <span
                    style={{
                      fontSize: '9px',
                      color: mobileConnected ? '#059669' : '#dc2626',
                      fontWeight: 700,
                    }}
                  >
                    {mobileConnected ? 'WEBRTC READY' : 'DISCONNECTED'}
                  </span>
                </div>
                <MobileCameraFeed
                  sessionId={sessionId}
                  mobileConnected={mobileConnected}
                  candidateName={candidate.candidate}
                />
              </div>
            )}
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
              border: '1px solid #e2e8f0',
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
                Dual-Cam Coverage
              </span>
              <div style={{ marginTop: '4px' }}>
                {mobileConnected ? (
                  <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac', borderRadius: '4px', padding: '2px 8px' }}>
                    DUAL ACTIVE (2/2)
                  </span>
                ) : (
                  <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', borderRadius: '4px', padding: '2px 8px' }}>
                    PARTIAL (1/2 LAPTOP ONLY)
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
                <span style={{ color: '#475569' }}>Primary Laptop Webcam:</span>
                <span style={{ fontWeight: 600, color: '#059669' }}>Active / Verified</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#475569' }}>Secondary Mobile Feed:</span>
                <span style={{ fontWeight: 600, color: mobileConnected ? '#059669' : '#dc2626' }}>
                  {mobileConnected ? 'Paired & Streaming' : 'Disconnected'}
                </span>
              </div>

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
