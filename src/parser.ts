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

  // Parse @duration suffix
  const durMatch = content.match(/\s+@(0?\d+)\s*$/);
  if (durMatch) {
    const rawDur = durMatch[1];
    content = content.slice(0, -durMatch[0].length).trim();

    // Check if it's a preset (starts with 0)
    if (rawDur.startsWith('0') && rawDur.length === 2) {
      const presetKey = rawDur;
      if (COUNTDOWN_PRESETS[presetKey] !== undefined) {
        duration = COUNTDOWN_PRESETS[presetKey];
      } else {
        duration = parseInt(rawDur, 10) || 60;
      }
    } else {
      duration = parseInt(rawDur, 10) || 60;
    }
  }

  if (!content) return null;

  return { type: 'todo', content, position, duration };
}
