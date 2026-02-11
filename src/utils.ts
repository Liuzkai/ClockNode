// ============================================================
// ClockNode - Utility Functions
// ============================================================

import { PROGRESS_THEMES, type AppConfig } from './types.js';

/**
 * Format seconds into HH:MM:SS
 */
export function formatTime(totalSeconds: number): string {
  const abs = Math.abs(Math.floor(totalSeconds));
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const sign = totalSeconds < 0 ? '+' : '';
  if (h > 0) {
    return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${sign}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Format milliseconds into HH:MM:SS.ms
 */
export function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const millis = Math.floor((ms % 1000) / 10);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(millis).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(millis).padStart(2, '0')}`;
}

/**
 * Render a progress bar string
 */
export function renderProgressBar(
  progress: number,
  width: number,
  config: AppConfig,
): string {
  const clamped = Math.max(0, Math.min(1, progress));
  const filledLen = Math.round(clamped * width);
  const emptyLen = width - filledLen;

  let filled: string;
  let empty: string;

  if (config.customProgressBar) {
    filled = config.customProgressBar.filled;
    empty = config.customProgressBar.empty;
  } else {
    const theme = PROGRESS_THEMES[config.themeIndex] || PROGRESS_THEMES[0];
    filled = theme.filled;
    empty = theme.empty;
  }

  return filled.repeat(filledLen) + empty.repeat(emptyLen);
}

/**
 * Get current date/time display strings
 */
export function getClockDisplay(): { date: string; time: string; weekday: string } {
  const now = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const date = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
  const time = now.toLocaleTimeString('en-GB', { hour12: false }); // HH:MM:SS
  const weekday = days[now.getDay()];
  return { date, time, weekday };
}

/**
 * Get a display-friendly priority label
 */
export function priorityLabel(p: string): string {
  switch (p) {
    case 'high': return '🔴';
    case 'mid': return '🟡';
    case 'low': return '🔵';
    default: return '  ';
  }
}

/**
 * Pad string to fixed width for alignment
 */
export function pad(str: string, len: number): string {
  if (str.length >= len) return str;
  return str + ' '.repeat(len - str.length);
}
