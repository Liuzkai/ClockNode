// ============================================================
// ClockNode - Input Parser
// ============================================================

import { COUNTDOWN_PRESETS, type ParsedInput } from './types.js';

/**
 * Command alias mapping (short -> full name)
 */
const ALIASES: Record<string, string> = {
  'h': 'help',
  '?': 'help',
  'm': 'mode',
  'd': 'delete',
  'e': 'edit',
  'ok': 'done',
  'u': 'undo',
  't': 'tag',
  'p': 'priority',
  's': 'sort',
  'st': 'start',
  'ps': 'pass',
  'pa': 'pause',
  'r': 'resume',
  'sp': 'stop',
  'th': 'theme',
  'cd': 'countdown',
  'tm': 'timer',
  'cl': 'clear',
  'rs': 'reset',
  'q': 'quit',
  'hi': 'history',
  'b': 'back',
  'nw': 'now',
};

/** Forbidden time units (day and above) */
const FORBIDDEN_UNITS = /^(d|day|days|w|week|weeks|mon|month|months|y|year|years)$/i;

/** Supported time unit regex (s/sec/m/min/h and forbidden units) */
const DURATION_UNIT_RE = /^(\d+(?:\.\d+)?)\s*(s|sec|m|min|h|d|day|days|w|week|weeks|mon|month|months|y|year|years)$/i;

/**
 * Parse a duration string into seconds.
 * Supports:
 *   - Plain number: treated as minutes (e.g. "20" → 1200s)
 *   - Number + unit: "30s"/"30sec" → 30s; "20m"/"20min" → 1200s; "2h" → 7200s
 *   - Presets: "01"~"04" → COUNTDOWN_PRESETS (in minutes, converted to seconds)
 *   - Forbidden units (d/w/mon/y): returns { seconds: 3600, warning: '...' }
 *
 * Returns { seconds, warning? }
 */
export function parseDurationSeconds(raw: string): { seconds: number; warning?: string } {
  // Preset: starts with 0 and is 2 chars (e.g. "01", "02")
  if (raw.startsWith('0') && raw.length === 2) {
    const presetKey = raw;
    if (COUNTDOWN_PRESETS[presetKey] !== undefined) {
      return { seconds: COUNTDOWN_PRESETS[presetKey] * 60 };
    }
    return { seconds: (parseInt(raw, 10) || 60) * 60 };
  }

  // Number + unit
  const unitMatch = raw.match(DURATION_UNIT_RE);
  if (unitMatch) {
    const num = parseFloat(unitMatch[1]);
    const unit = unitMatch[2].toLowerCase();

    if (FORBIDDEN_UNITS.test(unit)) {
      return { seconds: 3600, warning: `Unit "${unit}" is not supported (max unit: h). Using default 60m.` };
    }

    if (unit === 's' || unit === 'sec') {
      return { seconds: Math.round(num) };
    }
    if (unit === 'h') {
      return { seconds: Math.round(num * 3600) };
    }
    // m, min
    return { seconds: Math.round(num * 60) || 3600 };
  }

  // Plain number (minutes)
  const num = parseInt(raw, 10);
  if (num && num > 0) {
    return { seconds: num * 60 };
  }

  return { seconds: 3600 };
}

/**
 * Parse a duration string into minutes.
 * Supports:
 *   - Plain number: treated as minutes (e.g. "20" → 20)
 *   - Number + unit: "30s"/"30sec" → 1; "20m"/"20min" → 20; "2h" → 120
 *   - Presets: "01"~"04" → COUNTDOWN_PRESETS
 *   - Forbidden units (d/w/mon/y): returns { minutes: 60, warning: '...' }
 *
 * Returns { minutes, warning? }
 */
export function parseDuration(raw: string): { minutes: number; warning?: string } {
  const result = parseDurationSeconds(raw);
  return {
    minutes: Math.max(1, Math.round(result.seconds / 60)),
    warning: result.warning,
  };
}

/**
 * Parse user input into a command or a todo item.
 *
 * Commands start with /
 * Todo format: [#N] content [@duration | @0N]
 */
export function parseInput(input: string): ParsedInput | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Command
  if (trimmed.startsWith('/')) {
    const parts = trimmed.slice(1).split(/\s+/);
    const rawName = parts[0].toLowerCase();
    const name = ALIASES[rawName] || rawName;
    const args = parts.slice(1);
    return { type: 'command', name, args };
  }

  // Todo item
  let content = trimmed;
  let position: number | undefined;
  let duration = 60; // default 60 minutes

  // Parse #N position prefix
  const posMatch = content.match(/^#(\d+)\s+/);
  if (posMatch) {
    position = parseInt(posMatch[1], 10);
    content = content.slice(posMatch[0].length);
  }

  // Parse @duration suffix (supports units: @20, @20m, @20min, @2h, @01)
  const durMatch = content.match(/\s+@(\S+)\s*$/);
  let warning: string | undefined;
  if (durMatch) {
    const rawDur = durMatch[1];
    content = content.slice(0, -durMatch[0].length).trim();
    const result = parseDuration(rawDur);
    duration = result.minutes;
    warning = result.warning;
  }

  if (!content) return null;

  return { type: 'todo', content, position, duration, warning };
}
