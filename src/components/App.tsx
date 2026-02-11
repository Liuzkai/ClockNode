// ============================================================
// ClockNode - Main Application Component
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import fs from 'node:fs';
import {
  Mode,
  Priority,
  TodoStatus,
  COUNTDOWN_PRESETS,
  PROGRESS_THEMES,
  type AppConfig,
  type TodoItem,
  type TimerState,
  type CountdownState,
  type TodoCountdownState,
  type NotificationMessage,
  type DoneRecord,
} from '../types.js';
import { loadConfig, saveConfig } from '../config.js';
import {
  loadTodos,
  saveTodos,
  TODOS_FILE_PATH,
  createTodo,
  insertTodo,
  deleteTodo,
  editTodo,
  moveTodo,
  setDuration,
  markDone,
  markUndone,
  setTag,
  setPriority,
  sortTodos,
  clearDone,
  resetAll,
  loadDoneHistory,
  saveDoneHistory,
  addDoneRecord,
  deleteDoneRecord,
  deleteDoneRecordRange,
} from '../store.js';
import { parseInput } from '../parser.js';
import { triggerNotification } from '../notify.js';
import { formatTime } from '../utils.js';
import { icons } from '../icons.js';
import { Clock } from './Clock.js';
import { Timer } from './Timer.js';
import { Countdown } from './Countdown.js';
import { TodoList } from './TodoList.js';
import { TodoCountdownView } from './TodoCountdownView.js';
import { HelpView } from './HelpView.js';
import { InputBar, getSuggestions } from './InputBar.js';
import { DoneHistoryView } from './DoneHistoryView.js';

