// ============================================================
// ClockNode - CLI Batch Commands (non-interactive mode)
// ============================================================
// Allows external tools to manipulate todos without starting the UI:
//   clocknode --add_task "#1 买菜 @30"
//   clocknode --done 2          --done *
//   clocknode --undo 3          --undo *
//   clocknode --delete 3        --delete 1-5   --delete *
//   clocknode --edit "1 新内容"
//   clocknode --tag 1 work      --tag * work
//   clocknode --priority 1 h    --priority * m
//   clocknode --sort p
//   clocknode --list
//   clocknode --clear_done
//   clocknode --reset
//   clocknode --history

import { parseInput, parseDuration } from './parser.js';
import {
  loadTodos,
  saveTodos,
  createTodo,
  insertTodo,
  deleteTodo,
  editTodo,
  moveTodo,
  setDuration,
  markDone,
  markUndone,
  clearDone,
  resetAll,
  setTag,
  setPriority,
  sortTodos,
  addDoneRecord,
  loadDoneHistory,
  saveDoneHistory,
  deleteDoneRecord,
  deleteDoneRecordRange,
} from './store.js';
import { TodoStatus, Priority } from './types.js';
import { icons } from './icons.js';

interface CliResult {
  success: boolean;
  message: string;
}

/**
 * Try to handle batch CLI arguments.
 * Returns null if no batch command was found (should launch UI instead).
 */
