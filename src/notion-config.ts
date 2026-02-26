// ============================================================
// ClockNode - Notion Configuration Manager
// ============================================================
// Stores Notion token + databaseId separately from AppConfig
// in ~/.clocknode/notion.json

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { type NotionConfig } from './types.js';

const CONFIG_DIR = path.join(os.homedir(), '.clocknode');
const NOTION_CONFIG_FILE = path.join(CONFIG_DIR, 'notion.json');

function ensureDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/** Load Notion config. Returns null if not configured. */
export function loadNotionConfig(): NotionConfig | null {
  try {
    if (fs.existsSync(NOTION_CONFIG_FILE)) {
      const raw = fs.readFileSync(NOTION_CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as NotionConfig;
      if (parsed.token && parsed.databaseId) {
        return parsed;
      }
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

/** Save Notion config. */
export function saveNotionConfig(config: NotionConfig): void {
  ensureDir();
  fs.writeFileSync(NOTION_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

/** Remove Notion config file. */
export function removeNotionConfig(): void {
  try {
    if (fs.existsSync(NOTION_CONFIG_FILE)) {
      fs.unlinkSync(NOTION_CONFIG_FILE);
    }
  } catch {
    // ignore
  }
}

/** Get a summary of the Notion configuration status. */
export function getNotionStatus(): {
  configured: boolean;
  databaseId?: string;
  tokenPreview?: string;
} {
  const cfg = loadNotionConfig();
  if (!cfg) {
    return { configured: false };
  }
  // Show first 8 and last 4 chars of token
  const token = cfg.token;
  const preview = token.length > 12
    ? `${token.slice(0, 8)}...${token.slice(-4)}`
    : token.slice(0, 4) + '...';
  return {
    configured: true,
    databaseId: cfg.databaseId,
    tokenPreview: preview,
  };
}
