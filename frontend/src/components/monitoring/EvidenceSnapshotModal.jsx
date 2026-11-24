import { useState } from 'react';
import { Camera, ZoomIn, ZoomOut, Download, AlertOctagon, CheckCircle2, X } from 'lucide-react';
import Modal from '../common/Modal';

export default function EvidenceSnapshotModal({ evidence, isOpen, onClose }) {
  const [isZoomed, setIsZoomed] = useState(false);

  if (!evidence) return null;

  const handleDownload = () => {
    if (!evidence.snapshot) return;
    const link = document.createElement('a');
    link.href = evidence.snapshot;
    const safeName = (evidence.candidateName || evidence.studentId || 'evidence').replace(/\s+/g, '_');
    link.download = `${safeName}_multiple_faces_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Proctoring Evidence: Multiple Faces Detected"
      subtitle={`Candidate: ${evidence.candidateName || evidence.candidateId || 'Student'} • Time: ${evidence.timestamp || evidence.time || 'Recorded Time'}`}
      maxWidth="780px"
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>
            <AlertOctagon size={15} color="#dc2626" />
            <span>High Severity Biometric Infraction Recorded in Audit Log</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsZoomed(!isZoomed)}
            >
              {isZoomed ? <ZoomOut size={14} /> : <ZoomIn size={14} />}
              {isZoomed ? 'Reset Zoom' : 'Inspect Zoom'}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleDownload}
            >
              <Download size={14} /> Download Evidence
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Screenshot Viewport */}
        <div
          style={{
            position: 'relative',
            backgroundColor: '#0a0f1d',
            borderRadius: '10px',
            overflow: 'hidden',
            border: '2px solid #ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '340px',
            maxHeight: isZoomed ? '620px' : '420px',
            transition: 'max-height 0.25s ease',
          }}
        >
          {evidence.snapshot ? (
            <img
              src={evidence.snapshot}
              alt="Multiple Faces Evidence"
              style={{
                width: isZoomed ? '135%' : '100%',
                maxHeight: isZoomed ? 'none' : '420px',
                objectFit: 'contain',
                cursor: isZoomed ? 'zoom-out' : 'zoom-in',
                transition: 'width 0.2s ease',
              }}
              onClick={() => setIsZoomed(!isZoomed)}
            />
          ) : (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
              <Camera size={38} style={{ opacity: 0.5, marginBottom: '8px' }} />
              <div>No snapshot image available for this event.</div>
            </div>
          )}

          {/* Timestamp Watermark Overlay */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              color: '#ffffff',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: 'var(--font-mono, monospace)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
            TIMESTAMP: {evidence.timestamp || evidence.time || 'N/A'}
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              backgroundColor: 'rgba(220, 38, 38, 0.9)',
              color: '#ffffff',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            FLAGGED: MULTIPLE FACES
          </div>
        </div>

        {/* Telemetry Breakdown Details */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px 14px',
          }}
        >
          <div>
            <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
              Student ID
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
              {evidence.candidateId || evidence.studentId || 'STU001'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
              Violation Type
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626', marginTop: '2px' }}>
              {evidence.eventType || evidence.type || 'MULTIPLE_FACES'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
              Severity Level
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#b91c1c', marginTop: '2px' }}>
              CRITICAL / HIGH
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
              Risk Score Penalty
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626', marginTop: '2px' }}>
              +{evidence.pointsAdded || 30} Points
            </div>
          </div>
        </div>

        {/* Details description */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            fontSize: '12.5px',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertOctagon size={16} color="#dc2626" style={{ flexShrink: 0 }} />
          <span>
            {evidence.details ||
              'Multiple faces detected in candidate camera frame. Another individual appeared in the primary webcam view.'}
          </span>
        </div>
      </div>
    </Modal>
  );
}
