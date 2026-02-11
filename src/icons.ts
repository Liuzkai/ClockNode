// ============================================================
// ClockNode - Icon/Symbol Module (CMD compatible)
// ============================================================
// Detects whether the terminal supports emoji and provides
// ASCII/basic-Unicode fallbacks for Windows CMD.
//
// Windows CMD can render basic Unicode (box-drawing ─│, geometric ●■▶ etc.)
// but NOT emoji (U+1F000+ like ⏰✅📋🔴🎉 etc.)
// So we have two levels:
//   - supportsEmoji: false on CMD → replaces emoji with text labels
//   - Basic Unicode (─│▶●) is always used since CMD handles them fine

/**
 * Detect if the terminal can render emoji (multi-byte Unicode like ⏰✅📋).
 */
function detectEmojiSupport(): boolean {
  // Force mode via env variable (highest priority)
  if (process.env.CLOCKNODE_ASCII === '1') return false;
  if (process.env.CLOCKNODE_UNICODE === '1') return true;

  // Non-Windows: assume full emoji support
  if (process.platform !== 'win32') return true;

  // Windows: only enable emoji for known-good terminals
  if (process.env.WT_SESSION) return true;          // Windows Terminal
  if (process.env.TERM_PROGRAM === 'vscode') return true; // VS Code
  if (process.env.ConEmuPID) return true;            // ConEmu / Cmder
  if (process.env.MSYSTEM) return true;              // Git Bash / MSYS2
  if (process.env.TERM) return true;                 // mintty, cygwin

  // Default: no emoji for Windows CMD and unknown terminals
  return false;
}

export const supportsEmoji = detectEmojiSupport();

/** Icon map — emoji vs plain-text fallback.
 *  Basic Unicode symbols (─│▶●■) are always used; only emoji gets replaced. */
export const icons = {
  // Status
  done:       supportsEmoji ? '✅' : '[x]',
  inProgress: supportsEmoji ? '▶️'  : '[>]',
  pending:    supportsEmoji ? '⬜' : '[ ]',

  // Time / Mode
  clock:      supportsEmoji ? '⏰' : '[C]',
  timer:      supportsEmoji ? '⏱'  : '[T]',
  countdown:  supportsEmoji ? '⏳' : '[D]',
  todoTimer:  supportsEmoji ? '📋' : '[L]',
  clockMode:  supportsEmoji ? '🕐' : '[C]',

  // Actions
  play:       supportsEmoji ? '▶'  : '>',
  pause:      supportsEmoji ? '⏸'  : '||',
  stop:       supportsEmoji ? '⏹'  : '[S]',
  skip:       supportsEmoji ? '⏭'  : '>>',
  reset:      supportsEmoji ? '🔄' : '<->',
  party:      supportsEmoji ? '🎉' : '(!)',

  // Notification
  warning:    supportsEmoji ? '⚠'  : '/!\\',
  check:      supportsEmoji ? '✅' : '[v]',
  cross:      supportsEmoji ? '❌' : '[x]',
  info:       supportsEmoji ? 'ℹ'  : '[i]',

  // Priority
  high:       supportsEmoji ? '🔴' : '[H]',
  mid:        supportsEmoji ? '🟡' : '[M]',
  low:        supportsEmoji ? '🔵' : '[L]',

  // UI — these are basic Unicode, always readable
  prompt:     supportsEmoji ? '❯'  : '>',
  pointer:    '▸',      // U+25B8, works in CMD
  separator:  '│',      // U+2502, works in CMD
  hLine:      '─',      // U+2500, works in CMD
} as const;
