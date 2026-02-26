// ============================================================
// ClockNode - Notion Client Wrapper & CRUD
// ============================================================

import { Client } from '@notionhq/client';
import {
  type TodoItem,
  TodoStatus,
  Priority,
} from './types.js';
import { loadNotionConfig } from './notion-config.js';

// ── Rate Limiting ────────────────────────────────────────────

let lastRequestTime = 0;
const MIN_INTERVAL_MS = 350; // Notion rate limit: 3 req/s

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise(r => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

// ── Retry with Exponential Backoff ──────────────────────────

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await rateLimit();
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const status = (err as { status?: number }).status;
      if (status === 429 || (status && status >= 500)) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// ── Client Singleton ────────────────────────────────────────

let cachedClient: Client | null = null;
let cachedDatabaseId: string | null = null;

/** Get (or create) a cached Notion client. Returns null if not configured. */
export function getNotionClient(): { client: Client; databaseId: string } | null {
  if (cachedClient && cachedDatabaseId) {
    return { client: cachedClient, databaseId: cachedDatabaseId };
  }
  const cfg = loadNotionConfig();
  if (!cfg) return null;
  cachedClient = new Client({ auth: cfg.token });
  cachedDatabaseId = cfg.databaseId;
  return { client: cachedClient, databaseId: cachedDatabaseId };
}

/** Reset cached client (call after config changes). */
export function resetNotionClient(): void {
  cachedClient = null;
  cachedDatabaseId = null;
}

// ── Property Mapping ────────────────────────────────────────

const STATUS_MAP: Record<TodoStatus, string> = {
  [TodoStatus.Pending]: 'Pending',
  [TodoStatus.InProgress]: 'In Progress',
  [TodoStatus.Done]: 'Done',
};

const STATUS_REVERSE: Record<string, TodoStatus> = {
  'Pending': TodoStatus.Pending,
  'In Progress': TodoStatus.InProgress,
  'Done': TodoStatus.Done,
};

const PRIORITY_MAP: Record<Priority, string> = {
  [Priority.High]: 'High',
  [Priority.Mid]: 'Mid',
  [Priority.Low]: 'Low',
  [Priority.None]: 'None',
};

const PRIORITY_REVERSE: Record<string, Priority> = {
  'High': Priority.High,
  'Mid': Priority.Mid,
  'Low': Priority.Low,
  'None': Priority.None,
};

/** Convert a TodoItem to Notion page properties. */
export function todoToNotionProperties(todo: TodoItem): Record<string, unknown> {
  const props: Record<string, unknown> = {
    'Name': {
      title: [{ text: { content: todo.content } }],
    },
    'Status': {
      select: { name: STATUS_MAP[todo.status] || 'Pending' },
    },
    'Priority': {
      select: { name: PRIORITY_MAP[todo.priority] || 'None' },
    },
    'Tags': {
      multi_select: todo.tags.map(t => ({ name: t })),
    },
    'Duration': {
      number: todo.duration,
    },
    'Actual Time': {
      number: todo.actualTime ?? 0,
    },
    'Local ID': {
      rich_text: [{ text: { content: todo.id } }],
    },
    'Created At': {
      date: { start: todo.createdAt },
    },
  };

  if (todo.completedAt) {
    props['Completed At'] = {
      date: { start: todo.completedAt },
    };
  }

  return props;
}

/** Convert a Notion page object to a partial TodoItem. */
export function notionPageToTodo(page: Record<string, unknown>): Partial<TodoItem> {
  const props = (page as { properties: Record<string, Record<string, unknown>> }).properties;
  const result: Partial<TodoItem> = {};

  // Name (title)
  try {
    const titleProp = props['Name'] as { title?: Array<{ plain_text: string }> };
    if (titleProp?.title?.[0]?.plain_text) {
      result.content = titleProp.title[0].plain_text;
    }
  } catch { /* skip */ }

  // Status (select)
  try {
    const selectProp = props['Status'] as { select?: { name: string } };
    if (selectProp?.select?.name) {
      result.status = STATUS_REVERSE[selectProp.select.name];
    }
  } catch { /* skip */ }

  // Priority (select)
  try {
    const prioProp = props['Priority'] as { select?: { name: string } };
    if (prioProp?.select?.name) {
      result.priority = PRIORITY_REVERSE[prioProp.select.name];
    }
  } catch { /* skip */ }

  // Tags (multi_select)
  try {
    const tagsProp = props['Tags'] as { multi_select?: Array<{ name: string }> };
    if (tagsProp?.multi_select) {
      result.tags = tagsProp.multi_select.map((t: { name: string }) => t.name);
    }
  } catch { /* skip */ }

  // Duration (number)
  try {
    const durProp = props['Duration'] as { number?: number };
    if (typeof durProp?.number === 'number') {
      result.duration = durProp.number;
    }
  } catch { /* skip */ }

  // Actual Time (number)
  try {
    const atProp = props['Actual Time'] as { number?: number };
    if (typeof atProp?.number === 'number') {
      result.actualTime = atProp.number;
    }
  } catch { /* skip */ }

  // Local ID (rich_text)
  try {
    const idProp = props['Local ID'] as { rich_text?: Array<{ plain_text: string }> };
    if (idProp?.rich_text?.[0]?.plain_text) {
      result.id = idProp.rich_text[0].plain_text;
    }
  } catch { /* skip */ }

  // Created At (date)
  try {
    const dateProp = props['Created At'] as { date?: { start: string } };
    if (dateProp?.date?.start) {
      result.createdAt = dateProp.date.start;
    }
  } catch { /* skip */ }

  // Completed At (date)
  try {
    const doneProp = props['Completed At'] as { date?: { start: string } };
    if (doneProp?.date?.start) {
      result.completedAt = doneProp.date.start;
    }
  } catch { /* skip */ }

  return result;
}

// ── CRUD Functions ──────────────────────────────────────────

/** Create a new Notion page for a todo. Returns pageId or null. */
export async function createNotionPage(todo: TodoItem): Promise<string | null> {
  const ctx = getNotionClient();
  if (!ctx) return null;

  const response = await withRetry(() =>
    ctx.client.pages.create({
      parent: { database_id: ctx.databaseId },
      properties: todoToNotionProperties(todo) as Parameters<typeof ctx.client.pages.create>[0]['properties'],
    })
  );
  return response.id;
}

/** Update an existing Notion page. Returns success. */
export async function updateNotionPage(pageId: string, todo: TodoItem): Promise<boolean> {
  const ctx = getNotionClient();
  if (!ctx) return false;

  await withRetry(() =>
    ctx.client.pages.update({
      page_id: pageId,
      properties: todoToNotionProperties(todo) as Parameters<typeof ctx.client.pages.update>[0]['properties'],
    })
  );
  return true;
}

/** Archive (soft-delete) a Notion page. Returns success. */
export async function archiveNotionPage(pageId: string): Promise<boolean> {
  const ctx = getNotionClient();
  if (!ctx) return false;

  await withRetry(() =>
    ctx.client.pages.update({
      page_id: pageId,
      archived: true,
    })
  );
  return true;
}

/** Query all pages from the Notion database (auto-pagination). */
export async function queryNotionDatabase(): Promise<Partial<TodoItem>[]> {
  const ctx = getNotionClient();
  if (!ctx) return [];

  const results: Partial<TodoItem>[] = [];
  let cursor: string | undefined;

  do {
    const response = await withRetry(() =>
      ctx.client.databases.query({
        database_id: ctx.databaseId,
        start_cursor: cursor,
        page_size: 100,
      })
    );

    for (const page of response.results) {
      results.push(notionPageToTodo(page as Record<string, unknown>));
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return results;
}

/** Get a single Notion page by ID. Returns partial TodoItem or null. */
export async function getNotionPage(pageId: string): Promise<Partial<TodoItem> | null> {
  const ctx = getNotionClient();
  if (!ctx) return null;

  const page = await withRetry(() =>
    ctx.client.pages.retrieve({ page_id: pageId })
  );
  return notionPageToTodo(page as Record<string, unknown>);
}

/** Test the Notion connection by querying the database metadata. */
export async function testNotionConnection(): Promise<{ ok: true; title: string } | { ok: false; error: string }> {
  const ctx = getNotionClient();
  if (!ctx) return { ok: false, error: 'Notion not configured' };

  try {
    const db = await withRetry(() =>
      ctx.client.databases.retrieve({ database_id: ctx.databaseId })
    );
    const titleArr = (db as { title?: Array<{ plain_text: string }> }).title;
    const title = titleArr?.[0]?.plain_text ?? 'Untitled';
    return { ok: true, title };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
