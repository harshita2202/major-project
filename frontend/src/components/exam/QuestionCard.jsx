import { useState } from 'react';
import {
  Code2,
  Copy,
  ClipboardPaste,
  ShieldAlert,
  Terminal,
  Check,
} from 'lucide-react';

/**
 * QuestionCard.jsx
 * Supports both Multiple-Choice Questions (MCQs) and Interactive Coding Challenges.
 * Includes live Copy/Paste protection detection & testing sandbox.
 *
 * Props:
 *   question         object { id, type, question, options[], starterCode{}, examples[], constraints[] }
 *   questionNumber   number (1-based)
 *   totalQuestions   number
 *   selectedIndex    number | string (selected option index or written code)
 *   onSelect         (val: number | string) => void
 *   onSecurityEvent  (event: object) => void
 */
export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedIndex,
  onSelect,
  onSecurityEvent,
}) {
  const isCoding = question.type === 'coding';
  const [selectedLang, setSelectedLang] = useState('javascript');
  const [toastMessage, setToastMessage] = useState(null);

  // Initialize code with starter code or restored answer
  const currentCode =
    typeof selectedIndex === 'string'
      ? selectedIndex
      : question.starterCode?.[selectedLang] || '';

  // Switch language template if no custom code entered yet
  const handleLangChange = (lang) => {
    setSelectedLang(lang);
    if (!selectedIndex || typeof selectedIndex !== 'string') {
      onSelect(question.starterCode?.[lang] || '');
    }
  };

  // Helper to trigger deterrence alert toast
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Handle manual test of copy attempt
  const handleTestCopy = () => {
    const alertMsg = 'BLOCKED: Copy attempt (Ctrl+C / copy) intercepted by ProctorTrack™';
    triggerToast(alertMsg);
    if (onSecurityEvent) {
      onSecurityEvent({
        id: `sec-${Date.now()}`,
        type: 'COPY_ATTEMPT',
        timestamp: new Date().toISOString(),
        severity: 'MEDIUM',
        message: 'Candidate attempted to copy question/code content (Action Blocked)',
      });
    }
  };

  // Handle manual test of paste attempt
  const handleTestPaste = () => {
    const alertMsg = 'BLOCKED: Paste attempt (Ctrl+V / paste) intercepted by ProctorTrack™';
    triggerToast(alertMsg);
    if (onSecurityEvent) {
      onSecurityEvent({
        id: `sec-${Date.now()}`,
        type: 'PASTE_ATTEMPT',
        timestamp: new Date().toISOString(),
        severity: 'MEDIUM',
        message: 'Candidate attempted to paste external code into editor (Action Blocked)',
      });
    }
  };

  // Handle code change
  const handleCodeChange = (e) => {
    onSelect(e.target.value);
  };

  // Handle Tab key inside code editor
  const handleEditorKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const val = e.target.value;
      const updated = val.substring(0, start) + '  ' + val.substring(end);
      onSelect(updated);
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      }, 0);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER CODING CHALLENGE
  // ─────────────────────────────────────────────────────────────────────────────
  if (isCoding) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Top question meta bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '12.5px',
                fontWeight: 700,
                color: 'var(--pt-navy-800)',
                backgroundColor: 'var(--pt-blue-50)',
                padding: '4px 12px',
                borderRadius: '20px',
                border: '1px solid var(--pt-blue-100)',
                letterSpacing: '0.02em',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Code2 size={14} color="var(--pt-navy-800)" />
              Problem {questionNumber} of {totalQuestions}
            </span>

            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: '#fef3c7',
                color: '#b45309',
              }}
            >
              {question.difficulty || 'Coding Challenge'}
            </span>
          </div>

          <span
            style={{
              fontSize: '12px',
              color: currentCode && currentCode.trim() ? '#059669' : 'var(--text-muted)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {currentCode && currentCode.trim() ? (
              <>
                <Check size={14} /> Solution Drafted
              </>
            ) : (
              'Not drafted'
            )}
          </span>
        </div>

        {/* Real-time Toast for Clipboard Blocking */}
        {toastMessage && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1.5px solid #f87171',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#991b1b',
              fontSize: '12.5px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              animation: 'shake 0.3s ease-in-out',
            }}
          >
            <ShieldAlert size={17} color="#dc2626" style={{ flexShrink: 0 }} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Problem Title & Description */}
        <div>
          <h2
            style={{
              fontSize: '19px',
              fontWeight: 800,
              color: 'var(--pt-navy-900)',
              margin: '0 0 10px',
              letterSpacing: '-0.01em',
            }}
          >
            {question.title || `Coding Challenge #${questionNumber}`}
          </h2>
          <div
            style={{
              fontSize: '14.5px',
              color: 'var(--text-primary)',
              lineHeight: 1.65,
              whiteSpace: 'pre-line',
            }}
          >
            {question.question}
          </div>
        </div>

        {/* Examples */}
        {question.examples && question.examples.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--pt-navy-800)' }}>
              Examples:
            </div>
            {question.examples.map((ex, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  fontSize: '12.5px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--pt-navy-900)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div>
                  <strong style={{ color: 'var(--pt-navy-800)' }}>Input:</strong> {ex.input}
                </div>
                <div>
                  <strong style={{ color: '#047857' }}>Output:</strong> {ex.output}
                </div>
                {ex.explanation && (
                  <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-family)', fontSize: '12px' }}>
                    <strong>Explanation:</strong> {ex.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Constraints */}
        {question.constraints && (
          <div
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-app)',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <strong style={{ color: 'var(--pt-navy-800)' }}>Constraints:</strong>
            <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
              {question.constraints.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Anti-Paste Deterrence & Testing Verification Box ── */}
        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '10px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 800, color: '#166534' }}>
              <ShieldAlert size={15} color="#16a34a" />
              Anti-Paste &amp; Clipboard Deterrence Guard Active
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: '#15803d', lineHeight: 1.4 }}>
              Pasting external code (Ctrl+V) and copying (Ctrl+C) are strictly intercepted and logged.
            </p>
          </div>

          {/* Quick verification test buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleTestCopy}
              title="Test if Copying is detected and blocked"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                border: '1px solid #86efac',
                color: '#166534',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Copy size={12} /> Test Copy Block
            </button>

            <button
              type="button"
              onClick={handleTestPaste}
              title="Test if Pasting is detected and blocked"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: '#16a34a',
                border: '1px solid #15803d',
                color: '#ffffff',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <ClipboardPaste size={12} /> Test Paste Block
            </button>
          </div>
        </div>

        {/* ── Interactive Code Editor Area ── */}
        <div
          style={{
            borderRadius: '10px',
            border: '1px solid var(--pt-navy-800)',
            overflow: 'hidden',
            backgroundColor: '#0a1c30',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* Editor Header / Language Selector */}
          <div
            style={{
              padding: '8px 16px',
              backgroundColor: '#071524',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={14} color="#26c6da" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.03em' }}>
                Code Editor (Anti-Paste Protected)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="lang-select" style={{ fontSize: '11px', color: '#8eaec9', fontWeight: 600 }}>
                Language:
              </label>
              <select
                id="lang-select"
                value={selectedLang}
                onChange={(e) => handleLangChange(e.target.value)}
                style={{
                  backgroundColor: '#0f2b48',
                  color: '#ffffff',
                  border: '1px solid rgba(38, 198, 218, 0.4)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
              </select>
            </div>
          </div>

          {/* Textarea Code Input */}
          <div style={{ position: 'relative' }}>
            <textarea
              value={currentCode}
              onChange={handleCodeChange}
              onKeyDown={handleEditorKeyDown}
              onCopy={(e) => {
                e.preventDefault();
                handleTestCopy();
              }}
              onPaste={(e) => {
                e.preventDefault();
                handleTestPaste();
              }}
              onCut={(e) => {
                e.preventDefault();
                triggerToast('BLOCKED: Cut attempt intercepted by ProctorTrack™');
                if (onSecurityEvent) {
                  onSecurityEvent({
                    id: `sec-${Date.now()}`,
                    type: 'CUT_ATTEMPT',
                    timestamp: new Date().toISOString(),
                    severity: 'MEDIUM',
                    message: 'Candidate attempted to cut code from editor (Action Blocked)',
                  });
                }
              }}
              placeholder="// Write your solution here... (Note: Copy/Paste is disabled)"
              spellCheck={false}
              rows={14}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: '#0a1c30',
                color: '#e2e8f0',
                fontFamily: 'var(--font-mono)',
                fontSize: '13.5px',
                lineHeight: 1.6,
                border: 'none',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Editor Footer / Info */}
          <div
            style={{
              padding: '6px 16px',
              backgroundColor: '#071524',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: '#8eaec9',
            }}
          >
            <span>Tab size: 2 spaces · UTF-8</span>
            <span>{currentCode.split('\n').length} lines · {currentCode.length} chars</span>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER MULTIPLE CHOICE QUESTION (DEFAULT)
  // ─────────────────────────────────────────────────────────────────────────────
  const optionLetters = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Question meta bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: '12.5px',
            fontWeight: 700,
            color: 'var(--pt-navy-800)',
            backgroundColor: 'var(--pt-blue-50)',
            padding: '4px 12px',
            borderRadius: '20px',
            border: '1px solid var(--pt-blue-100)',
            letterSpacing: '0.02em',
          }}
        >
          Question {questionNumber} of {totalQuestions}
        </span>
        <span
          style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            fontWeight: 500,
          }}
        >
          {selectedIndex !== undefined ? '✓ Answered' : 'Not answered'}
        </span>
      </div>

      {/* Question text */}
      <div
        style={{
          fontSize: '17px',
          fontWeight: 600,
          color: 'var(--pt-navy-900)',
          lineHeight: 1.65,
          userSelect: 'none',
          padding: '4px 0',
        }}
      >
        {question.question}
      </div>

      {/* Options */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {question.options &&
          question.options.map((option, idx) => {
            const isSelected = selectedIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelect(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  padding: '14px 18px',
                  borderRadius: '10px',
                  border: '2px solid',
                  borderColor: isSelected ? 'var(--pt-navy-800)' : 'var(--border-subtle)',
                  backgroundColor: isSelected ? 'var(--pt-blue-50)' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  outline: 'none',
                  boxShadow: isSelected ? '0 0 0 3px rgba(15,43,72,0.1)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = 'var(--pt-blue-600)';
                    e.currentTarget.style.backgroundColor = 'var(--bg-surface-subtle)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.backgroundColor = '#ffffff';
                  }
                }}
              >
                {/* Option letter badge */}
                <span
                  style={{
                    flexShrink: 0,
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    backgroundColor: isSelected ? 'var(--pt-navy-800)' : 'var(--bg-app)',
                    color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                    border: '2px solid',
                    borderColor: isSelected ? 'var(--pt-navy-800)' : 'var(--border-strong)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {optionLetters[idx]}
                </span>
                {/* Option text */}
                <span
                  style={{
                    fontSize: '14.5px',
                    color: isSelected ? 'var(--pt-navy-900)' : 'var(--text-primary)',
                    fontWeight: isSelected ? 600 : 400,
                    lineHeight: 1.55,
                    userSelect: 'none',
                  }}
                >
                  {option}
                </span>
              </button>
            );
          })}
      </div>
    </div>
  );
}