export const App: React.FC = () => {
  const { exit } = useApp();

  // Core state
  const [config, setConfig] = useState<AppConfig>(loadConfig);
  const [todos, setTodos] = useState<TodoItem[]>(loadTodos);
  const [mode, setMode] = useState<Mode>(Mode.Clock);

  // Keep a ref to latest todos so callbacks always see fresh state
  const todosRef = useRef(todos);
  useEffect(() => { todosRef.current = todos; }, [todos]);
  const [inputValue, setInputValue] = useState('');
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showDoneHistory, setShowDoneHistory] = useState(false);
  const [doneHistory, setDoneHistory] = useState<DoneRecord[]>(loadDoneHistory);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);

  // Input history
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [savedInput, setSavedInput] = useState('');

  // Key to force TextInput remount (resets internal cursor position)
  const [inputKey, setInputKey] = useState(0);

  // Timer (stopwatch) state
  const [timerState, setTimerState] = useState<TimerState>({
    running: false,
    elapsed: 0,
  });

  // Countdown state
  const [countdownState, setCountdownState] = useState<CountdownState>({
    running: false,
    totalSeconds: 0,
    remainingSeconds: 0,
  });

  // Todo countdown state
  const [todoCountdown, setTodoCountdown] = useState<TodoCountdownState | null>(null);

  // Keep a ref to latest todoCountdown so exit handlers always see fresh state
  const todoCountdownRef = useRef(todoCountdown);
  useEffect(() => { todoCountdownRef.current = todoCountdown; }, [todoCountdown]);

  // Confirmation for dangerous operations (e.g. /d *, /done *)
  const pendingConfirmRef = useRef<{ cmd: string; expires: number } | null>(null);
  const confirmTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persist on change
  const isSelfSaving = useRef(false);
  useEffect(() => {
    isSelfSaving.current = true;
    saveTodos(todos);
    // Small delay to let fs.watch debounce ignore our own write
    const timer = setTimeout(() => { isSelfSaving.current = false; }, 200);
    return () => clearTimeout(timer);
  }, [todos]);
  useEffect(() => { saveConfig(config); }, [config]);

  // Save todo countdown progress on process exit (e.g. terminal closed, Ctrl+C)
  useEffect(() => {
    const saveCountdownProgress = () => {
      const state = todoCountdownRef.current;
      if (!state) return;
      const currentId = state.queue[state.currentIndex];
      if (!currentId) return;

      // Calculate actual time spent (including previously accumulated time)
      const sessionElapsed = state.startedAt
        ? Math.floor((Date.now() - state.startedAt) / 1000) + (state.totalSeconds - (state.pausedRemaining ?? state.totalSeconds))
        : 0;
      const actualTime = state.previousActualTime + sessionElapsed;

      // Read latest todos from file (refs may be stale during exit)
      const latestTodos = todosRef.current;
      const updated = latestTodos.map(t =>
        t.id === currentId ? { ...t, actualTime } : t
      );
      saveTodos(updated);
    };

    const onExit = () => { saveCountdownProgress(); };
    const onSignal = () => { saveCountdownProgress(); process.exit(0); };

    process.on('beforeExit', onExit);
    process.on('SIGINT', onSignal);
    process.on('SIGTERM', onSignal);

    return () => {
      process.removeListener('beforeExit', onExit);
      process.removeListener('SIGINT', onSignal);
      process.removeListener('SIGTERM', onSignal);
    };
  }, []);

  // Watch todos.json for external changes (batch CLI commands)
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const watcher = fs.watch(TODOS_FILE_PATH, () => {
      if (isSelfSaving.current) return;
      // Debounce: multiple rapid events from a single write
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        try {
          const fresh = loadTodos();
          isSelfSaving.current = true;
          setTodos(fresh);
          setTimeout(() => { isSelfSaving.current = false; }, 200);
        } catch {
          // ignore read errors
        }
      }, 100);
    });
    return () => {
      watcher.close();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, []);

  // Countdown completion check
  useEffect(() => {
    if (!countdownState.running) return;
    const timer = setInterval(() => {
      if (countdownState.startedAt) {
        const elapsed = Math.floor((Date.now() - countdownState.startedAt) / 1000);
        const base = countdownState.pausedRemaining ?? countdownState.totalSeconds;
        if (base - elapsed <= 0) {
          setCountdownState(s => ({
            ...s,
            running: false,
            remainingSeconds: 0,
          }));
          notify(`${icons.clock} Countdown finished!`);
          triggerNotification(config, 'ClockNode', 'Countdown finished!');
        }
      }
    }, 500);
    return () => clearInterval(timer);
  }, [countdownState.running, countdownState.startedAt, countdownState.totalSeconds, countdownState.pausedRemaining]);

  // Track whether we already fired the overtime notification for the current task
  const overtimeNotifiedRef = useRef(false);
  // Reset when the current task changes or overtime resets
  useEffect(() => {
    if (!todoCountdown?.overtime) overtimeNotifiedRef.current = false;
  }, [todoCountdown?.currentIndex, todoCountdown?.overtime]);

  // Todo countdown tick
  useEffect(() => {
    if (!todoCountdown || !todoCountdown.running) return;
    const timer = setInterval(() => {
      if (todoCountdown.startedAt) {
        const elapsed = Math.floor((Date.now() - todoCountdown.startedAt) / 1000);
        const base = todoCountdown.pausedRemaining ?? todoCountdown.totalSeconds;
        const rem = base - elapsed;

        // Fire notification OUTSIDE of setState to ensure reliable execution
        if (rem <= 0 && !todoCountdown.overtime && !overtimeNotifiedRef.current) {
          overtimeNotifiedRef.current = true;
          const id = todoCountdown.queue[todoCountdown.currentIndex];
          const t = todosRef.current.find(x => x.id === id);
          const taskName = t?.content || '?';
          triggerNotification(config, 'ClockNode', `Task "${taskName}" time is up!`);
          notify(`${icons.clock} Task time is up! Use /ok to complete or /ps to skip`);
        }

        setTodoCountdown(s => {
          if (!s || !s.running) return s;
          const newState = { ...s, remainingSeconds: rem };
          if (rem <= 0 && !s.overtime && !s.waitingForAction) {
            newState.overtime = true;
            newState.waitingForAction = true;
          }
          return newState;
        });
      }
    }, 500);
    return () => clearInterval(timer);
  }, [todoCountdown?.running, todoCountdown?.startedAt, todoCountdown?.totalSeconds, todoCountdown?.pausedRemaining, todoCountdown?.overtime]);

  // Periodically save actualTime to disk (every 30s) for crash resilience
  useEffect(() => {
    if (!todoCountdown || !todoCountdown.running) return;
    const timer = setInterval(() => {
      const state = todoCountdownRef.current;
      if (!state || !state.running) return;
      const currentId = state.queue[state.currentIndex];
      if (!currentId) return;
      const sessionElapsed = state.startedAt
        ? Math.floor((Date.now() - state.startedAt) / 1000) + (state.totalSeconds - (state.pausedRemaining ?? state.totalSeconds))
        : 0;
      const actualTime = state.previousActualTime + sessionElapsed;
      setTodos(prev => prev.map(t =>
        t.id === currentId ? { ...t, actualTime } : t
      ));
    }, 30000);
    return () => clearInterval(timer);
  }, [todoCountdown?.running, todoCountdown?.currentIndex]);

  const notify = useCallback((text: string) => {
    setNotification({ text, timestamp: Date.now() });
  }, []);

  // Handle arrow keys for scrolling, autocomplete navigation, and history
  useInput((input, key) => {
    const suggestions = getSuggestions(inputValue);
    const hasSuggestions = suggestions.length > 0;

    if (key.upArrow) {
      if (hasSuggestions) {
        setSelectedSuggestion(i => Math.max(0, i - 1));
      } else if (inputHistory.length > 0) {
        // Navigate history (up = older)
        setHistoryIndex(prev => {
          const next = prev + 1;
          if (next >= inputHistory.length) return prev;
          if (prev === -1) setSavedInput(inputValue); // save current input
          setInputValue(inputHistory[inputHistory.length - 1 - next]);
          setInputKey(k => k + 1);
          return next;
        });
      } else {
        setScrollOffset(o => Math.max(0, o - 1));
      }
    }
    if (key.downArrow) {
      if (hasSuggestions) {
        setSelectedSuggestion(i => Math.min(suggestions.length - 1, i + 1));
      } else if (historyIndex >= 0) {
        // Navigate history (down = newer)
        setHistoryIndex(prev => {
          const next = prev - 1;
          if (next < 0) {
            setInputValue(savedInput);
            setInputKey(k => k + 1);
            return -1;
          }
          setInputValue(inputHistory[inputHistory.length - 1 - next]);
          setInputKey(k => k + 1);
          return next;
        });
      } else {
        const maxItems = showDoneHistory ? doneHistory.length : todos.length;
        setScrollOffset(o => Math.min(Math.max(0, maxItems - 10), o + 1));
      }
    }
    if (key.tab && hasSuggestions) {
      const idx = Math.min(selectedSuggestion, suggestions.length - 1);
      const selected = suggestions[idx];
      if (selected) {
        setInputValue(`/${selected.name} `);
        setSelectedSuggestion(0);
        setInputKey(k => k + 1); // force TextInput remount to reset cursor
      }
    }
    if (key.escape) {
      setInputValue('');
      setSelectedSuggestion(0);
      setHistoryIndex(-1);
      setInputKey(k => k + 1);
    }
  });

  // Reset suggestion index and history browsing when user types
  // Also detect pasted multi-line text and process each line as a separate input
  const handleInputChange = useCallback((newValue: string) => {
    if (newValue.includes('\n') || newValue.includes('\r')) {
      const lines = newValue.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length > 1) {
        // Multi-line paste: process each line as a separate submission
        let added = 0;
        for (const line of lines) {
          const parsed = parseInput(line);
          if (parsed && parsed.type === 'todo') {
            const todo = createTodo(parsed.content, parsed.duration);
            setTodos(prev => insertTodo(prev, todo, parsed.position));
            added++;
          }
        }
        setInputValue('');
        if (added > 0) {
          notify(`${icons.check} Added ${added} tasks from paste`);
        }
        return;
      }
      // Single line with trailing newline — strip it and set normally
      setInputValue(lines[0] || '');
      setSelectedSuggestion(0);
      setHistoryIndex(-1);
      return;
    }
    setInputValue(newValue);
    setSelectedSuggestion(0);
    setHistoryIndex(-1);
  }, [todos]);

  // Calculate actual time spent for current todo countdown task
  const calcActualTime = (state: TodoCountdownState): number => {
    const sessionElapsed = state.startedAt
      ? Math.floor((Date.now() - state.startedAt) / 1000) + (state.totalSeconds - (state.pausedRemaining ?? state.totalSeconds))
      : 0;
    return state.previousActualTime + sessionElapsed;
  };

  // Move to next todo in countdown queue
  const advanceTodoCountdown = (currentState: TodoCountdownState, markComplete: boolean) => {
    const currentId = currentState.queue[currentState.currentIndex];
    const actualTime = calcActualTime(currentState);

    // Update actual time on the todo
    setTodos(prev => prev.map(t =>
      t.id === currentId
        ? {
            ...t,
            actualTime,
            status: markComplete ? TodoStatus.Done : t.status,
            completedAt: markComplete ? new Date().toISOString() : t.completedAt,
          }
        : t
    ));

    // Record to done history when marking complete
    if (markComplete) {
      const todo = todosRef.current.find(t => t.id === currentId);
      if (todo) {
        addDoneRecord({ ...todo, actualTime, completedAt: new Date().toISOString() });
        setDoneHistory(loadDoneHistory());
      }
    }

    const updatedActualTimes = { ...currentState.actualTimes, [currentId]: actualTime };

    // Use latest todos via ref to check real-time status
    const latestTodos = todosRef.current;

    // Find next task in queue that is not already done
    let nextIndex = currentState.currentIndex + 1;
    const skippedNames: string[] = [];
    while (nextIndex < currentState.queue.length) {
      const candidateId = currentState.queue[nextIndex];
      const candidateTodo = latestTodos.find(t => t.id === candidateId);
      if (!candidateTodo) {
        // Task was deleted
        skippedNames.push('(deleted)');
        nextIndex++;
        continue;
      }
      if (candidateTodo.status === TodoStatus.Done) {
        skippedNames.push(`"${candidateTodo.content}"(done)`);
        nextIndex++;
        continue;
      }
      break;
    }

    if (skippedNames.length > 0) {
      notify(`${icons.skip} Skipped: ${skippedNames.join(', ')}`);
    }

    if (nextIndex >= currentState.queue.length) {
      // All done
      setTodoCountdown(null);
      setMode(Mode.Clock);
      notify(`${icons.party} All tasks completed!`);
      triggerNotification(config, 'ClockNode', 'All tasks completed!');
      return;
    }

    // Start next task, resume from previous progress
    const nextTodoId = currentState.queue[nextIndex];
    const nextTodo = latestTodos.find(t => t.id === nextTodoId);
    const nextTotalSec = (nextTodo?.duration || 60) * 60;
    const alreadySpent = nextTodo?.actualTime || 0;
    const nextRemainSec = nextTotalSec - alreadySpent;

    setTodoCountdown({
      queue: currentState.queue,
      currentIndex: nextIndex,
      running: true,
      overtime: nextRemainSec <= 0,
      totalSeconds: nextTotalSec,
      remainingSeconds: nextRemainSec,
      actualTimes: updatedActualTimes,
      startedAt: Date.now(),
      pausedRemaining: nextRemainSec,
      waitingForAction: nextRemainSec <= 0,
      previousActualTime: alreadySpent,
    });

    // Mark the new task as in-progress
    setTodos(prev => prev.map(t =>
      t.id === nextTodoId ? { ...t, status: TodoStatus.InProgress } : t
    ));

    const resumeHint = alreadySpent > 0 ? ` (resuming from ${formatTime(alreadySpent)})` : '';
    notify(`${icons.play} Next task: ${nextTodo?.content || '?'}${resumeHint}`);
  };

  /**
   * Check confirmation for dangerous operations.
   * Returns true if confirmed (second identical input within timeout), false if pending.
   * Shows a live countdown in the notification area.
   */
  const requireConfirm = (cmdKey: string, warningMsg: string): boolean => {
    const pending = pendingConfirmRef.current;
    if (pending && pending.cmd === cmdKey && Date.now() < pending.expires) {
      // Confirmed — clear pending state and timer
      pendingConfirmRef.current = null;
      if (confirmTimerRef.current) {
        clearInterval(confirmTimerRef.current);
        confirmTimerRef.current = null;
      }
      return true;
    }

    // Start new confirmation with live countdown
    const duration = 5;
    const expiresAt = Date.now() + duration * 1000;
    pendingConfirmRef.current = { cmd: cmdKey, expires: expiresAt };

    // Clear any previous timer
    if (confirmTimerRef.current) clearInterval(confirmTimerRef.current);

    // Show initial notification
    notify(`${icons.warning} ${warningMsg} — repeat to confirm (${duration}s)`);

    // Update countdown every second
    confirmTimerRef.current = setInterval(() => {
      const remaining = Math.ceil((expiresAt - Date.now()) / 1000);
      if (remaining <= 0) {
        // Expired
        pendingConfirmRef.current = null;
        if (confirmTimerRef.current) {
          clearInterval(confirmTimerRef.current);
          confirmTimerRef.current = null;
        }
        setNotification(null);
      } else {
        setNotification({ text: `${icons.warning} ${warningMsg} — repeat to confirm (${remaining}s)`, timestamp: Date.now() });
      }
    }, 1000);

    return false;
  };

  // Handle submitted input
  const handleSubmit = useCallback((value: string) => {
    const trimmed = value.trim();
    setInputValue('');
    setHistoryIndex(-1);
    setSavedInput('');

    // Record to history (skip empty and duplicates)
    if (trimmed) {
      setInputHistory(prev => {
        const filtered = prev.filter(h => h !== trimmed);
        return [...filtered, trimmed];
      });
    }

    const parsed = parseInput(value);
    if (!parsed) return;

    if (parsed.type === 'todo') {
      const todo = createTodo(parsed.content, parsed.duration);
      setTodos(prev => insertTodo(prev, todo, parsed.position));
      notify(`${icons.check} Added: "${parsed.content}" (@${parsed.duration}m)`);
      return;
    }

    // Command handling
    const { name, args } = parsed;

    switch (name) {
      case 'help': {
        setShowHelp(h => !h);
        setShowDoneHistory(false);
        break;
      }

      case 'quit': {
        // Save countdown progress before exiting
        if (todoCountdown) {
          const currentId = todoCountdown.queue[todoCountdown.currentIndex];
          if (currentId) {
            const actualTime = calcActualTime(todoCountdown);
            const updated = todos.map(t =>
              t.id === currentId ? { ...t, actualTime } : t
            );
            saveTodos(updated);
          }
        }
        exit();
        break;
      }

      case 'mode': {
        const m = parseInt(args[0], 10);
        if (m >= 1 && m <= 4) {
          setMode(m as Mode);
          const names = ['', 'Clock', 'Timer', 'Countdown', 'Todo Countdown'];
          notify(`Mode: ${names[m]}`);
        } else {
          notify('Invalid mode. Use 1-4.');
        }
        break;
      }

      case 'theme': {
        const t = parseInt(args[0], 10);
        if (t >= 1 && t <= PROGRESS_THEMES.length) {
          setConfig(c => ({ ...c, themeIndex: t - 1 }));
          notify(`Theme: ${PROGRESS_THEMES[t - 1].name} (${PROGRESS_THEMES[t - 1].filled}${PROGRESS_THEMES[t - 1].empty})`);
        } else {
          notify(`Invalid theme. Use 1-${PROGRESS_THEMES.length}.`);
        }
        break;
      }

      // Timer commands
      case 'timer': {
        setMode(Mode.Timer);
        if (!timerState.running) {
          setTimerState(s => ({
            ...s,
            running: true,
            startedAt: Date.now(),
          }));
          notify(`${icons.timer} Timer started`);
        }
        break;
      }

      // Countdown commands
      case 'countdown': {
        setMode(Mode.Countdown);
        const raw = args[0];
        if (!raw) {
          notify('Usage: /cd <minutes> or /cd 01-04 for presets');
          break;
        }
        let minutes: number;
        if (raw.startsWith('0') && raw.length === 2 && COUNTDOWN_PRESETS[raw]) {
          minutes = COUNTDOWN_PRESETS[raw];
        } else {
          minutes = parseInt(raw, 10);
        }
        if (!minutes || minutes <= 0) {
          notify('Invalid time.');
          break;
        }
        const totalSec = minutes * 60;
        setCountdownState({
          running: true,
          totalSeconds: totalSec,
          remainingSeconds: totalSec,
          startedAt: Date.now(),
        });
        notify(`${icons.countdown} Countdown: ${minutes} minutes`);
        break;
      }

      // Pause
      case 'pause': {
        if (mode === Mode.Timer && timerState.running) {
          const now = Date.now();
          const elapsed = timerState.elapsed + (timerState.startedAt ? now - timerState.startedAt : 0);
          setTimerState({ running: false, elapsed });
          notify(`${icons.pause} Timer paused`);
        }
        if (mode === Mode.Countdown && countdownState.running) {
          const elapsed = countdownState.startedAt
            ? Math.floor((Date.now() - countdownState.startedAt) / 1000)
            : 0;
          const rem = (countdownState.pausedRemaining ?? countdownState.totalSeconds) - elapsed;
          setCountdownState(s => ({
            ...s,
            running: false,
            remainingSeconds: Math.max(0, rem),
            pausedRemaining: Math.max(0, rem),
            startedAt: undefined,
          }));
          notify(`${icons.pause} Countdown paused`);
        }
        if (mode === Mode.TodoCountdown && todoCountdown?.running) {
          const elapsed = todoCountdown.startedAt
            ? Math.floor((Date.now() - todoCountdown.startedAt) / 1000)
            : 0;
          const base = todoCountdown.pausedRemaining ?? todoCountdown.totalSeconds;
          const rem = base - elapsed;
          // Save actualTime on pause so progress persists if terminal is closed
          const currentId = todoCountdown.queue[todoCountdown.currentIndex];
          const actualTime = calcActualTime(todoCountdown);
          setTodos(prev => prev.map(t =>
            t.id === currentId ? { ...t, actualTime } : t
          ));
          setTodoCountdown(s => s ? ({
            ...s,
            running: false,
            remainingSeconds: rem,
            pausedRemaining: rem,
            startedAt: undefined,
          }) : null);
          notify(`${icons.pause} Task countdown paused`);
        }
        break;
      }

      // Resume
      case 'resume': {
        if (mode === Mode.Timer && !timerState.running && timerState.elapsed > 0) {
          setTimerState(s => ({ ...s, running: true, startedAt: Date.now() }));
          notify(`${icons.play} Timer resumed`);
        }
        if (mode === Mode.Countdown && !countdownState.running && countdownState.remainingSeconds > 0) {
          setCountdownState(s => ({
            ...s,
            running: true,
            startedAt: Date.now(),
            pausedRemaining: s.remainingSeconds,
          }));
          notify(`${icons.play} Countdown resumed`);
        }
        if (mode === Mode.TodoCountdown && todoCountdown && !todoCountdown.running) {
          setTodoCountdown(s => s ? ({
            ...s,
            running: true,
            startedAt: Date.now(),
            pausedRemaining: s.remainingSeconds,
          }) : null);
          notify(`${icons.play} Task countdown resumed`);
        }
        break;
      }

      // Stop / Reset
      case 'stop': {
        if (mode === Mode.Timer) {
          setTimerState({ running: false, elapsed: 0 });
          notify(`${icons.stop} Timer reset`);
        }
        if (mode === Mode.Countdown) {
          setCountdownState({ running: false, totalSeconds: 0, remainingSeconds: 0 });
          notify(`${icons.stop} Countdown stopped`);
        }
        if (mode === Mode.TodoCountdown && todoCountdown) {
          // Record actual time for current task
          const currentId = todoCountdown.queue[todoCountdown.currentIndex];
          const actualTime = calcActualTime(todoCountdown);
          setTodos(prev => prev.map(t =>
            t.id === currentId ? { ...t, actualTime } : t
          ));
          setTodoCountdown(null);
          setMode(Mode.Clock);
          notify(`${icons.stop} Todo countdown stopped`);
        }
        break;
      }

      // TODO commands
      case 'delete': {
        // In done history mode, delete from history
        if (showDoneHistory) {
          if (args[0] === '*') {
            if (!requireConfirm('delete-history*', `Delete ALL ${doneHistory.length} history records?`)) break;
            setDoneHistory([]);
            saveDoneHistory([]);
            notify('Deleted all history records');
          } else {
            const rangeMatch = args[0]?.match(/^(\d+)-(\d+)$/);
            if (rangeMatch) {
              const from = parseInt(rangeMatch[1], 10);
              const to = parseInt(rangeMatch[2], 10);
              setDoneHistory(prev => {
                const updated = deleteDoneRecordRange(prev, from, to);
                saveDoneHistory(updated);
                return updated;
              });
              const count = Math.min(Math.max(from, to), doneHistory.length) - Math.max(1, Math.min(from, to)) + 1;
              notify(`Deleted history records ${Math.min(from, to)}-${Math.max(from, to)} (${Math.max(0, count)} items)`);
            } else {
              const idx = parseInt(args[0], 10);
              if (idx) {
                setDoneHistory(prev => {
                  const updated = deleteDoneRecord(prev, idx);
                  saveDoneHistory(updated);
                  return updated;
                });
                notify(`Deleted history record ${idx}`);
              }
            }
          }
          break;
        }

        if (args[0] === '*') {
          if (!requireConfirm('delete*', `Delete ALL ${todos.length} items?`)) break;
          // Record done items to history before deleting
          todos.forEach(t => {
            if (t.status === TodoStatus.Done) addDoneRecord(t);
          });
          setDoneHistory(loadDoneHistory());
          setTodos([]);
          notify('Deleted all items');
        } else {
          const rangeMatch = args[0]?.match(/^(\d+)-(\d+)$/);
          if (rangeMatch) {
            const from = parseInt(rangeMatch[1], 10);
            const to = parseInt(rangeMatch[2], 10);
            const start = Math.max(1, Math.min(from, to));
            const end = Math.min(todos.length, Math.max(from, to));
            if (start <= todos.length && end >= 1) {
              // Record done items to history before deleting
              for (let i = start - 1; i < end; i++) {
                if (todos[i].status === TodoStatus.Done) addDoneRecord(todos[i]);
              }
              setDoneHistory(loadDoneHistory());
              setTodos(prev => {
                const newTodos = [...prev];
                newTodos.splice(start - 1, end - start + 1);
                return newTodos;
              });
              notify(`Deleted items ${start}-${end} (${end - start + 1} items)`);
            }
          } else {
            const idx = parseInt(args[0], 10);
            if (idx && idx >= 1 && idx <= todos.length) {
              // Record done item to history before deleting
              if (todos[idx - 1].status === TodoStatus.Done) {
                addDoneRecord(todos[idx - 1]);
                setDoneHistory(loadDoneHistory());
              }
              setTodos(prev => deleteTodo(prev, idx));
              notify(`Deleted item ${idx}`);
            }
          }
        }
        break;
      }

      case 'edit': {
        const idx = parseInt(args[0], 10);
        if (!idx || idx < 1 || idx > todos.length) break;
        const arg = args[1];

        // No second arg: populate input bar with task info for editing
        if (!arg) {
          const todo = todos[idx - 1];
          const tagsStr = todo.tags.length > 0 ? ` ${todo.tags.map(t => `#${t}`).join(' ')}` : '';
          setInputValue(`/e ${idx} ${todo.content}${tagsStr} @${todo.duration}`);
          setInputKey(k => k + 1);
          return; // Don't clear input or record to history
        }

        if (arg.startsWith('#') && !args[2]) {
          // Move: /edit 1 #2
          const toIdx = parseInt(arg.slice(1), 10);
          if (toIdx) {
            setTodos(prev => moveTodo(prev, idx, toIdx));
            notify(`Moved item ${idx} → position ${toIdx}`);
          }
        } else if (arg.startsWith('@') && !args[2]) {
          // Change duration only: /edit 1 @55
          const dur = parseInt(arg.slice(1), 10);
          if (dur && dur > 0) {
            setTodos(prev => setDuration(prev, idx, dur));
            notify(`Set item ${idx} duration to ${dur}m`);
          }
        } else {
          // Edit content (and optionally duration): /edit 1 new text @30
          let text = args.slice(1).join(' ');
          let newDuration: number | undefined;
          const durMatch = text.match(/\s+@(\d+)\s*$/);
          if (durMatch) {
            newDuration = parseInt(durMatch[1], 10);
            text = text.slice(0, -durMatch[0].length).trim();
          }
          if (text) {
            setTodos(prev => prev.map((t, i) =>
              i === idx - 1
                ? { ...t, content: text, ...(newDuration && newDuration > 0 ? { duration: newDuration } : {}) }
                : t
            ));
            const durHint = newDuration ? ` (@${newDuration}m)` : '';
            notify(`Edited item ${idx}${durHint}`);
          }
        }
        break;
      }

      case 'done': {
        if (mode === Mode.TodoCountdown && todoCountdown && !args[0]) {
          // Mark current task done and advance
          advanceTodoCountdown(todoCountdown, true);
        } else if (args[0] === '*') {
          const pending = todos.filter(t => t.status !== TodoStatus.Done);
          const count = pending.length;
          const now = new Date().toISOString();
          // Record all newly completed items to done history
          pending.forEach(t => {
            addDoneRecord({ ...t, status: TodoStatus.Done, completedAt: now });
          });
          setDoneHistory(loadDoneHistory());
          setTodos(prev => prev.map(t => t.status !== TodoStatus.Done
            ? { ...t, status: TodoStatus.Done, completedAt: now }
            : t));
          notify(`Completed all ${count} items`);
        } else {
          const idx = parseInt(args[0], 10);
          if (idx && idx >= 1 && idx <= todos.length) {
            const todo = todos[idx - 1];
            if (todo.status !== TodoStatus.Done) {
              const completedAt = new Date().toISOString();
              addDoneRecord({ ...todo, status: TodoStatus.Done, completedAt });
              setDoneHistory(loadDoneHistory());
            }
            setTodos(prev => markDone(prev, idx));
            notify(`Completed item ${idx}`);
          }
        }
        break;
      }

      case 'undo': {
        if (args[0] === '*') {
          const count = todos.filter(t => t.status === TodoStatus.Done).length;
          setTodos(prev => prev.map(t => t.status === TodoStatus.Done
            ? { ...t, status: TodoStatus.Pending, completedAt: undefined }
            : t));
          notify(`Restored ${count} items to pending`);
        } else {
          const idx = parseInt(args[0], 10);
          if (idx) {
            setTodos(prev => markUndone(prev, idx));
            notify(`Restored item ${idx} to pending`);
          }
        }
        break;
      }

      case 'tag': {
        if (args[0] === '*') {
          const tag = args[1];
          if (tag) {
            setTodos(prev => prev.map(t => {
              const tags = t.tags.includes(tag) ? t.tags : [...t.tags, tag];
              return { ...t, tags };
            }));
            notify(`Tagged all items with #${tag}`);
          }
        } else {
          const idx = parseInt(args[0], 10);
          const tag = args[1];
          if (idx && tag) {
            setTodos(prev => setTag(prev, idx, tag));
            notify(`Tagged item ${idx} with #${tag}`);
          }
        }
        break;
      }

      case 'priority': {
        const pMap: Record<string, Priority> = { h: Priority.High, m: Priority.Mid, l: Priority.Low, high: Priority.High, mid: Priority.Mid, low: Priority.Low };
        if (args[0] === '*') {
          const rawP = args[1]?.toLowerCase();
          const p = pMap[rawP];
          if (p) {
            setTodos(prev => prev.map(t => ({ ...t, priority: p })));
            notify(`Set all items priority to ${p}`);
          }
        } else {
          const idx = parseInt(args[0], 10);
          const rawP = args[1]?.toLowerCase();
          const p = pMap[rawP];
          if (idx && p) {
            setTodos(prev => setPriority(prev, idx, p));
            notify(`Set item ${idx} priority to ${p}`);
          }
        }
        break;
      }

      case 'sort': {
        const by = args[0] || 'priority';
        setTodos(prev => sortTodos(prev, by));
        notify(`Sorted by ${by}`);
        break;
      }

      case 'clear': {
        // Record done items to history before clearing
        todos.forEach(t => {
          if (t.status === TodoStatus.Done) addDoneRecord(t);
        });
        setDoneHistory(loadDoneHistory());
        setTodos(prev => clearDone(prev));
        notify('Cleared completed items');
        break;
      }

      case 'reset': {
        // Stop any running todo countdown
        if (todoCountdown) {
          setTodoCountdown(null);
          setMode(Mode.Clock);
        }
        setTodos(prev => resetAll(prev));
        notify(`${icons.reset} All tasks reset to pending`);
        break;
      }

      // Start todo countdown
      case 'start': {
        let indices: number[];
        if (args[0] === '*') {
          // All non-done tasks in order
          indices = todos
            .map((t, i) => t.status !== TodoStatus.Done ? i + 1 : -1)
            .filter(i => i > 0);
        } else {
          // Support both "/start 1 2 3" and "/start 1,2,3"
          indices = args.join(',').split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n >= 1);
        }
        if (indices.length === 0) {
          notify(args[0] === '*' ? 'No pending tasks.' : 'Usage: /st 1 2 3  or  /st *');
          break;
        }

        // Collect new input ids: skip out-of-range and done
        const skipped: string[] = [];
        const newInputIds: string[] = [];
        for (const i of indices) {
          if (i > todos.length) {
            skipped.push(`#${i}(not found)`);
            continue;
          }
          const t = todos[i - 1];
          if (t.status === TodoStatus.Done) {
            skipped.push(`#${i}(done)`);
            continue;
          }
          if (!newInputIds.includes(t.id)) {
            newInputIds.push(t.id);
          }
        }

        if (skipped.length > 0) {
          notify(`Skipped: ${skipped.join(', ')}`);
        }

        // If a countdown is already running, merge into existing queue
        if (todoCountdown && mode === Mode.TodoCountdown) {
          const oldQueue = todoCountdown.queue;
          const currentIdx = todoCountdown.currentIndex;
          const currentId = oldQueue[currentIdx];

          // Part 1: the currently running task stays
          const mergedQueue: string[] = [currentId];

          // Part 2: old queue items after current that are NOT in newInputIds and NOT done
          for (let qi = currentIdx + 1; qi < oldQueue.length; qi++) {
            const id = oldQueue[qi];
            if (newInputIds.includes(id)) continue; // will be repositioned by new input
            const t = todos.find(x => x.id === id);
            if (t && t.status !== TodoStatus.Done) {
              mergedQueue.push(id);
            }
          }

          // Part 3: new input items (skip current task if it's already running, skip duplicates)
          for (const id of newInputIds) {
            if (id === currentId) continue; // already at position 0
            if (!mergedQueue.includes(id)) {
              mergedQueue.push(id);
            }
          }

          // Update the countdown state with merged queue, keep current task running
          setTodoCountdown(prev => prev ? {
            ...prev,
            queue: mergedQueue,
            currentIndex: 0, // current task is always at index 0 in merged queue
          } : prev);

          const queueDisplay = mergedQueue.map(id => {
            const idx = todos.findIndex(t => t.id === id) + 1;
            return `#${idx}`;
          }).join(' → ');
          notify(`Queue updated: ${queueDisplay}`);
        } else {
          // No countdown running, start fresh
          if (newInputIds.length === 0) {
            notify('No pending tasks to start.');
            break;
          }

          const firstTodo = todos.find(t => t.id === newInputIds[0])!;
          const totalSec = (firstTodo.duration || 60) * 60;
          const alreadySpent = firstTodo.actualTime || 0;
          const remainSec = totalSec - alreadySpent;

          setTodos(prev => prev.map(t =>
            t.id === newInputIds[0] ? { ...t, status: TodoStatus.InProgress } : t
          ));

          setMode(Mode.TodoCountdown);
          setTodoCountdown({
            queue: newInputIds,
            currentIndex: 0,
            running: true,
            overtime: remainSec <= 0,
            totalSeconds: totalSec,
            remainingSeconds: remainSec,
            actualTimes: {},
            startedAt: Date.now(),
            pausedRemaining: remainSec,
            waitingForAction: remainSec <= 0,
            previousActualTime: alreadySpent,
          });
          const resumeHint = alreadySpent > 0 ? ` (resuming from ${formatTime(alreadySpent)})` : '';
          notify(`${icons.play} Started: ${firstTodo.content} (${firstTodo.duration || 60}m)${resumeHint}`);
        }
        break;
      }

      // Pass/skip current todo
      case 'pass': {
        if (mode === Mode.TodoCountdown && todoCountdown) {
          advanceTodoCountdown(todoCountdown, false);
          notify(`${icons.skip} Skipped current task`);
        }
        break;
      }

      case 'history': {
        setShowDoneHistory(h => !h);
        setShowHelp(false);
        setScrollOffset(0);
        if (!showDoneHistory) {
          setDoneHistory(loadDoneHistory());
        }
        break;
      }

      case 'back': {
        if (showDoneHistory) {
          setShowDoneHistory(false);
          setScrollOffset(0);
        }
        break;
      }

      default: {
        notify(`Unknown command: /${name}. Type /h for help.`);
        break;
      }
    }
  }, [mode, timerState, countdownState, todoCountdown, todos, config, exit, showDoneHistory, doneHistory]);

  const modeNames: Record<number, string> = {
    [Mode.Clock]: `${icons.clockMode} Clock`,
    [Mode.Timer]: `${icons.timer} Timer`,
    [Mode.Countdown]: `${icons.countdown} Countdown`,
    [Mode.TodoCountdown]: `${icons.todoTimer} Todo Timer`,
  };

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box paddingX={1}>
        <Text color="magentaBright" bold>ClockNode</Text>
        <Text color="gray"> {icons.separator} </Text>
        <Text color="cyan">{modeNames[mode]}</Text>
        <Text color="gray"> {icons.separator} /h for help</Text>
      </Box>
      <Box paddingX={1}>
        <Text color="gray">{icons.hLine.repeat(50)}</Text>
      </Box>

      {/* Clock always visible */}
      <Clock />

      {/* Mode-specific display */}
      {mode === Mode.Timer && (
        <>
          <Box paddingX={1}><Text color="gray">{icons.hLine.repeat(50)}</Text></Box>
          <Timer state={timerState} />
        </>
      )}

      {mode === Mode.Countdown && (
        <>
          <Box paddingX={1}><Text color="gray">{icons.hLine.repeat(50)}</Text></Box>
          <Countdown state={countdownState} config={config} />
        </>
      )}

      {mode === Mode.TodoCountdown && todoCountdown && (
        <>
          <Box paddingX={1}><Text color="gray">{icons.hLine.repeat(50)}</Text></Box>
          <TodoCountdownView state={todoCountdown} todos={todos} config={config} />
        </>
      )}

      {/* Separator */}
      <Box paddingX={1}><Text color="gray">{icons.hLine.repeat(50)}</Text></Box>

      {/* Help, Done History, or TODO list */}
      {showHelp ? (
        <HelpView />
      ) : showDoneHistory ? (
        <DoneHistoryView
          records={doneHistory}
          scrollOffset={scrollOffset}
          viewHeight={15}
        />
      ) : (
        <TodoList
          todos={todos}
          todoCountdown={todoCountdown}
          scrollOffset={scrollOffset}
          viewHeight={15}
        />
      )}

      {/* Separator */}
      <Box paddingX={1}><Text color="gray">{icons.hLine.repeat(50)}</Text></Box>
      <InputBar
        value={inputValue}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        notification={notification}
        selectedSuggestion={selectedSuggestion}
        historyIndex={historyIndex}
        historyLength={inputHistory.length}
        inputKey={inputKey}
      />
    </Box>
  );
};
