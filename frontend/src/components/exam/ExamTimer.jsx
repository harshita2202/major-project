import { useEffect, useRef } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';

/**
 * ExamTimer.jsx
 * Countdown timer for the student exam page.
 *
 * Props:
 *   timeRemainingSeconds (number) - current countdown value (controlled externally)
 *   onTick (function)             - called every second with (newSeconds)
 *   onExpire (function)           - called when timer reaches 0
 *   isRunning (boolean)           - whether the timer should count down
 */
export default function ExamTimer({ timeRemainingSeconds, onTick, onExpire, isRunning }) {
  const intervalRef = useRef(null);
  const secondsRef = useRef(timeRemainingSeconds);

  // Keep ref in sync with prop
  useEffect(() => {
    secondsRef.current = timeRemainingSeconds;
  }, [timeRemainingSeconds]);

  useEffect(() => {
    if (!isRunning) {
      clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      const next = secondsRef.current - 1;
      secondsRef.current = next;
      onTick(next);
      if (next <= 0) {
        clearInterval(intervalRef.current);
        onExpire();
      }
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isRunning, onTick, onExpire]);

  const minutes = Math.floor(timeRemainingSeconds / 60);
  const seconds = timeRemainingSeconds % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isWarning = timeRemainingSeconds <= 300; // 5 minutes
  const isCritical = timeRemainingSeconds <= 60;  // 1 minute

  const containerStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '10px',
    border: '2px solid',
    fontFamily: 'var(--font-mono)',
    fontWeight: 800,
    fontSize: '22px',
    letterSpacing: '0.04em',
    transition: 'all 0.3s ease',
    ...(isCritical
      ? {
          backgroundColor: '#fef2f2',
          color: '#b91c1c',
          borderColor: '#fecaca',
          animation: 'timer-pulse 1s ease-in-out infinite',
        }
      : isWarning
      ? {
          backgroundColor: '#fff7ed',
          color: '#c2410c',
          borderColor: '#fed7aa',
        }
      : {
          backgroundColor: 'var(--pt-blue-50)',
          color: 'var(--pt-navy-800)',
          borderColor: 'var(--pt-blue-100)',
        }),
  };

  return (
    <>
      <div style={containerStyle} title={`Time remaining: ${display}`}>
        {isWarning ? (
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
        ) : (
          <Clock size={18} style={{ flexShrink: 0 }} />
        )}
        <span>{display}</span>
      </div>
      <style>{`
        @keyframes timer-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.03); }
        }
      `}</style>
    </>
  );
}
