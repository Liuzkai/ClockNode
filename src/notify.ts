// ============================================================
// ClockNode - Notification Helpers
// ============================================================

import type { AppConfig } from './types.js';

/**
 * Play a BEL sound (terminal beep).
 * Write to stderr to bypass Ink's stdout interception.
 * Also try stdout as fallback for terminals that only listen there.
 */
export function playSound(config: AppConfig): void {
  if (!config.soundEnabled) return;
  try {
    process.stderr.write('\x07');
    process.stdout.write('\x07');
  } catch {
    // ignore write errors
  }
}

/**
 * Show a system notification via node-notifier
 */
export async function showSystemNotification(
  config: AppConfig,
  title: string,
  message: string,
): Promise<void> {
  if (!config.notificationEnabled) return;
  try {
    const notifier = await import('node-notifier');
    notifier.default.notify({ title, message, sound: true });
  } catch {
    // node-notifier not available, skip
  }
}

/**
 * Trigger all configured notifications (sound + system notification).
 * This function is safe to call from anywhere (fire-and-forget).
 */
export function triggerNotification(
  config: AppConfig,
  title: string,
  message: string,
): void {
  playSound(config);
  // System notification is async but we don't await — fire and forget
  showSystemNotification(config, title, message).catch(() => {});
}
