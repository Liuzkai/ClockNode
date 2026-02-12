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
};

/** Forbidden time units (day and above) */
const FORBIDDEN_UNITS = /^(d|day|days|w|week|weeks|mon|month|months|y|year|years)$/i;

/**
 * Parse a duration string into minutes.
 * Supports:
 *   - Plain number: treated as minutes (e.g. "20" → 20)
 *   - Number + unit: "20m", "20min" → 20; "2h" → 120
 *   - Presets: "01"~"04" → COUNTDOWN_PRESETS
 *   - Forbidden units (d/w/mon/y): returns { minutes: 60, warning: '...' }
 *
 * Returns { minutes, warning? }
 */
export function parseDuration(raw: string): { minutes: number; warning?: string } {
  // Preset: starts with 0 and is 2 chars (e.g. "01", "02")
  if (raw.startsWith('0') && raw.length === 2) {
    const presetKey = raw;
    if (COUNTDOWN_PRESETS[presetKey] !== undefined) {
      return { minutes: COUNTDOWN_PRESETS[presetKey] };
    }
    return { minutes: parseInt(raw, 10) || 60 };
  }

  // Number + unit
  const unitMatch = raw.match(/^(\d+(?:\.\d+)?)\s*(m|min|h|d|day|days|w|week|weeks|mon|month|months|y|year|years)$/i);
  if (unitMatch) {
    const num = parseFloat(unitMatch[1]);
    const unit = unitMatch[2].toLowerCase();

    if (FORBIDDEN_UNITS.test(unit)) {
      return { minutes: 60, warning: `Unit "${unit}" is not supported (max unit: h). Using default 60m.` };
    }

    if (unit === 'h') {
      return { minutes: Math.round(num * 60) };
    }
    // m, min
    return { minutes: Math.round(num) || 60 };
  }

  // Plain number (minutes)
  const num = parseInt(raw, 10);
  if (num && num > 0) {
    return { minutes: num };
  }

  return { minutes: 60 };
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