export function handleBatchCli(args: string[]): CliResult[] | null {
  const results: CliResult[] = [];
  let i = 0;
  let hasBatchCmd = false;

  while (i < args.length) {
    const arg = args[i];

    if (arg === '--add_task' || arg === '--add' || arg === '-a') {
      hasBatchCmd = true;
      const value = args[++i];
      if (!value) {
        results.push({ success: false, message: 'Missing task content for --add_task' });
        i++;
        continue;
      }
      const res = addTask(value);
      results.push(res);
      i++;
      continue;
    }

    if (arg === '--done') {
      hasBatchCmd = true;
      const value = args[++i];
      if (!value) {
        results.push({ success: false, message: 'Missing index for --done' });
        i++;
        continue;
      }
      const todos = loadTodos();
      if (value === '*') {
        let count = 0;
        let updated = [...todos];
        for (let j = 0; j < updated.length; j++) {
          if (updated[j].status === TodoStatus.Pending) {
            updated = markDone(updated, j + 1);
            addDoneRecord(updated[j]);
            count++;
          }
        }
        saveTodos(updated);
        results.push({ success: true, message: `Completed ${count} pending items.` });
      } else {
        const idx = parseInt(value, 10);
        if (!idx || idx < 1) {
          results.push({ success: false, message: `Invalid index: ${value}` });
          i++;
          continue;
        }
        if (idx > todos.length) {
          results.push({ success: false, message: `Index ${idx} out of range (${todos.length} items)` });
        } else {
          const updated = markDone(todos, idx);
          saveTodos(updated);
          addDoneRecord(updated[idx - 1]);
          results.push({ success: true, message: `Completed item ${idx}: "${todos[idx - 1].content}"` });
        }
      }
      i++;
      continue;
    }

    if (arg === '--undo') {
      hasBatchCmd = true;
      const value = args[++i];
      if (!value) {
        results.push({ success: false, message: 'Missing index for --undo' });
        i++;
        continue;
      }
      const todos = loadTodos();
      if (value === '*') {
        let count = 0;
        let updated = [...todos];
        for (let j = 0; j < updated.length; j++) {
          if (updated[j].status === TodoStatus.Done) {
            updated = markUndone(updated, j + 1);
            count++;
          }
        }
        saveTodos(updated);
        results.push({ success: true, message: `Restored ${count} items to pending.` });
      } else {
        const idx = parseInt(value, 10);
        if (!idx || idx < 1) {
          results.push({ success: false, message: `Invalid index: ${value}` });
          i++;
          continue;
        }
        if (idx > todos.length) {
          results.push({ success: false, message: `Index ${idx} out of range (${todos.length} items)` });
        } else {
          const updated = markUndone(todos, idx);
          saveTodos(updated);
          results.push({ success: true, message: `Restored item ${idx} to pending` });
        }
      }
      i++;
      continue;
    }

    if (arg === '--delete' || arg === '--del') {
      hasBatchCmd = true;
      const value = args[++i];
      if (!value) {
        results.push({ success: false, message: 'Missing index for --delete' });
        i++;
        continue;
      }
      const todos = loadTodos();
      if (value === '*') {
        // Record done items to history before deleting all
        for (const t of todos) {
          if (t.status === TodoStatus.Done) addDoneRecord(t);
        }
        saveTodos([]);
        results.push({ success: true, message: `Deleted all ${todos.length} items.` });
      } else if (value.includes('-')) {
        const [fromStr, toStr] = value.split('-');
        const from = parseInt(fromStr, 10);
        const to = parseInt(toStr, 10);
        if (!from || !to || from < 1 || to < 1) {
          results.push({ success: false, message: `Invalid range: ${value}` });
          i++;
          continue;
        }
        const start = Math.max(1, Math.min(from, to));
        const end = Math.min(todos.length, Math.max(from, to));
        // Record done items in range to history
        for (let j = start - 1; j < end; j++) {
          if (todos[j].status === TodoStatus.Done) addDoneRecord(todos[j]);
        }
        const updated = [...todos];
        updated.splice(start - 1, end - start + 1);
        saveTodos(updated);
        results.push({ success: true, message: `Deleted items ${start}-${end}.` });
      } else {
        const idx = parseInt(value, 10);
        if (!idx || idx < 1) {
          results.push({ success: false, message: `Invalid index: ${value}` });
          i++;
          continue;
        }
        if (idx > todos.length) {
          results.push({ success: false, message: `Index ${idx} out of range (${todos.length} items)` });
        } else {
          if (todos[idx - 1].status === TodoStatus.Done) addDoneRecord(todos[idx - 1]);
          const name = todos[idx - 1].content;
          const updated = deleteTodo(todos, idx);
          saveTodos(updated);
          results.push({ success: true, message: `Deleted item ${idx}: "${name}"` });
        }
      }
      i++;
      continue;
    }

    if (arg === '--edit') {
      hasBatchCmd = true;
      const value = args[++i];
      if (!value) {
        results.push({ success: false, message: 'Missing args for --edit' });
        i++;
        continue;
      }
      const res = editTask(value);
      results.push(res);
      i++;
      continue;
    }

    if (arg === '--list' || arg === '--ls' || arg === '-l') {
      hasBatchCmd = true;
      const todos = loadTodos();
      if (todos.length === 0) {
        results.push({ success: true, message: 'TODO list is empty.' });
      } else {
        const lines = todos.map((t, i) => {
          const idx = String(i + 1).padStart(2, ' ');
          const status = t.status === TodoStatus.Done ? icons.done
            : t.status === TodoStatus.InProgress ? icons.inProgress
            : icons.pending;
          const dur = `@${t.duration}m`;
          return `${idx}. ${status} ${t.content} ${dur}`;
        });
        results.push({ success: true, message: `TODO List (${todos.length} items):\n${lines.join('\n')}` });
      }
      i++;
      continue;
    }

    if (arg === '--tag') {
      hasBatchCmd = true;
      const idxStr = args[++i];
      const tagVal = args[++i];
      if (!idxStr || !tagVal) {
        results.push({ success: false, message: 'Usage: --tag <N|*> <tag>' });
        i++;
        continue;
      }
      const todos = loadTodos();
      if (idxStr === '*') {
        let updated = [...todos];
        for (let j = 0; j < updated.length; j++) {
          updated = setTag(updated, j + 1, tagVal);
        }
        saveTodos(updated);
        results.push({ success: true, message: `Tagged all ${updated.length} items with "${tagVal}"` });
      } else {
        const idx = parseInt(idxStr, 10);
        if (!idx || idx < 1) {
          results.push({ success: false, message: `Invalid index: ${idxStr}` });
          i++;
          continue;
        }
        if (idx > todos.length) {
          results.push({ success: false, message: `Index ${idx} out of range (${todos.length} items)` });
        } else {
          const updated = setTag(todos, idx, tagVal);
          saveTodos(updated);
          results.push({ success: true, message: `Tagged item ${idx} with "${tagVal}"` });
        }
      }
      i++;
      continue;
    }

    if (arg === '--priority') {
      hasBatchCmd = true;
      const idxStr = args[++i];
      const prioStr = args[++i];
      if (!idxStr || !prioStr) {
        results.push({ success: false, message: 'Usage: --priority <N|*> <h|m|l>' });
        i++;
        continue;
      }
      const prioMap: Record<string, Priority> = { h: Priority.High, m: Priority.Mid, l: Priority.Low };
      const prio = prioMap[prioStr.toLowerCase()];
      if (!prio) {
        results.push({ success: false, message: `Invalid priority: "${prioStr}". Use h, m, or l.` });
        i++;
        continue;
      }
      const todos = loadTodos();
      if (idxStr === '*') {
        let updated = [...todos];
        for (let j = 0; j < updated.length; j++) {
          updated = setPriority(updated, j + 1, prio);
        }
        saveTodos(updated);
        results.push({ success: true, message: `Set priority of all ${updated.length} items to ${prio}` });
      } else {
        const idx = parseInt(idxStr, 10);
        if (!idx || idx < 1) {
          results.push({ success: false, message: `Invalid index: ${idxStr}` });
          i++;
          continue;
        }
        if (idx > todos.length) {
          results.push({ success: false, message: `Index ${idx} out of range (${todos.length} items)` });
        } else {
          const updated = setPriority(todos, idx, prio);
          saveTodos(updated);
          results.push({ success: true, message: `Set item ${idx} priority to ${prio}` });
        }
      }
      i++;
      continue;
    }

    if (arg === '--sort') {
      hasBatchCmd = true;
      const byStr = args[++i];
      if (!byStr) {
        results.push({ success: false, message: 'Usage: --sort <p|s|c>' });
        i++;
        continue;
      }
      const validSort = ['p', 's', 'c', 'priority', 'status', 'created'];
      if (!validSort.includes(byStr.toLowerCase())) {
        results.push({ success: false, message: `Invalid sort key: "${byStr}". Use p, s, or c.` });
        i++;
        continue;
      }
      const todos = loadTodos();
      const updated = sortTodos(todos, byStr.toLowerCase());
      saveTodos(updated);
      results.push({ success: true, message: `Sorted TODOs by ${byStr}` });
      i++;
      continue;
    }

    if (arg === '--reset') {
      hasBatchCmd = true;
      const todos = loadTodos();
      const updated = resetAll(todos);
      saveTodos(updated);
      results.push({ success: true, message: `Reset ${updated.length} items to pending.` });
      i++;
      continue;
    }

    if (arg === '--history') {
      hasBatchCmd = true;
      const records = loadDoneHistory();
      if (records.length === 0) {
        results.push({ success: true, message: 'Done history is empty.' });
      } else {
        const lines = records.map((r, j) => {
          const idx = String(j + 1).padStart(2, ' ');
          const d = new Date(r.completedAt);
          const dateStr = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
          const totalSec = r.actualTime || 0;
          const hh = String(Math.floor(totalSec / 3600)).padStart(1, '0');
          const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
          const ss = String(totalSec % 60).padStart(2, '0');
          const timeStr = `${hh}:${mm}:${ss}`;
          const tags = r.tags.length > 0 ? ` #${r.tags.join(' #')}` : '';
          return `#${idx} ${dateStr}  ${r.content}  ${timeStr}${tags}`;
        });
        results.push({ success: true, message: `Done History (${records.length} items):\n${lines.join('\n')}` });
      }
      i++;
      continue;
    }

    if (arg === '--clear_done' || arg === '--clear') {
      hasBatchCmd = true;
      const todos = loadTodos();
      // Record done items to history before clearing
      for (const t of todos) {
        if (t.status === TodoStatus.Done) addDoneRecord(t);
      }
      const updated = clearDone(todos);
      const removed = todos.length - updated.length;
      saveTodos(updated);
      results.push({ success: true, message: `Cleared ${removed} completed items.` });
      i++;
      continue;
    }

    // Not a batch command argument, skip
    i++;
  }

  return hasBatchCmd ? results : null;
}

