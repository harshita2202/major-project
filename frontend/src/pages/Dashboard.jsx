import { useState, useEffect, useMemo } from 'react';
import { BookOpen, Users, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import RecentMalpracticesGraph from '../components/dashboard/RecentMalpracticesGraph';
import MalpracticeBreakdown from '../components/dashboard/MalpracticeBreakdown';
import ActiveExamsCard from '../components/dashboard/ActiveExamsCard';
import StudentWiseLogsCard from '../components/dashboard/StudentWiseLogsCard';
import QuickActions from '../components/dashboard/QuickActions';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  getDashboardStats,
  getExams,
  getAllViolations,
  getActiveCandidates,
} from '../services/api';

/**
 * Dashboard.jsx
 * Redesigned University Examination & Invigilation Dashboard.
 *
 * Clean, minimal, professional layout:
 * 1. Header (Clean university title, sync trigger, live status)
 * 2. 4 Simplified KPI Cards: [Active Exams] [Active Students] [Total Malpractices] [Completed Exams]
 * 3. [ Recent Malpractices — Graph ] (Incidents over time with line/bar toggle and summary metrics)
 * 4. Split section: [ Malpractice Breakdown ] and [ Active Exams ]
 * 5. [ Student-Wise Logs & Evidence ] (Student logs with multiple-faces screenshot previews)
 * 6. [ Quick Actions ] (Direct access to Live Invigilation, Scheduling, Logs, Reports)
 */
export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [exams, setExams] = useState([]);
  const [violations, setViolations] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [lastSyncTime, setLastSyncTime] = useState('');

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [statsRes, examsRes, violationsRes, candidatesRes] = await Promise.all([
        getDashboardStats(),
        getExams(),
        getAllViolations(),
        getActiveCandidates(),
      ]);
      setStats(statsRes);
      setExams(Array.isArray(examsRes) ? examsRes : []);
      setViolations(Array.isArray(violationsRes) ? violationsRes : []);
      setCandidates(Array.isArray(candidatesRes) ? candidatesRes : []);
      setLastSyncTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData(false);
    setIsRefreshing(false);
  };

  // ── Derived KPI Metrics ──────────────────────────────────────────────────
  const activeExamsCount = useMemo(() => {
    const count = exams.filter((e) =>
      ['active', 'in-progress', 'live', 'upcoming'].includes((e.status || '').toLowerCase())
    ).length;
    return count > 0 ? count : (stats?.activeExams?.value || 3);
  }, [exams, stats]);

  const activeStudentsCount = useMemo(() => {
    return candidates.filter((c) => (c.status || '').toLowerCase() === 'active').length;
  }, [candidates]);

  const totalMalpracticesCount = useMemo(() => {
    return violations.length;
  }, [violations]);

  const completedExamsCount = useMemo(() => {
    return exams.filter((e) =>
      ['completed', 'finished'].includes((e.status || '').toLowerCase())
    ).length;
  }, [exams]);

  if (loading) {
    return <LoadingSpinner text="Loading examination dashboard..." size={36} />;
  }

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        maxWidth: '1440px',
        margin: '0 auto',
      }}
    >
      {/* 1. Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          paddingBottom: '4px',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#0f172a',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Examination Dashboard
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            Real-time university invigilation overview, threat intelligence, and proctoring telemetry.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastSyncTime && (
            <span
              style={{
                fontSize: '12px',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  display: 'inline-block',
                }}
              />
              Synced at {lastSyncTime}
            </span>
          )}

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Refreshing...' : 'Sync Telemetry'}</span>
          </button>
        </div>
      </div>

      {/* 2. Simplified 4 KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        <StatCard
          title="Active Exams"
          value={activeExamsCount}
          icon={BookOpen}
          accentColor="#0f2b48"
          iconBg="#f0f7ff"
          subtext="Scheduled & live sessions"
        />

        <StatCard
          title="Active Students"
          value={activeStudentsCount}
          icon={Users}
          accentColor="#2563eb"
          iconBg="#eff6ff"
          subtext="Candidates currently taking tests"
        />

        <StatCard
          title="Total Malpractices"
          value={totalMalpracticesCount}
          icon={ShieldAlert}
          accentColor="#d97706"
          iconBg="#fffbeb"
          subtext="Detected infractions"
        />

        <StatCard
          title="Completed Exams"
          value={completedExamsCount}
          icon={CheckCircle2}
          accentColor="#059669"
          iconBg="#ecfdf5"
          subtext="Finished university tests"
        />
      </div>

      {/* 3. [ Recent Malpractices — Graph ] */}
      <div>
        <RecentMalpracticesGraph violations={violations} />
      </div>

      {/* 4. [ Malpractice Breakdown ] [ Active Exams ] */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '20px',
        }}
      >
        <MalpracticeBreakdown violations={violations} />
        <ActiveExamsCard exams={exams} />
      </div>

      {/* 5. [ Student-Wise Logs & Evidence ] */}
      <div>
        <StudentWiseLogsCard violations={violations} candidates={candidates} />
      </div>

      {/* 6. [ Quick Actions ] */}
      <div style={{ marginTop: '4px' }}>
        <QuickActions />
      </div>
    </div>
  );
}
