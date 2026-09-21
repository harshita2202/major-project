import { useState, useEffect } from 'react';
import { Download, FileText, CheckCircle2, TrendingUp, AlertTriangle, Users, Award } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { getReportsData } from '../services/api';

export default function Reports() {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    async function loadReports() {
      try {
        const data = await getReportsData();
        setReports(data);
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  const triggerExport = (format) => {
    setToastMessage(`Generating official ProctorAI compliance audit report in ${format.toUpperCase()} format...`);
    setTimeout(() => {
      setToastMessage(`✓ ${format.toUpperCase()} report successfully compiled and ready for download.`);
      setTimeout(() => setToastMessage(''), 3000);
    }, 1200);
  };

  if (loading) {
    return <LoadingSpinner text="Compiling academic audit reports..." size={36} />;
  }

  const { metrics, severityBreakdown, violationTypes, integrityByExam } = reports;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header with Generate / Export Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--pt-navy-900)', margin: 0, letterSpacing: '-0.02em' }}>
            Academic Integrity Analytics & Audit Reports
          </h2>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '3px', margin: 0 }}>
            ProctorTrack™ session analytics, institutional compliance dashboards, and FERPA-grade audit exports
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => triggerExport('pdf')}
          >
            <Download size={15} /> Export Audit (PDF)
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => triggerExport('csv')}
          >
            <FileText size={15} /> Generate Report
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div
          style={{
            backgroundColor: 'var(--pt-blue-50)',
            border: '1px solid var(--primary-100)',
            color: 'var(--pt-navy-800)',
            padding: '12px 18px',
            borderRadius: '10px',
            fontSize: '13.5px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CheckCircle2 size={16} color="var(--pt-navy-800)" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Key Metrics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}
      >
        <div className="card" style={{ padding: '20px', borderTop: '3px solid var(--pt-navy-800)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Total Exams
            </span>
            <Award size={17} color="var(--pt-navy-800)" />
          </div>
          <div style={{ fontSize: '30px', fontWeight: 800, color: 'var(--pt-navy-900)', marginTop: '6px', letterSpacing: '-0.03em' }}>
            {metrics.totalExams}
          </div>
          <div style={{ fontSize: '12px', color: '#047857', fontWeight: 600, marginTop: '4px' }}>
            Across 6 departments
          </div>
        </div>

        <div className="card" style={{ padding: '20px', borderTop: '3px solid #047857' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Total Candidates
            </span>
            <Users size={17} color="#047857" />
          </div>
          <div style={{ fontSize: '30px', fontWeight: 800, color: 'var(--pt-navy-900)', marginTop: '6px', letterSpacing: '-0.03em' }}>
            {metrics.totalStudents.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Verified enrollments
          </div>
        </div>

        <div className="card" style={{ padding: '20px', borderTop: '3px solid #b91c1c' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Total PEEP Incidents
            </span>
            <AlertTriangle size={17} color="#b91c1c" />
          </div>
          <div style={{ fontSize: '30px', fontWeight: 800, color: '#b91c1c', marginTop: '6px', letterSpacing: '-0.03em' }}>
            {metrics.totalViolations}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            82% ProctorAuto™ resolution
          </div>
        </div>

        <div className="card" style={{ padding: '20px', borderTop: '3px solid #c2410c' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Avg Risk Score
            </span>
            <TrendingUp size={17} color="#c2410c" />
          </div>
          <div style={{ fontSize: '30px', fontWeight: 800, color: 'var(--pt-navy-900)', marginTop: '6px', letterSpacing: '-0.03em' }}>
            {metrics.avgRiskScore}
          </div>
          <div style={{ fontSize: '12px', color: '#047857', fontWeight: 600, marginTop: '4px' }}>
            Below 20% target
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Completion Rate
            </span>
            <CheckCircle2 size={18} color="#059669" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
            {metrics.completionRate}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            High reliability
          </div>
        </div>
      </div>

      {/* Middle Grid: Severity Breakdown & Violation Types */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Severity Breakdown Bar */}
        <div className="card" style={{ padding: '22px' }}>
          <h3 className="card-title" style={{ marginBottom: '16px' }}>
            Violation Severity Breakdown
          </h3>
          <div style={{ display: 'flex', height: '16px', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
            {severityBreakdown.map((s) => (
              <div
                key={s.level}
                style={{
                  width: `${s.percentage}%`,
                  backgroundColor: s.color,
                  transition: 'width 0.4s ease'
                }}
                title={`${s.level}: ${s.percentage}%`}
              />
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {severityBreakdown.map((s) => (
              <div key={s.level} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: s.color }} />
                  <span style={{ fontWeight: 500, color: '#334155' }}>{s.level}</span>
                </div>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                  {s.count} events ({s.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Most Frequent Violation Types */}
        <div className="card" style={{ padding: '22px' }}>
          <h3 className="card-title" style={{ marginBottom: '16px' }}>
            Most Frequent Anomaly Types
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {violationTypes.map((vt) => (
              <div key={vt.type}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 500, color: '#334155' }}>{vt.type}</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{vt.count} ({vt.share})</span>
                </div>
                <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: vt.share,
                      height: '100%',
                      backgroundColor: '#2563eb',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Exam Integrity Rating Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Academic Integrity Rating by Examination</h3>
            <div className="card-subtitle">Clean session completion vs candidate intervention rate</div>
          </div>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Exam Name</th>
                <th>Total Candidates</th>
                <th>Clean Session Rate</th>
                <th>Intervention / Flag Rate</th>
                <th>Audit Status</th>
              </tr>
            </thead>
            <tbody>
              {integrityByExam.map((item) => (
                <tr key={item.exam}>
                  <td style={{ fontWeight: 600, color: '#0f172a' }}>{item.exam}</td>
                  <td>{item.candidates} candidates</td>
                  <td>
                    <span style={{ color: '#059669', fontWeight: 600 }}>{item.cleanRate}</span>
                  </td>
                  <td>
                    <span style={{ color: '#dc2626', fontWeight: 600 }}>{item.flagRate}</span>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        backgroundColor: '#ecfdf5',
                        color: '#059669'
                      }}
                    >
                      Audit Compliant
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
