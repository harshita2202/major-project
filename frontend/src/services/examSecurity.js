/**
 * examSecurity.js
 * Security utility and deterrence service for ProctorTrack™ student examinations.
 *
 * Provides event logging, deterrence, fullscreen enforcement,
 * shortcut prevention, tab-switch monitoring, and session persistence.
 */

// ─── Event Type Constants ──────────────────────────────────────────────────────
export const SECURITY_EVENT_TYPE = {
  EXAM_STARTED: 'EXAM_STARTED',
  EXAM_SUBMITTED: 'EXAM_SUBMITTED',
  AUTO_SUBMITTED: 'AUTO_SUBMITTED',

  FULLSCREEN_EXIT: 'FULLSCREEN_EXIT',
  FULLSCREEN_ENTER: 'FULLSCREEN_ENTER',
  TAB_SWITCH: 'TAB_SWITCH',

  COPY_ATTEMPT: 'COPY_ATTEMPT',
  CUT_ATTEMPT: 'CUT_ATTEMPT',
  PASTE_ATTEMPT: 'PASTE_ATTEMPT',

  SHORTCUT_ATTEMPT: 'SHORTCUT_ATTEMPT',
  KEYBOARD_SHORTCUT: 'SHORTCUT_ATTEMPT', // alias for backwards compatibility
  CONTEXT_MENU_ATTEMPT: 'CONTEXT_MENU_ATTEMPT',

  PAGE_EXIT_ATTEMPT: 'PAGE_EXIT_ATTEMPT',
};

// ─── Severity Constants ────────────────────────────────────────────────────────
export const SECURITY_SEVERITY = {
  INFO: 'INFO',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

// ─── Blocked Keyboard Shortcuts ────────────────────────────────────────────────
const BLOCKED_SHORTCUTS = [
  { key: 'c', ctrl: true, name: 'Ctrl+C (Copy)' },
  { key: 'v', ctrl: true, name: 'Ctrl+V (Paste)' },
  { key: 'x', ctrl: true, name: 'Ctrl+X (Cut)' },
  { key: 'a', ctrl: true, name: 'Ctrl+A (Select All)' },
  { key: 's', ctrl: true, name: 'Ctrl+S (Save)' },
  { key: 'p', ctrl: true, name: 'Ctrl+P (Print)' },
  { key: 'u', ctrl: true, name: 'Ctrl+U (View Source)' },
  { key: 'F12', ctrl: false, name: 'F12 (DevTools)' },
  { key: 'i', ctrl: true, shift: true, name: 'Ctrl+Shift+I (DevTools)' },
  { key: 'j', ctrl: true, shift: true, name: 'Ctrl+Shift+J (Console)' },
  { key: 'c', ctrl: true, shift: true, name: 'Ctrl+Shift+C (Inspector)' },
];

// ─── Event Factory ─────────────────────────────────────────────────────────────
/**
 * Creates a standardized security event object.
 * @param {string} type
 * @param {string} severity
 * @param {string} message
 * @returns {{ id: string, type: string, timestamp: string, severity: string, message: string }}
 */
export function createSecurityEvent(type, severity, message) {
  return {
    id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    timestamp: new Date().toISOString(),
    severity,
    message,
  };
}

// ─── Fullscreen Helpers ────────────────────────────────────────────────────────
/**
 * Requests browser fullscreen mode on document root.
 * Must be triggered from a direct user gesture (e.g. click).
 */
export async function enterFullscreen() {
  const el = document.documentElement;
  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
    } else if (el.mozRequestFullScreen) {
      await el.mozRequestFullScreen();
    } else if (el.msRequestFullscreen) {
      await el.msRequestFullscreen();
    }
  } catch (err) {
    // User or browser may deny fullscreen request
    void err;
  }
}

/**
 * Exits fullscreen mode safely.
 */
export async function exitFullscreen() {
  try {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        await document.mozCancelFullScreen();
      }
    }
  } catch (err) {
    void err;
  }
}

/**
 * Returns true if the page is currently in fullscreen mode.
 * @returns {boolean}
 */
