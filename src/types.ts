// ============================================================
// ClockNode - Type Definitions
// ============================================================

/** Application modes */
export enum Mode {
  Clock = 1,
  Timer = 2,
  Countdown = 3,
  TodoCountdown = 4,
}

/** Priority levels */
export enum Priority {
  High = 'high',
  Mid = 'mid',
  Low = 'low',
  None = 'none',
}

/** Todo item status */
export enum TodoStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Done = 'done',
}

/** A single TODO item */
export interface TodoItem {
  id: string;
  content: string;
  status: TodoStatus;
  priority: Priority;
  tags: string[];
  /** Duration in minutes (default 60) */
  duration: number;
  /** Actual time spent in seconds (tracked during todo countdown) */
  actualTime?: number;
  createdAt: string;
  completedAt?: string;
}

/** Countdown presets (index 01-04) */
export const COUNTDOWN_PRESETS: Record<string, number> = {
  '01': 5,
  '02': 10,
  '03': 30,
  '04': 60,
};

/** Progress bar theme */
export interface ProgressBarTheme {
  name: string;
  filled: string;
  empty: string;
}

import { supportsEmoji } from './icons.js';

/** Built-in progress bar themes */
export const PROGRESS_THEMES: ProgressBarTheme[] = supportsEmoji
  ? [
      { name: 'classic', filled: '█', empty: '░' },
      { name: 'block', filled: '■', empty: '□' },
      { name: 'circle', filled: '●', empty: '○' },
      { name: 'shade', filled: '▓', empty: '░' },
      { name: 'arrow', filled: '▸', empty: '▹' },
      { name: 'star', filled: '★', empty: '☆' },
      { name: 'diamond', filled: '◆', empty: '◇' },
      { name: 'heart', filled: '♥', empty: '♡' },
    ]
  : [
      { name: 'classic', filled: '#', empty: '-' },
      { name: 'block', filled: '#', empty: '.' },
      { name: 'arrow', filled: '=', empty: ' ' },
      { name: 'hash', filled: '#', empty: ' ' },
      { name: 'dot', filled: '.', empty: ' ' },
      { name: 'pipe', filled: '|', empty: ' ' },
    ];

/** Application configuration */
export interface AppConfig {
  /** Enable sound notification (BEL) */
  soundEnabled: boolean;
  /** Enable system notification */
  notificationEnabled: boolean;
  /** Enable text notification in UI */
  textNotificationEnabled: boolean;
  /** Progress bar theme index (0-based) */
  themeIndex: number;
  /** Custom progress bar characters (overrides theme) */
  customProgressBar?: {
    filled: string;
    empty: string;
  };
}

/** Default configuration */
export const DEFAULT_CONFIG: AppConfig = {
  soundEnabled: true,
  notificationEnabled: true,
  textNotificationEnabled: true,
  themeIndex: 0,
};

/** Timer state for stopwatch */
export interface TimerState {
  running: boolean;
  elapsed: number; // milliseconds
  startedAt?: number;
}

/** Countdown state */
export interface CountdownState {
  running: boolean;
  totalSeconds: number;
  remainingSeconds: number;
  startedAt?: number;
  pausedRemaining?: number;
}

/** Todo countdown flow state */
export interface TodoCountdownState {
  /** IDs of todos in the queue */
  queue: string[];
  /** Index of current todo in queue */
  currentIndex: number;
  /** Is the countdown/overtime timer running */
  running: boolean;
  /** Is this in overtime (countdown finished, user hasn't acted) */
  overtime: boolean;
  /** Countdown total seconds for current task */
  totalSeconds: number;
  /** Remaining seconds (negative means overtime) */
  remainingSeconds: number;
  /** Actual seconds spent per todo id */
  actualTimes: Record<string, number>;
  /** Start timestamp */
  startedAt?: number;
  /** Paused remaining */
  pausedRemaining?: number;
  /** Whether waiting for user action after countdown ends */
  waitingForAction: boolean;
  /** Actual time already accumulated before this session (for resume) */
  previousActualTime: number;
}

/** Command parse result */
export interface ParsedCommand {
  type: 'command';
  name: string;
  args: string[];
}

export interface ParsedTodo {
  type: 'todo';
  content: string;
  position?: number; // #N insert position
  duration: number; // minutes
}

export type ParsedInput = ParsedCommand | ParsedTodo;

/** A completed task record (persisted in done history) */
export interface DoneRecord {
  id: string;
  content: string;
  /** Actual time spent in seconds */
  actualTime: number;
  /** Duration in minutes (original estimate) */
  duration: number;
  tags: string[];
  completedAt: string;
}

/** Notification message */
export interface NotificationMessage {
  text: string;
  timestamp: number;
}
