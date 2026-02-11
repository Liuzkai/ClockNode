// ============================================================
// ClockNode - Configuration Manager
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { type AppConfig, DEFAULT_CONFIG } from './types.js';

const CONFIG_DIR = path.join(os.homedir(), '.clocknode');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

function ensureDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfig(): AppConfig {
  ensureDir();
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch {
    // ignore parse errors, return default
  }
  return { ...DEFAULT_CONFIG };
}

export function saveConfig(config: AppConfig): void {
  ensureDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}
