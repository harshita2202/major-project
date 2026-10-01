/**
 * QuestionNavigator.jsx
 * Grid of numbered buttons for direct question navigation.
 *
 * Props:
 *   totalQuestions   number
 *   currentIndex     number (0-based)
 *   answers          { [questionId]: number } — answered question IDs
 *   questions        Array of question objects (for id lookup)
 *   onNavigate       (index: number) => void
 */
export default function QuestionNavigator({
  totalQuestions,
  currentIndex,
  answers,
  questions,
  onNavigate,
}) {
  const getState = (idx) => {
    if (idx === currentIndex) return 'current';
    const qId = questions[idx]?.id;
    if (answers[qId] !== undefined && answers[qId] !== '') return 'answered';
    return 'unanswered';
  };

  const stateStyles = {
    current: {
      backgroundColor: 'var(--pt-navy-800)',
      color: '#ffffff',
      borderColor: 'var(--pt-navy-800)',
      fontWeight: 800,
      boxShadow: '0 0 0 3px rgba(15,43,72,0.2)',
    },
    answered: {
      backgroundColor: '#ecfdf5',
      color: '#047857',
      borderColor: '#a7f3d0',
      fontWeight: 700,
    },
    unanswered: {
      backgroundColor: '#ffffff',
      color: 'var(--text-secondary)',
      borderColor: 'var(--border-subtle)',
      fontWeight: 500,
    },
  };

  const answeredCount = Object.values(answers).filter(
    (v) => v !== undefined && v !== ''
  ).length;
  const unansweredCount = totalQuestions - answeredCount;

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px 10px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface-subtle)',
        }}
      >
        <div
          style={{
            fontSize: '12px',
            fontWeight: 800,
            color: 'var(--pt-navy-800)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}
        >
          Question Navigator
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {[
            { label: 'Current', bg: 'var(--pt-navy-800)', color: '#fff', border: 'var(--pt-navy-800)' },
            { label: 'Answered', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
            { label: 'Pending', bg: '#fff', color: 'var(--text-secondary)', border: 'var(--border-subtle)' },
          ].map(({ label, bg, color, border }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span
                style={{
                  width: '13px',
                  height: '13px',
                  borderRadius: '3px',
                  backgroundColor: bg,
                  border: `1.5px solid ${border}`,
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: '10.5px', color, fontWeight: 600 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Question grid */}
      <div
        style={{
          padding: '14px 14px 10px',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '6px',
        }}
      >
        {Array.from({ length: totalQuestions }, (_, idx) => {
          const state = getState(idx);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onNavigate(idx)}
              title={`Question ${idx + 1}${state === 'answered' ? ' (Answered)' : ''}`}
              style={{
                width: '100%',
                aspectRatio: '1',
                borderRadius: '7px',
                border: '1.5px solid',
                cursor: 'pointer',
                fontSize: '12px',
                transition: 'all 0.12s ease',
                outline: 'none',
                ...stateStyles[state],
              }}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Summary bar */}
      <div
        style={{
          padding: '10px 16px 14px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: '16px',
        }}
      >
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#047857' }}>
            {answeredCount}
          </div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
            Answered
          </div>
        </div>
        <div
          style={{
            width: '1px',
            backgroundColor: 'var(--border-subtle)',
            alignSelf: 'stretch',
          }}
        />
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-secondary)' }}>
            {unansweredCount}
          </div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
            Pending
          </div>
        </div>
      </div>
    </div>
  );
}
