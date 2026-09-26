import { useState, useEffect } from 'react';
import { BookOpen, Users, AlertTriangle, Activity, RefreshCw } from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import ActivityChart from '../components/dashboard/ActivityChart';
import RecentViolations from '../components/dashboard/RecentViolations';
import ActiveCandidates from '../components/dashboard/ActiveCandidates';
import CandidateDetailModal from '../components/monitoring/CandidateDetailModal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  getDashboardStats,
  getExamActivity,
  getRecentViolations,
  getActiveCandidates
} from '../services/api';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [activityData, setActivityData] = useState([]);
  const [violations, setViolations] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function loadInitialData() {
      try {
        const [statsRes, activityRes, violationsRes, candidatesRes] = await Promise.all([
          getDashboardStats(),
          getExamActivity(),
          getRecentViolations(),
          getActiveCandidates()
        ]);
        if (!ignore) {
          setStats(statsRes);
          setActivityData(activityRes);
          setViolations(violationsRes);
          setCandidates(candidatesRes || []);
        }
      } catch (err) {
        if (!ignore) console.error('Failed to load dashboard data:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadInitialData();
    return () => {
      ignore = true;
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [statsRes, activityRes, violationsRes, candidatesRes] = await Promise.all([
        getDashboardStats(),
        getExamActivity(),
        getRecentViolations(),
        getActiveCandidates()
      ]);
      setStats(statsRes);
      setActivityData(activityRes);
      setViolations(violationsRes);
      setCandidates(candidatesRes || []);
    } catch (err) {
      console.error('Failed to refresh dashboard data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Connecting to Proctortrack™ telemetry stream..." size={36} />;
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Top Operations Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--pt-navy-900)', margin: 0, letterSpacing: '-0.02em' }}>
              Proctortrack™ Operations Center
            </h2>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: '#ecfdf5',
                color: '#047857',
                border: '1px solid #a7f3d0'
              }}
            >
              Telemetry Live
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '3px', margin: 0 }}>
            Automated ProctorAuto™ ML supervision, live candidate verification, and PEEP integrity telemetry
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Telemetry'}</span>
          </button>
        </div>
      </div>

      {/* 4 Proctortrack KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '18px'
        }}
      >
        <StatCard
          title="Active Sessions"
          value={stats.activeExams.value}
          trend="+2 in session"
          isPositive={true}
          icon={BookOpen}
          accentColor="var(--pt-navy-800)"
          iconBg="var(--pt-blue-50)"
          borderTopColor="var(--pt-navy-800)"
          subtext="across Rutgers sections"
        />

        <StatCard
          title="Verified Candidates"
          value={stats.studentsOnline.value}
          trend="+18 today"
          isPositive={true}
          icon={Users}
          accentColor="#059669"
          iconBg="#ecfdf5"
          borderTopColor="#059669"
          subtext="ProctorID™ checked"
        />

        <StatCard
          title="PEEP Incidents Flagged"
          value={stats.activeAlerts.value}
          trend="5 require review"
          isPositive={false}
          icon={AlertTriangle}
          accentColor="#f78d2b"
          iconBg="#fff7ed"
          borderTopColor="#f78d2b"
          subtext="behavioral infractions"
        />

        <StatCard
          title="Integrity Trust Index"
          value="98.4%"
          trend="Accreditation Valid"
          isPositive={true}
          icon={Activity}
          accentColor="#0284c7"
          iconBg="#e0f2fe"
          borderTopColor="#0284c7"
          subtext="average institutional score"
        />
      </div>

      {/* Middle Section: Exam Activity Chart & Recent Violations */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '20px'
        }}
      >
        <div style={{ minHeight: '340px' }}>
          <ActivityChart data={activityData} />
        </div>
        <div style={{ minHeight: '340px' }}>
          <RecentViolations
            violations={violations}
            onSelectViolation={(v) => {
              const matched = candidates.find((c) => c.candidate === v.student);
              if (matched) setSelectedCandidate(matched);
            }}
          />
        </div>
      </div>

      {/* Bottom Section: Active Candidates Table */}
      <div>
        <ActiveCandidates
          candidates={candidates}
          onMonitorCandidate={(c) => setSelectedCandidate(c)}
        />
      </div>

      {/* Institutional System Status Banner */}
      <div className="system-status-bar">
        <div className="system-status-indicator">
          <span className="pulse-dot" />
          <span style={{ fontWeight: 700, color: 'var(--pt-navy-900)' }}>
            Proctortrack™ Invigilation Engine v4.8
          </span>
          <span style={{ color: 'var(--border-strong)' }}>•</span>
          <span style={{ color: 'var(--text-secondary)' }}>
            Biometric ML Models Active • Dual-Camera 360° Sync Operational • LTI 1.3 Canvas Bridge Ready
          </span>
        </div>
        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
          SOC-2 Type II Certified • NIST 800-53 Compliant
        </div>
      </div>

      {/* Detailed Candidate Modal */}
      <CandidateDetailModal
        candidate={selectedCandidate}
        isOpen={Boolean(selectedCandidate)}
        onClose={() => setSelectedCandidate(null)}
      />
    </div>
  );
}
