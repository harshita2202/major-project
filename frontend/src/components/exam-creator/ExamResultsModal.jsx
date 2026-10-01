import { useState, useEffect } from 'react';
import {
  X,
  Users,
  Award,
  AlertTriangle,
  CheckCircle,
  Clock,
  ShieldAlert,
  Code2,
  HelpCircle,
  Eye,
  FileText,
  Activity,
  Maximize,
  Copy,
  Volume2
} from 'lucide-react';
import { getExamResults, getStudentExamResultDetail } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';

export default function ExamResultsModal({ isOpen, onClose, exam }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailTab, setDetailTab] = useState('coding'); // 'coding', 'mcq', 'proctoring'
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    if (!isOpen || !exam) return;
    setLoading(true);
    setError(null);
    setSelectedStudentDetail(null);

    getExamResults(exam.id)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.error('Failed to load exam results:', err);
        setError(err.message || 'Failed to load results');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, exam]);

  if (!isOpen || !exam) return null;

  const handleOpenStudentDetail = async (studentId) => {
    setLoadingDetail(true);
    try {
      const detail = await getStudentExamResultDetail(exam.id, studentId);
      setSelectedStudentDetail(detail);
      // Auto pick tab based on questions
      if (detail?.submission?.codingResults && detail.submission.codingResults.length > 0) {
        setDetailTab('coding');
      } else {
        setDetailTab('mcq');
      }
    } catch (err) {
      console.error('Failed to load student result detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const resultsList = data?.results || [];
  const summary = data?.summary || {
    assigned: 0,
    attempted: 0,
    completed: 0,
    unattempted: 0,
    avgScore: 0,
    highRisk: 0
  };

  const filteredResults = resultsList.filter((r) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'COMPLETED') return r.status === 'COMPLETED';
    if (statusFilter === 'DISQUALIFIED') return r.status === 'DISQUALIFIED' || r.autoSubmitted;
    if (statusFilter === 'UNATTEMPTED') return r.status === 'UNATTEMPTED';
    if (statusFilter === 'RISK') return (r.finalRiskScore || 0) >= 50 || r.cheatingFlag;
    return true;
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 28, 48, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          width: '100%',
          maxWidth: '1100px',
          maxHeight: '92vh',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            backgroundColor: 'var(--pt-navy-900)',
            color: '#ffffff',
            padding: '20px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--sidebar-border)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: 'rgba(38, 198, 218, 0.15)',
                border: '1px solid rgba(38, 198, 218, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Award size={22} color="#26c6da" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                  {exam.name || exam.title}
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  {exam.code}
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94b4cf' }}>
                Assessment Performance Analytics, Grading &amp; Proctoring Telemetry Roster
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#8eaec9',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <LoadingSpinner text="Compiling student submissions and risk telemetry..." size={36} />
            </div>
          ) : error ? (
            <div
              style={{
                padding: '20px',
                borderRadius: '10px',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <AlertTriangle size={20} />
              <span>{error}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* High Level KPI Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' }}>
                <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Assigned Candidates
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--pt-navy-900)', marginTop: '4px' }}>
                    {summary.assigned}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Total on roster</div>
                </div>

                <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>
                    Completed
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
                    {summary.completed}
                  </div>
                  <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px' }}>Submissions received</div>
                </div>

                <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Unattempted
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#475569', marginTop: '4px' }}>
                    {summary.unattempted}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Pending / Absent</div>
                </div>

                <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd' }}>
                  <div style={{ fontSize: '11px', color: '#0369a1', fontWeight: 600, textTransform: 'uppercase' }}>
                    Average Score
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#0284c7', marginTop: '4px' }}>
                    {summary.avgScore}%
                  </div>
                  <div style={{ fontSize: '11px', color: '#0369a1', marginTop: '2px' }}>Across evaluated attempts</div>
                </div>

                <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
                  <div style={{ fontSize: '11px', color: '#991b1b', fontWeight: 600, textTransform: 'uppercase' }}>
                    High Risk / Flagged
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>
                    {summary.highRisk}
                  </div>
                  <div style={{ fontSize: '11px', color: '#991b1b', marginTop: '2px' }}>Requires audit</div>
                </div>
              </div>

              {/* Roster Controls */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {[
                    { id: 'ALL', label: 'All Candidates' },
                    { id: 'COMPLETED', label: 'Completed' },
                    { id: 'RISK', label: 'High Risk / Flagged' },
                    { id: 'UNATTEMPTED', label: 'Unattempted' }
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setStatusFilter(filter.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: statusFilter === filter.id ? 700 : 500,
                        border: '1px solid',
                        borderColor: statusFilter === filter.id ? 'var(--pt-navy-800)' : 'var(--border-subtle)',
                        backgroundColor: statusFilter === filter.id ? 'var(--pt-navy-800)' : '#ffffff',
                        color: statusFilter === filter.id ? '#ffffff' : 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
                <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  Showing <strong>{filteredResults.length}</strong> candidates
                </span>
              </div>

              {/* Candidates Results Table */}
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '10px', overflow: 'hidden' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Student ID</th>
                      <th>Status</th>
                      <th>Marks Earned</th>
                      <th>MCQ / Coding</th>
                      <th>Risk Score</th>
                      <th>Risk Level</th>
                      <th>Auto-Submitted</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                          No candidates found matching selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredResults.map((r) => {
                        const isCompleted = r.status === 'COMPLETED';
                        const riskLevel = r.finalRiskLevel || 'LOW';
                        const riskScore = r.finalRiskScore ?? 0;
                        const isHighRisk = riskScore >= 70 || riskLevel === 'HIGH' || r.cheatingFlag;

                        return (
                          <tr key={r.studentId}>
                            <td>
                              <div>
                                <div style={{ fontWeight: 700, color: 'var(--pt-navy-900)' }}>{r.studentName}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{r.studentEmail}</div>
                              </div>
                            </td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{r.studentId}</td>
                            <td>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: isCompleted ? '#dcfce7' : r.status === 'DISQUALIFIED' ? '#fee2e2' : '#f1f5f9',
                                  color: isCompleted ? '#15803d' : r.status === 'DISQUALIFIED' ? '#b91c1c' : '#475569'
                                }}
                              >
                                {r.status}
                              </span>
                            </td>
                            <td>
                              {isCompleted ? (
                                <strong style={{ color: 'var(--pt-navy-900)', fontSize: '13px' }}>
                                  {r.score ?? 0} / {r.totalMarks || exam.totalMarks || 100}
                                </strong>
                              ) : (
                                <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                              )}
                            </td>
                            <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {isCompleted ? (
                                <span>
                                  {r.mcqScore ?? 0} pts (MCQ) · {r.codingScore ?? 0} pts (Code)
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td>
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontFamily: 'var(--font-mono)',
                                  color: isHighRisk ? '#dc2626' : riskScore >= 40 ? '#d97706' : '#16a34a'
                                }}
                              >
                                {riskScore} / 100
                              </span>
                            </td>
                            <td>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: isHighRisk ? '#fee2e2' : riskScore >= 40 ? '#fef3c7' : '#dcfce7',
                                  color: isHighRisk ? '#dc2626' : riskScore >= 40 ? '#b45309' : '#15803d'
                                }}
                              >
                                {riskLevel}
                              </span>
                            </td>
                            <td>
                              {r.autoSubmitted ? (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: '#b91c1c',
                                    backgroundColor: '#fee2e2',
                                    padding: '2px 6px',
                                    borderRadius: '4px'
                                  }}
                                >
                                  Yes
                                </span>
                              ) : (
                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>No</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {isCompleted ? (
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleOpenStudentDetail(r.studentId)}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                                >
                                  <Eye size={13} /> View Details
                                </button>
                              ) : (
                                <button type="button" className="btn btn-secondary btn-sm" disabled style={{ opacity: 0.5 }}>
                                  No Submission
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 28px',
            backgroundColor: '#ffffff',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end'
          }}
        >
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close Results
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          DRILL-DOWN SUBMISSION MODAL
      ══════════════════════════════════════════════════════════ */}
      {selectedStudentDetail && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              width: '100%',
              maxWidth: '900px',
              maxHeight: '88vh',
              borderRadius: '14px',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid var(--border-subtle)'
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '18px 24px',
                backgroundColor: 'var(--pt-navy-800)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>
                    Submission: {selectedStudentDetail.studentName}
                  </h3>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11.5px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(255, 255, 255, 0.15)'
                    }}
                  >
                    {selectedStudentDetail.studentId}
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94b4cf' }}>
                  Score: <strong>{selectedStudentDetail.submission?.score ?? 0} / {selectedStudentDetail.submission?.totalMarks ?? 100}</strong> · Risk Score:{' '}
                  <strong>{selectedStudentDetail.submission?.finalRiskScore ?? 0}/100</strong> ({selectedStudentDetail.submission?.finalRiskLevel ?? 'LOW'})
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudentDetail(null)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                padding: '10px 24px',
                backgroundColor: 'var(--bg-app)',
                borderBottom: '1px solid var(--border-subtle)'
              }}
            >
              <button
                type="button"
                onClick={() => setDetailTab('coding')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: detailTab === 'coding' ? 'var(--pt-navy-800)' : 'transparent',
                  color: detailTab === 'coding' ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                <Code2 size={14} /> Coding Problems &amp; Test Cases
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('mcq')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: detailTab === 'mcq' ? 'var(--pt-navy-800)' : 'transparent',
                  color: detailTab === 'mcq' ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                <HelpCircle size={14} /> MCQ Responses
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('proctoring')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: detailTab === 'proctoring' ? 'var(--pt-navy-800)' : 'transparent',
                  color: detailTab === 'proctoring' ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                <ShieldAlert size={14} /> Proctoring Telemetry
              </button>
            </div>

            {/* Drill-down Tab Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {/* CODING TAB */}
              {detailTab === 'coding' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {(!selectedStudentDetail.submission?.codingResults || selectedStudentDetail.submission.codingResults.length === 0) ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No coding problems were included or attempted in this examination.
                    </div>
                  ) : (
                    selectedStudentDetail.submission.codingResults.map((cr, idx) => {
                      const questionObj = (selectedStudentDetail.questions || []).find((q) => q.id === cr.questionId);
                      const submittedSourceCode = selectedStudentDetail.submission.answers?.[cr.questionId] || '// No code submitted';

                      return (
                        <div
                          key={cr.questionId || idx}
                          style={{
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '10px',
                            padding: '16px',
                            backgroundColor: '#ffffff',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <strong style={{ fontSize: '14px', color: 'var(--pt-navy-900)' }}>
                                {questionObj?.title || `Coding Challenge #${idx + 1}`}
                              </strong>
                              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {questionObj?.question}
                              </p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span
                                style={{
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  color: cr.passed === cr.total ? '#15803d' : '#b45309',
                                  backgroundColor: cr.passed === cr.total ? '#dcfce7' : '#fef3c7',
                                  padding: '3px 8px',
                                  borderRadius: '4px'
                                }}
                              >
                                {cr.passed} / {cr.total} Test Cases Passed ({cr.marksEarned} / {cr.totalMarks} Marks)
                              </span>
                            </div>
                          </div>

                          {/* Student Submitted Code */}
                          <div>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                              Submitted Solution:
                            </span>
                            <pre
                              style={{
                                marginTop: '4px',
                                padding: '12px',
                                borderRadius: '6px',
                                backgroundColor: '#0a1c30',
                                color: '#e2e8f0',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '12px',
                                overflowX: 'auto',
                                maxHeight: '200px'
                              }}
                            >
                              <code>{submittedSourceCode}</code>
                            </pre>
                          </div>

                          {/* Test Cases Results Breakdown */}
                          <div>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                              Automated Evaluation Breakdown:
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                              {(cr.testCaseResults || []).map((tcr, tcIdx) => (
                                <div
                                  key={tcIdx}
                                  style={{
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    backgroundColor: tcr.passed ? '#f0fdf4' : '#fef2f2',
                                    border: '1px solid',
                                    borderColor: tcr.passed ? '#bbf7d0' : '#fecaca',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    fontSize: '12px'
                                  }}
                                >
                                  <div>
                                    <span style={{ fontWeight: 700, color: tcr.passed ? '#15803d' : '#b91c1c' }}>
                                      {tcr.isSample ? '[Sample Case]' : '[Hidden Case]'}{' '}
                                      {tcr.passed ? '✓ PASSED' : '✗ FAILED'}
                                    </span>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                                      Input: {tcr.input} → Expected: {tcr.expectedOutput} | Actual: {tcr.actualOutput || 'N/A'}
                                    </div>
                                    {tcr.error && (
                                      <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '2px' }}>
                                        Error: {tcr.error}
                                      </div>
                                    )}
                                  </div>
                                  <span style={{ fontWeight: 700, color: 'var(--pt-navy-900)' }}>
                                    {tcr.passed ? `+${tcr.marks || 5} pts` : '0 pts'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* MCQ TAB */}
              {detailTab === 'mcq' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {(selectedStudentDetail.questions || []).filter((q) => q.type === 'mcq').length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No multiple-choice questions found in this assessment.
                    </div>
                  ) : (
                    (selectedStudentDetail.questions || [])
                      .filter((q) => q.type === 'mcq')
                      .map((q, idx) => {
                        const studentSelectedIdx = selectedStudentDetail.submission.answers?.[q.id];
                        const isCorrect = studentSelectedIdx !== undefined && Number(studentSelectedIdx) === Number(q.correctIndex);
                        let options = [];
                        try {
                          options = typeof q.optionsJson === 'string' ? JSON.parse(q.optionsJson) : (q.options || []);
                        } catch (e) {
                          options = q.options || [];
                        }

                        return (
                          <div
                            key={q.id || idx}
                            style={{
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '8px',
                              padding: '14px 16px',
                              backgroundColor: '#ffffff'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <strong style={{ fontSize: '13.5px', color: 'var(--pt-navy-900)' }}>
                                Q{idx + 1}: {q.question || q.title}
                              </strong>
                              <span
                                style={{
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  color: isCorrect ? '#15803d' : '#b91c1c',
                                  backgroundColor: isCorrect ? '#dcfce7' : '#fee2e2',
                                  padding: '2px 8px',
                                  borderRadius: '4px'
                                }}
                              >
                                {isCorrect ? `+${q.marks || 5} pts (Correct)` : '0 pts (Incorrect)'}
                              </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                              {options.map((opt, optIdx) => {
                                const wasSelected = Number(studentSelectedIdx) === optIdx;
                                const isTargetCorrect = Number(q.correctIndex) === optIdx;

                                return (
                                  <div
                                    key={optIdx}
                                    style={{
                                      padding: '6px 10px',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      backgroundColor: wasSelected && isTargetCorrect
                                        ? '#dcfce7'
                                        : wasSelected && !isTargetCorrect
                                        ? '#fee2e2'
                                        : isTargetCorrect
                                        ? '#f0fdf4'
                                        : 'var(--bg-app)',
                                      border: '1px solid',
                                      borderColor: wasSelected
                                        ? isTargetCorrect
                                          ? '#86efac'
                                          : '#fca5a5'
                                        : 'transparent',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between'
                                    }}
                                  >
                                    <span>
                                      <strong>{String.fromCharCode(65 + optIdx)}.</strong> {opt}
                                    </span>
                                    {wasSelected && (
                                      <span style={{ fontWeight: 700, fontSize: '11px', color: isTargetCorrect ? '#15803d' : '#b91c1c' }}>
                                        Student Answer
                                      </span>
                                    )}
                                    {!wasSelected && isTargetCorrect && (
                                      <span style={{ fontWeight: 700, fontSize: '11px', color: '#15803d' }}>
                                        Correct Key
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {q.explanation && (
                              <div style={{ marginTop: '8px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                                <strong>Explanation:</strong> {q.explanation}
                              </div>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              )}

              {/* PROCTORING TELEMETRY TAB */}
              {detailTab === 'proctoring' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {(() => {
                    const pSummary = selectedStudentDetail.submission?.proctoringSummary || {};
                    return (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total Infractions</div>
                            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--pt-navy-900)', marginTop: '2px' }}>
                              {pSummary.totalEvents ?? 0}
                            </div>
                          </div>
                          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Tab Switches</div>
                            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--pt-navy-900)', marginTop: '2px' }}>
                              {pSummary.tabSwitches ?? 0}
                            </div>
                          </div>
                          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Fullscreen Exits</div>
                            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--pt-navy-900)', marginTop: '2px' }}>
                              {pSummary.fullscreenExits ?? 0}
                            </div>
                          </div>
                          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Copy/Paste Interceptions</div>
                            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--pt-navy-900)', marginTop: '2px' }}>
                              {pSummary.copyInterceptions ?? 0}
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            padding: '14px 18px',
                            borderRadius: '8px',
                            backgroundColor: (pSummary.finalRiskScore || 0) >= 50 ? '#fef2f2' : '#f0fdf4',
                            border: '1px solid',
                            borderColor: (pSummary.finalRiskScore || 0) >= 50 ? '#fecaca' : '#bbf7d0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                          }}
                        >
                          <ShieldAlert size={20} color={(pSummary.finalRiskScore || 0) >= 50 ? '#dc2626' : '#16a34a'} />
                          <div>
                            <strong style={{ fontSize: '13px', color: (pSummary.finalRiskScore || 0) >= 50 ? '#991b1b' : '#166534' }}>
                              AI Proctoring Risk Verdict: {pSummary.riskLevel || 'LOW'} ({pSummary.finalRiskScore || 0}/100)
                            </strong>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {selectedStudentDetail.submission?.submissionReason || 'Assessment completed within nominal integrity bounds.'}
                            </p>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '12px 24px',
                backgroundColor: '#ffffff',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'flex-end'
              }}
            >
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedStudentDetail(null)}
              >
                Close Candidate Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