function addTask(raw: string): CliResult {
  const parsed = parseInput(raw);
  if (!parsed) {
    return { success: false, message: `Failed to parse: "${raw}"` };
  }
  if (parsed.type !== 'todo') {
    return { success: false, message: `Not a valid task format: "${raw}". Don't include / prefix.` };
  }

  const todos = loadTodos();
  const todo = createTodo(parsed.content, parsed.duration);
  const updated = insertTodo(todos, todo, parsed.position);
  saveTodos(updated);

  const posStr = parsed.position ? ` at #${parsed.position}` : '';
  return { success: true, message: `Added${posStr}: "${parsed.content}" (@${parsed.duration}m)` };
}

function editTask(raw: string): CliResult {
  const parts = raw.trim().split(/\s+/);
  const idx = parseInt(parts[0], 10);
  if (!idx || idx < 1) {
    return { success: false, message: `Invalid index in edit: "${raw}"` };
  }

  const todos = loadTodos();
  if (idx > todos.length) {
    return { success: false, message: `Index ${idx} out of range (${todos.length} items)` };
  }

  const arg = parts[1];
  if (!arg) {
    return { success: false, message: 'Missing edit content. Usage: --edit "N new text" or "N #M" or "N @M"' };
  }

  if (arg.startsWith('#')) {
    const toIdx = parseInt(arg.slice(1), 10);
    if (toIdx) {
      const updated = moveTodo(todos, idx, toIdx);
      saveTodos(updated);
      return { success: true, message: `Moved item ${idx} → position ${toIdx}` };
    }
  } else if (arg.startsWith('@')) {
    const durResult = parseDuration(arg.slice(1));
    if (durResult.warning) {
      return { success: false, message: durResult.warning };
    }
    if (durResult.minutes > 0) {
      const updated = setDuration(todos, idx, durResult.minutes);
      saveTodos(updated);
      return { success: true, message: `Set item ${idx} duration to ${durResult.minutes}m` };
    }
  } else {
    const text = parts.slice(1).join(' ');
    if (text) {
      const updated = editTodo(todos, idx, text);
      saveTodos(updated);
      return { success: true, message: `Edited item ${idx}: "${text}"` };
    }
  }

  return { success: false, message: `Invalid edit args: "${raw}"` };
}
