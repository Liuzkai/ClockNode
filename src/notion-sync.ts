// ============================================================
// ClockNode - Notion Sync Mapping Store
// ============================================================
// Maintains localId <-> notionPageId mapping in ~/.clocknode/notion_sync.json

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { type SyncMap, type SyncEntry, type TodoItem } from './types.js';

const CONFIG_DIR = path.join(os.homedir(), '.clocknode');
const SYNC_FILE = path.join(CONFIG_DIR, 'notion_sync.json');

function ensureDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/** Load sync map. Returns empty map if file doesn't exist. */
export function loadSyncMap(): SyncMap {
  try {
    if (fs.existsSync(SYNC_FILE)) {
      const raw = fs.readFileSync(SYNC_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as SyncMap;
      return {
        entries: Array.isArray(parsed.entries) ? parsed.entries : [],
        lastSyncAt: parsed.lastSyncAt,
      };
    }
  } catch {
    // ignore parse errors
  }
  return { entries: [] };
}

/** Save sync map. */
export function saveSyncMap(map: SyncMap): void {
  ensureDir();
  fs.writeFileSync(SYNC_FILE, JSON.stringify(map, null, 2), 'utf-8');
}

/** Compute MD5 hash of a todo's content fields for change detection. */
export function computeLocalHash(todo: TodoItem): string {
  const payload = JSON.stringify({
    content: todo.content,
    status: todo.status,
    priority: todo.priority,
    tags: todo.tags,
    duration: todo.duration,
    actualTime: todo.actualTime ?? 0,
  });
  return crypto.createHash('md5').update(payload).digest('hex');
}

/** Find sync entry by local todo ID. */
export function findByLocalId(map: SyncMap, localId: string): SyncEntry | undefined {
  return map.entries.find(e => e.localId === localId);
}

/** Find sync entry by Notion page ID. */
export function findByNotionPageId(map: SyncMap, notionPageId: string): SyncEntry | undefined {
  return map.entries.find(e => e.notionPageId === notionPageId);
}

/** Insert or update a sync entry (matched by localId). */
export function upsertSyncEntry(map: SyncMap, entry: SyncEntry): SyncMap {
  const idx = map.entries.findIndex(e => e.localId === entry.localId);
  const entries = [...map.entries];
  if (idx >= 0) {
    entries[idx] = entry;
  } else {
    entries.push(entry);
  }
  return { ...map, entries };
}

/** Remove a sync entry by local ID. */
export function removeSyncEntry(map: SyncMap, localId: string): SyncMap {
  return {
    ...map,
    entries: map.entries.filter(e => e.localId !== localId),
  };
}
