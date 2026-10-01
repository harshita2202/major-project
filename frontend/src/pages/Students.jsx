import { useState, useEffect, useMemo } from 'react';
import { Users, ChevronLeft, ChevronRight } from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import RiskBadge from '../components/common/RiskBadge';
import SearchBar from '../components/common/SearchBar';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { getStudents } from '../services/api';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    async function loadStudents() {
      try {
        const data = await getStudents();
        setStudents(data);
      } catch (err) {
        console.error('Failed to load students:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    let list = [...students];

    if (statusFilter !== 'All') {
      list = list.filter((s) => s.status.toLowerCase() === statusFilter.toLowerCase());
    }

    if (riskFilter !== 'All') {
      list = list.filter((s) => s.riskLevel.toLowerCase() === riskFilter.toLowerCase());
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.email.toLowerCase().includes(term) ||
          s.exam.toLowerCase().includes(term)
      );
    }

    return list;
  }, [students, statusFilter, riskFilter, searchTerm]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage]);

  if (loading) {
    return <LoadingSpinner text="Fetching candidate directory..." size={36} />;
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--pt-navy-900)', margin: 0, letterSpacing: '-0.02em' }}>
          Candidate Enrollment & ProctorID™ Directory
        </h2>
        <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '3px', margin: 0 }}>
          Biometric profiles, identity verification records, and ProctorTrack™ compliance ratings
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Status:</span>
            {['All', 'Online', 'Offline', 'Completed'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setStatusFilter(st);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '7px',
                  fontSize: '12px',
                  fontWeight: statusFilter === st ? 700 : 500,
                  border: '1px solid',
                  borderColor: statusFilter === st ? 'var(--pt-navy-800)' : 'var(--border-subtle)',
                  backgroundColor: statusFilter === st ? 'var(--pt-navy-800)' : '#ffffff',
                  color: statusFilter === st ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Risk Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Risk:</span>
            {['All', 'Low', 'Medium', 'High'].map((rk) => (
              <button
                key={rk}
                type="button"
                onClick={() => {
                  setRiskFilter(rk);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '7px',
                  fontSize: '12px',
                  fontWeight: riskFilter === rk ? 700 : 500,
                  border: '1px solid',
                  borderColor: riskFilter === rk ? 'var(--pt-navy-800)' : 'var(--border-subtle)',
                  backgroundColor: riskFilter === rk ? 'var(--pt-navy-800)' : '#ffffff',
                  color: riskFilter === rk ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                {rk}
              </button>
            ))}
          </div>
        </div>

        <SearchBar
          value={searchTerm}
          onChange={(val) => {
            setSearchTerm(val);
            setCurrentPage(1);
          }}
          placeholder="Search by student name or email..."
          maxWidth="280px"
        />
      </div>

      {/* Students Table */}
      <div className="card">
        {filteredStudents.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Candidates Found"
            description="No candidates matched your search criteria."
            actionText="Reset Filters"
            onAction={() => {
              setStatusFilter('All');
              setRiskFilter('All');
              setSearchTerm('');
            }}
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Registered Exam</th>
                  <th>Status</th>
                  <th>Risk Level</th>
                  <th>Last Activity</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="avatar-circle">
                          {s.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{s.name}</div>
                          <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500, color: '#334155' }}>{s.exam}</span>
                    </td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                    <td>
                      <RiskBadge level={s.riskLevel} />
                    </td>
                    <td>
                      <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                        {s.lastActivity}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" className="btn btn-secondary btn-sm">
                        Audit Log
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {filteredStudents.length > 0 && (
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc',
              fontSize: '13px',
              color: '#64748b'
            }}
          >
            <div>
              Showing{' '}
              <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> to{' '}
              <strong>{Math.min(currentPage * itemsPerPage, filteredStudents.length)}</strong> of{' '}
              <strong>{filteredStudents.length}</strong> candidates
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
