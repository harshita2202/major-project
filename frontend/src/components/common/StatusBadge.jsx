
/**
 * Reusable StatusBadge component
 * Supports standard proctoring statuses: Live, Upcoming, Completed, Online, Offline, Monitoring, Warning
 */
export default function StatusBadge({ status, size = 'md' }) {
  const normalized = (status || '').toLowerCase();

  let badgeClass = 'badge-neutral';
  let label = status;

  if (['live', 'online', 'monitoring', 'active'].includes(normalized)) {
    badgeClass = 'badge-success';
  } else if (['upcoming', 'scheduled', 'under review', 'investigating'].includes(normalized)) {
    badgeClass = 'badge-info';
  } else if (['warning', 'flagged', 'medium'].includes(normalized)) {
    badgeClass = 'badge-warning';
  } else if (['danger', 'disqualified', 'offline', 'high'].includes(normalized)) {
    badgeClass = 'badge-danger';
  } else if (['completed', 'resolved', 'dismissed'].includes(normalized)) {
    badgeClass = 'badge-neutral';
  }

  const paddingStyle = size === 'sm' ? { padding: '2px 8px', fontSize: '11px' } : {};

  return (
    <span className={`badge ${badgeClass}`} style={paddingStyle}>
      <span className="badge-dot"></span>
      <span>{label}</span>
    </span>
  );
}
