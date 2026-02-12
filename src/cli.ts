// ============================================================
// ClockNode - CLI Batch Commands (non-interactive mode)
// ============================================================
// Allows external tools to manipulate todos without starting the UI:
//   clocknode --add_task "#1 买菜 @30"
//   clocknode --done 2
//   clocknode --delete 3
//   clocknode --edit "1 新内容"
//   clocknode --list
//   clocknode --clear_done

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
} from './store.js';
import { TodoStatus } from './types.js';
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
      const idx = parseInt(value, 10);
      if (!idx || idx < 1) {
        results.push({ success: false, message: `Invalid index: ${value}` });
        i++;
        continue;
      }
      const todos = loadTodos();
      if (idx > todos.length) {
        results.push({ success: false, message: `Index ${idx} out of range (${todos.length} items)` });
      } else {
        const updated = markDone(todos, idx);
        saveTodos(updated);
        results.push({ success: true, message: `Completed item ${idx}: "${todos[idx - 1].content}"` });
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
      const idx = parseInt(value, 10);
      if (!idx || idx < 1) {
        results.push({ success: false, message: `Invalid index: ${value}` });
        i++;
        continue;
      }
      const todos = loadTodos();
      if (idx > todos.length) {
        results.push({ success: false, message: `Index ${idx} out of range (${todos.length} items)` });
      } else {
        const updated = markUndone(todos, idx);
        saveTodos(updated);
        results.push({ success: true, message: `Restored item ${idx} to pending` });
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
      const idx = parseInt(value, 10);
      if (!idx || idx < 1) {
        results.push({ success: false, message: `Invalid index: ${value}` });
        i++;
        continue;
      }
      const todos = loadTodos();
      if (idx > todos.length) {
        results.push({ success: false, message: `Index ${idx} out of range (${todos.length} items)` });
      } else {
        const name = todos[idx - 1].content;
        const updated = deleteTodo(todos, idx);
        saveTodos(updated);
        results.push({ success: true, message: `Deleted item ${idx}: "${name}"` });
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

    if (arg === '--clear_done' || arg === '--clear') {
      hasBatchCmd = true;
      const todos = loadTodos();
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