export function isFullscreen() {
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

// ─── Security Listeners Engine ─────────────────────────────────────────────────
/**
 * Sets up all exam deterrence and security event listeners.
 *
 * @param {function} onEvent - Callback receiving security event objects
 * @returns {function} cleanup - Call to tear down all active event listeners
 */
export function setupSecurityListeners(onEvent) {
  // 1. Clipboard Copy
  const handleCopy = (e) => {
    e.preventDefault();
    onEvent(
      createSecurityEvent(
        SECURITY_EVENT_TYPE.COPY_ATTEMPT,
        SECURITY_SEVERITY.MEDIUM,
        'Attempted to copy exam content (Action blocked)'
      )
    );
  };

  // 2. Clipboard Cut
  const handleCut = (e) => {
    e.preventDefault();
    onEvent(
      createSecurityEvent(
        SECURITY_EVENT_TYPE.CUT_ATTEMPT,
        SECURITY_SEVERITY.MEDIUM,
        'Attempted to cut content (Action blocked)'
      )
    );
  };

  // 3. Clipboard Paste
  const handlePaste = (e) => {
    e.preventDefault();
    onEvent(
      createSecurityEvent(
        SECURITY_EVENT_TYPE.PASTE_ATTEMPT,
        SECURITY_SEVERITY.MEDIUM,
        'Attempted to paste external content (Action blocked)'
      )
    );
  };

  // 4. Context Menu (Right Click)
  const handleContextMenu = (e) => {
    e.preventDefault();
    onEvent(
      createSecurityEvent(
        SECURITY_EVENT_TYPE.CONTEXT_MENU_ATTEMPT,
        SECURITY_SEVERITY.LOW,
        'Right-click context menu access attempted (Action blocked)'
      )
    );
  };

  // 5. Keyboard Shortcuts
  const handleKeyDown = (e) => {
    const matched = BLOCKED_SHORTCUTS.find((s) => {
      const keyMatch =
        s.key === 'F12'
          ? e.key === 'F12'
          : e.key.toLowerCase() === s.key.toLowerCase();
      const ctrlMatch = s.ctrl ? e.ctrlKey || e.metaKey : true;
      const shiftMatch = s.shift ? e.shiftKey : true;
      return keyMatch && ctrlMatch && shiftMatch;
    });

    if (matched) {
      e.preventDefault();
      onEvent(
        createSecurityEvent(
          SECURITY_EVENT_TYPE.SHORTCUT_ATTEMPT,
          SECURITY_SEVERITY.MEDIUM,
          `Restricted shortcut detected: ${matched.name} (Action blocked)`
        )
      );
    }
  };

  // 6. Tab Switch (Page Visibility API)
  const handleVisibilityChange = () => {
    if (document.hidden) {
      onEvent(
        createSecurityEvent(
          SECURITY_EVENT_TYPE.TAB_SWITCH,
          SECURITY_SEVERITY.HIGH,
          'Candidate navigated away from examination window'
        )
      );
    }
  };

  // 7. Window Blur (e.g. clicking taskbar, second screen, or another app)
  const handleWindowBlur = () => {
    onEvent(
      createSecurityEvent(
        SECURITY_EVENT_TYPE.TAB_SWITCH,
        SECURITY_SEVERITY.HIGH,
        'Examination window lost system focus'
      )
    );
  };

  // 8. Fullscreen Change
  const handleFullscreenChange = () => {
    if (!isFullscreen()) {
      onEvent(
        createSecurityEvent(
          SECURITY_EVENT_TYPE.FULLSCREEN_EXIT,
          SECURITY_SEVERITY.HIGH,
          'Fullscreen mode exited by candidate'
        )
      );
    } else {
      onEvent(
        createSecurityEvent(
          SECURITY_EVENT_TYPE.FULLSCREEN_ENTER,
          SECURITY_SEVERITY.INFO,
          'Candidate returned to fullscreen mode'
        )
      );
    }
  };

  // 9. Before Unload Warning
  const handleBeforeUnload = (e) => {
    onEvent(
      createSecurityEvent(
        SECURITY_EVENT_TYPE.PAGE_EXIT_ATTEMPT,
        SECURITY_SEVERITY.HIGH,
        'Attempted to close or reload active examination'
      )
    );
    e.preventDefault();
    e.returnValue = '';
  };

  // Register listeners
  document.addEventListener('copy', handleCopy);
  document.addEventListener('cut', handleCut);
  document.addEventListener('paste', handlePaste);
  document.addEventListener('contextmenu', handleContextMenu);
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('blur', handleWindowBlur);
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('mozfullscreenchange', handleFullscreenChange);
  window.addEventListener('beforeunload', handleBeforeUnload);

  // Return teardown function
  return function removeSecurityListeners() {
    document.removeEventListener('copy', handleCopy);
    document.removeEventListener('cut', handleCut);
    document.removeEventListener('paste', handlePaste);
    document.removeEventListener('contextmenu', handleContextMenu);
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleWindowBlur);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}

// ─── Violation Counting & Risk Analysis ────────────────────────────────────────
/**
 * Aggregates violation counts from an event log array.
 * @param {Array} events
 */
export function countViolations(events = []) {
  const tabSwitches = events.filter(
    (e) => e.type === SECURITY_EVENT_TYPE.TAB_SWITCH
  ).length;

  const fullscreenExits = events.filter(
    (e) => e.type === SECURITY_EVENT_TYPE.FULLSCREEN_EXIT
  ).length;

  const copyAttempts = events.filter(
    (e) => e.type === SECURITY_EVENT_TYPE.COPY_ATTEMPT
  ).length;

  const cutAttempts = events.filter(
    (e) => e.type === SECURITY_EVENT_TYPE.CUT_ATTEMPT
  ).length;

  const pasteAttempts = events.filter(
    (e) => e.type === SECURITY_EVENT_TYPE.PASTE_ATTEMPT
  ).length;

  const shortcutAttempts = events.filter(
    (e) =>
      e.type === SECURITY_EVENT_TYPE.SHORTCUT_ATTEMPT ||
      e.type === SECURITY_EVENT_TYPE.KEYBOARD_SHORTCUT
  ).length;

  const contextMenuAttempts = events.filter(
    (e) => e.type === SECURITY_EVENT_TYPE.CONTEXT_MENU_ATTEMPT
  ).length;

  const total = events.filter(
    (e) => e.severity && e.severity !== SECURITY_SEVERITY.INFO
  ).length;

  return {
    tabSwitches,
    fullscreenExits,
    copyAttempts,
    cutAttempts,
    pasteAttempts,
    shortcutAttempts,
    contextMenuAttempts,
    total,
  };
}

/**
 * Derives overall security status indicator.
 * @param {{ fullscreenExits, tabSwitches, total }} counts
 * @returns {'SECURE' | 'WARNING' | 'HIGH_RISK'}
 */
export function getSecurityStatus(counts) {
  if (!counts) return 'SECURE';
  if (counts.fullscreenExits >= 2 || counts.tabSwitches >= 3 || counts.total >= 6) {
    return 'HIGH_RISK';
  }
  if (counts.fullscreenExits >= 1 || counts.tabSwitches >= 1 || counts.total >= 2) {
    return 'WARNING';
  }
  return 'SECURE';
}

// ─── Session Persistence ───────────────────────────────────────────────────────
const SESSION_PREFIX = 'exam_session_';

export function saveSession(examId, sessionData) {
  try {
    localStorage.setItem(`${SESSION_PREFIX}${examId}`, JSON.stringify(sessionData));
  } catch (lsErr) {
    void lsErr;
  }
}

export function loadSession(examId) {
  try {
    const raw = localStorage.getItem(`${SESSION_PREFIX}${examId}`);
    return raw ? JSON.parse(raw) : null;
  } catch (lsErr) {
    void lsErr;
    return null;
  }
}

export function clearSession(examId) {
  try {
    localStorage.removeItem(`${SESSION_PREFIX}${examId}`);
  } catch (lsErr) {
    void lsErr;
  }
}
