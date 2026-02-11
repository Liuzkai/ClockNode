// ============================================================
// ClockNode - TODO Data Store (persisted to ~/.clocknode/todos.json)
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { type TodoItem, type DoneRecord, TodoStatus, Priority } from './types.js';

const CONFIG_DIR = path.join(os.homedir(), '.clocknode');
const TODOS_FILE = path.join(CONFIG_DIR, 'todos.json');
const DONE_HISTORY_FILE = path.join(CONFIG_DIR, 'done_history.json');

/** Expose the todos file path for external file watching */
export const TODOS_FILE_PATH = TODOS_FILE;

function ensureDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadTodos(): TodoItem[] {
  ensureDir();
  try {
    if (fs.existsSync(TODOS_FILE)) {
      const raw = fs.readFileSync(TODOS_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveTodos(todos: TodoItem[]): void {
  ensureDir();
  fs.writeFileSync(TODOS_FILE, JSON.stringify(todos, null, 2), 'utf-8');
}

let nextId = 1;

export function createTodo(content: string, duration: number, position?: number): TodoItem {
  const todo: TodoItem = {
    id: String(Date.now()) + String(nextId++),
    content,
    status: TodoStatus.Pending,
    priority: Priority.None,
    tags: [],
    duration,
    createdAt: new Date().toISOString(),
  };
  return todo;
}

export function insertTodo(todos: TodoItem[], todo: TodoItem, position?: number): TodoItem[] {
  const newTodos = [...todos];
  if (position !== undefined && position >= 1) {
    const idx = Math.min(position - 1, newTodos.length);
    newTodos.splice(idx, 0, todo);
  } else {
    newTodos.push(todo);
  }
  return newTodos;
}

export function deleteTodo(todos: TodoItem[], index: number): TodoItem[] {
  if (index < 1 || index > todos.length) return todos;
  const newTodos = [...todos];
  newTodos.splice(index - 1, 1);
  return newTodos;
}

export function editTodo(todos: TodoItem[], index: number, content: string): TodoItem[] {
  if (index < 1 || index > todos.length) return todos;
  const newTodos = [...todos];
  newTodos[index - 1] = { ...newTodos[index - 1], content };
  return newTodos;
}

export function moveTodo(todos: TodoItem[], fromIndex: number, toIndex: number): TodoItem[] {
  if (fromIndex < 1 || fromIndex > todos.length) return todos;
  if (toIndex < 1 || toIndex > todos.length) return todos;
  if (fromIndex === toIndex) return todos;
  const newTodos = [...todos];
  const [item] = newTodos.splice(fromIndex - 1, 1);
  newTodos.splice(toIndex - 1, 0, item);
  return newTodos;
}

export function setDuration(todos: TodoItem[], index: number, duration: number): TodoItem[] {
  if (index < 1 || index > todos.length) return todos;
  const newTodos = [...todos];
  newTodos[index - 1] = { ...newTodos[index - 1], duration };
  return newTodos;
}

export function markDone(todos: TodoItem[], index: number): TodoItem[] {
  if (index < 1 || index > todos.length) return todos;
  const newTodos = [...todos];
  newTodos[index - 1] = {
    ...newTodos[index - 1],
    status: TodoStatus.Done,
    completedAt: new Date().toISOString(),
  };
  return newTodos;
}

export function markUndone(todos: TodoItem[], index: number): TodoItem[] {
  if (index < 1 || index > todos.length) return todos;
  const newTodos = [...todos];
  newTodos[index - 1] = {
    ...newTodos[index - 1],
    status: TodoStatus.Pending,
    completedAt: undefined,
  };
  return newTodos;
}

export function setTag(todos: TodoItem[], index: number, tag: string): TodoItem[] {
  if (index < 1 || index > todos.length) return todos;
  const newTodos = [...todos];
  const item = { ...newTodos[index - 1] };
  if (!item.tags.includes(tag)) {
    item.tags = [...item.tags, tag];
  }
  newTodos[index - 1] = item;
  return newTodos;
}

export function setPriority(todos: TodoItem[], index: number, priority: Priority): TodoItem[] {
  if (index < 1 || index > todos.length) return todos;
  const newTodos = [...todos];
  newTodos[index - 1] = { ...newTodos[index - 1], priority };
  return newTodos;
}

export function sortTodos(todos: TodoItem[], by: string): TodoItem[] {
  const newTodos = [...todos];
  const priorityOrder: Record<string, number> = {
    [Priority.High]: 0,
    [Priority.Mid]: 1,
    [Priority.Low]: 2,
    [Priority.None]: 3,
  };

  switch (by) {
    case 'priority':
    case 'p':
      newTodos.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      break;
    case 'status':
    case 's':
      const statusOrder: Record<string, number> = {
        [TodoStatus.InProgress]: 0,
        [TodoStatus.Pending]: 1,
        [TodoStatus.Done]: 2,
      };
      newTodos.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
      break;
    case 'created':
    case 'c':
      newTodos.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      break;
    default:
      break;
  }
  return newTodos;
}

export function clearDone(todos: TodoItem[]): TodoItem[] {
  return todos.filter(t => t.status !== TodoStatus.Done);
}

export function resetAll(todos: TodoItem[]): TodoItem[] {
  return todos.map(t => ({
    ...t,
    status: TodoStatus.Pending,
    actualTime: undefined,
    completedAt: undefined,
  }));
}

// ============================================================
// Done History (persisted to ~/.clocknode/done_history.json)
// ============================================================

export function loadDoneHistory(): DoneRecord[] {
  ensureDir();
  try {
    if (fs.existsSync(DONE_HISTORY_FILE)) {
      const raw = fs.readFileSync(DONE_HISTORY_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveDoneHistory(records: DoneRecord[]): void {
  ensureDir();
  fs.writeFileSync(DONE_HISTORY_FILE, JSON.stringify(records, null, 2), 'utf-8');
}

export function addDoneRecord(todo: TodoItem): void {
  const records = loadDoneHistory();
  // Avoid duplicate records for the same todo id
  if (records.some(r => r.id === todo.id)) return;
  const record: DoneRecord = {
    id: todo.id,
    content: todo.content,
    actualTime: todo.actualTime || 0,
    duration: todo.duration,
    tags: [...todo.tags],
    completedAt: todo.completedAt || new Date().toISOString(),
  };
  records.push(record);
  saveDoneHistory(records);
}

export function deleteDoneRecord(records: DoneRecord[], index: number): DoneRecord[] {
  if (index < 1 || index > records.length) return records;
  const newRecords = [...records];
  newRecords.splice(index - 1, 1);
  return newRecords;
}

export function deleteDoneRecordRange(records: DoneRecord[], from: number, to: number): DoneRecord[] {
  const start = Math.max(1, Math.min(from, to));
  const end = Math.min(records.length, Math.max(from, to));
  if (start > records.length || end < 1) return records;
  const newRecords = [...records];
  newRecords.splice(start - 1, end - start + 1);
  return newRecords;
}
