import { useState, useEffect, useMemo } from 'react';
import { Filter, Users, ShieldAlert, CheckCircle2, ArrowUpDown } from 'lucide-react';
import CandidateMonitorCard from '../components/monitoring/CandidateMonitorCard';
import CandidateDetailModal from '../components/monitoring/CandidateDetailModal';
import SearchBar from '../components/common/SearchBar';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { getActiveCandidates } from '../services/api';

export default function LiveMonitoring() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [sortBy, setSortBy] = useState('risk-desc');

  useEffect(() => {
    async function loadCandidates() {
      try {
        const data = await getActiveCandidates();
        setCandidates(data);
      } catch (err) {
        console.error('Error fetching live candidates:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCandidates();
  }, []);

  // Filter and search logic
  const filteredCandidates = useMemo(() => {
    let list = [...candidates];

    // Filter by risk tier
    if (activeFilter === 'Normal') {
      list = list.filter((c) => c.risk === 'Low');
    } else if (activeFilter === 'Warning') {
      list = list.filter((c) => c.risk === 'Medium');
    } else if (activeFilter === 'High Risk') {
      list = list.filter((c) => c.risk === 'High');
    }

    // Search by name or exam
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (c) =>
          c.candidate.toLowerCase().includes(term) ||
          c.exam.toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term)
      );
    }

    // Sort
    if (sortBy === 'risk-desc') {
      list.sort((a, b) => b.riskScore - a.riskScore);
    } else if (sortBy === 'risk-asc') {
      list.sort((a, b) => a.riskScore - b.riskScore);
    } else if (sortBy === 'name') {
      list.sort((a, b) => a.candidate.localeCompare(b.candidate));
    }

    return list;
  }, [candidates, activeFilter, searchTerm, sortBy]);

  const countSummary = useMemo(() => {
    return {
      all: candidates.length,
      normal: candidates.filter((c) => c.risk === 'Low').length,
      warning: candidates.filter((c) => c.risk === 'Medium').length,
      high: candidates.filter((c) => c.risk === 'High').length
    };
  }, [candidates]);

  if (loading) {
    return <LoadingSpinner text="Connecting to active live video feeds..." size={36} />;
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner & Telemetry Stats */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          backgroundColor: '#ffffff',
          padding: '20px 24px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          borderTop: '3px solid var(--pt-navy-800)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--pt-navy-900)', margin: 0, letterSpacing: '-0.02em' }}>
              ProctorLive™ Invigilation Grid
            </h2>
            <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: '4px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', letterSpacing: '0.04em' }}>● STREAMING</span>
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '3px', margin: 0 }}>
            Multi-feed biometric webcam supervision with ProctorAuto™ ML behavioral scoring
          </p>
        </div>

        {/* Live Counters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#ecfdf5',
              padding: '6px 12px',
              borderRadius: '7px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#047857',
              border: '1px solid #a7f3d0'
            }}
          >
            <CheckCircle2 size={14} />
            <span>{countSummary.normal} Verified Clean</span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#fff7ed',
              padding: '6px 12px',
              borderRadius: '7px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#c2410c',
              border: '1px solid #fed7aa'
            }}
          >
            <Filter size={14} />
            <span>{countSummary.warning} Under Review</span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#fef2f2',
              padding: '6px 12px',
              borderRadius: '7px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#b91c1c',
              border: '1px solid #fecaca'
            }}
          >
            <ShieldAlert size={14} />
            <span>{countSummary.high} PEEP Incident</span>
          </div>
        </div>
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
        {/* Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { label: 'All', count: countSummary.all },
            { label: 'Normal', count: countSummary.normal },
            { label: 'Warning', count: countSummary.warning },
            { label: 'High Risk', count: countSummary.high }
          ].map((f) => (
            <button
              key={f.label}
              type="button"
              onClick={() => setActiveFilter(f.label)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '7px',
                fontSize: '12.5px',
                fontWeight: activeFilter === f.label ? 700 : 500,
                border: '1px solid',
                borderColor: activeFilter === f.label ? 'var(--pt-navy-800)' : 'var(--border-subtle)',
                backgroundColor: activeFilter === f.label ? 'var(--pt-navy-800)' : '#ffffff',
                color: activeFilter === f.label ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{f.label}</span>
              <span
                style={{
                  fontSize: '11px',
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  backgroundColor: activeFilter === f.label ? 'rgba(255,255,255,0.25)' : 'var(--bg-app)',
                  color: activeFilter === f.label ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: 700
                }}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search candidate or exam..."
            maxWidth="260px"
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowUpDown size={15} color="#64748b" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="form-select"
              style={{ padding: '7px 12px', fontSize: '13px' }}
            >
              <option value="risk-desc">Sort: Highest Risk</option>
              <option value="risk-asc">Sort: Lowest Risk</option>
              <option value="name">Sort: Candidate Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* Candidates Grid */}
      {filteredCandidates.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Users}
            title="No Candidates Found"
            description="No active candidates matched your current filter criteria."
            actionText="Reset Filters"
            onAction={() => {
              setActiveFilter('All');
              setSearchTerm('');
            }}
          />
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px'
          }}
        >
          {filteredCandidates.map((candidate) => (
            <CandidateMonitorCard
              key={candidate.id}
              candidate={candidate}
              onMonitor={(c) => setSelectedCandidate(c)}
            />
          ))}
        </div>
      )}

      {/* Detailed Candidate Modal */}
      <CandidateDetailModal
        candidate={selectedCandidate}
        isOpen={Boolean(selectedCandidate)}
        onClose={() => setSelectedCandidate(null)}
      />
    </div>
  );
}
