# ClockNode

A feature-rich terminal clock, timer, and TODO management tool built with [React Ink](https://github.com/vadimdemedes/ink).

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-yellow)

## Features

- **Real-time Clock** — Date, time, and day-of-week display in the terminal
- **Stopwatch Timer** — Precision to 1/100s with pause/resume
- **Countdown Timer** — Custom duration or built-in presets (5/10/30/60 min)
- **TODO List** — Full CRUD with priority, tags, and duration tracking
- **TODO Countdown Queue** — Sequential task countdowns with overtime tracking, progress recovery, and queue merging
- **Wildcard `*` Support** — Batch operations on all items (`/done *`, `/delete *`, `/start *`, etc.)
- **Dangerous Op Confirmation** — `/delete *` requires repeat-to-confirm with live countdown
- **Multi-line Paste** — Paste multiple lines to add multiple tasks at once
- **System Notifications** — BEL sound + OS-level notifications (via `node-notifier`)
- **Auto-Complete** — Command suggestions with ghost text and Tab completion
- **Input History** — Browse previous inputs with ↑/↓ arrows
- **Batch CLI** — Scriptable commands for external tool integration (e.g., AHK, cron)
- **Live Sync** — Running instances auto-refresh when `todos.json` is modified externally
- **Customizable Themes** — 8 built-in progress bar themes

## Installation

```bash
git clone https://github.com/your-username/ClockNode.git
cd ClockNode
npm install
npm run build
npm link   # makes `clocknode` / `cn` available globally
```

## Usage

### Interactive Mode

```bash
clocknode    # or: cn
```

This launches the full terminal UI with clock, TODO list, and input bar.

### Batch CLI Mode

Operate on TODOs from scripts or external tools without launching the UI:

```bash
# Add a task (30-minute duration)
clocknode --add_task "Write documentation @30"
clocknode -a "Review PR @15"

# Mark task #2 as done
clocknode --done 2

# Undo (revert to pending)
clocknode --undo 3

# Delete task #1
clocknode --delete 1
clocknode --del 1

# Edit task #2
clocknode --edit 2 "Updated content @45"

# List all tasks
clocknode --list
clocknode -l

# Clear completed tasks
clocknode --clear_done

# Chain multiple operations
clocknode --add_task "Task A @10" --add_task "Task B @20" --done 1
```

## Commands Reference

All commands start with `/` in the interactive UI.

### General

| Command | Alias | Description |
|---------|-------|-------------|
| `/help` | `h` | Toggle help panel |
| `/quit` | `q` | Exit application |
| `/mode <1-4>` | `m` | Switch view (1=Clock, 2=Timer, 3=Countdown, 4=TodoCountdown) |
| `/theme <0-7>` | - | Change progress bar theme |

### Timer (Stopwatch)

| Command | Alias | Description |
|---------|-------|-------------|
| `/timer` | `t` | Start/restart stopwatch |
| `/pause` | `p` | Pause timer/countdown |
| `/resume` | `r` | Resume timer/countdown |
| `/stop` | `st` | Stop and reset timer/countdown |

### Countdown

| Command | Alias | Description |
|---------|-------|-------------|
| `/countdown <min>` | `cd` | Start countdown (e.g., `/cd 25`) |
| `/countdown <preset>` | `cd` | Use preset: `01`=5m, `02`=10m, `03`=30m, `04`=60m |

### TODO Management

| Command | Alias | Description |
|---------|-------|-------------|
| `/delete <N\|*>` | `d` | Delete task #N (`*` = delete all) |
| `/edit <N> <text>` | `e` | Edit task #N content |
| `/done <N\|*>` | `ok` | Mark task done (`*` = all pending) |
| `/undo <N\|*>` | `u` | Revert to pending (`*` = all completed) |
| `/tag <N\|*> <tag>` | `t` | Set tag (`*` = all items) |
| `/priority <N\|*> <h\|m\|l>` | `p` | Set priority (`*` = all items) |
| `/sort` | `s` | Sort by priority (High → Mid → Low → None) |
| `/clear` | `cl` | Remove all completed tasks |
| `/reset` | `rs` | Reset all tasks to pending state |

### TODO Countdown Queue

| Command | Alias | Description |
|---------|-------|-------------|
| `/start <N,...\|*>` | `st` | Start countdown queue (`*` = all pending in order) |
| `/done` | `ok` | Complete current task and advance to next |
| `/pass` | `ps` | Skip current task and advance to next |
| `/pause` | `p` | Pause the current countdown |
| `/resume` | `r` | Resume the paused countdown |
| `/stop` | `st` | Stop the entire countdown queue |

### Adding a TODO

Simply type text (without `/`) to add a task:

```
Buy groceries @30          # 30-minute task
#2 Review code @15         # Insert at position #2, 15 minutes
Deploy release             # Default 60-minute duration
```

**Multi-line paste**: Copy multiple lines and paste them into the input — each line is added as a separate task automatically.

## Countdown Queue Behavior

- **Skip completed**: Already-done tasks are auto-skipped with a notification
- **Resume progress**: Tasks with prior `actualTime` resume from where they left off
- **Queue merging**: Running `/start` while a countdown is active merges queues:
  1. Current task continues
  2. Old queue items not in the new list are retained
  3. New items are appended
- **Live status check**: When advancing to the next task, the current status is verified — done/deleted tasks are skipped
- **Overtime tracking**: When a task's countdown reaches 0, it enters overtime mode and waits for `/ok` (done) or `/ps` (skip)

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Accept auto-complete suggestion |
| `↑` / `↓` | Browse input history / navigate suggestions |
| `↑` / `↓` (in list) | Scroll TODO list |

## Configuration

Settings are stored in `~/.clocknode/config.json`:

```json
{
  "soundEnabled": true,
  "notificationEnabled": true,
  "textNotificationEnabled": true,
  "themeIndex": 0
}
```

TODO data is persisted in `~/.clocknode/todos.json`.

## Progress Bar Themes

Switch with `/theme <index>`:

| Index | Name | Preview |
|-------|------|---------|
| 0 | classic | `█████░░░░░` |
| 1 | block | `■■■■■□□□□□` |
| 2 | circle | `●●●●●○○○○○` |
| 3 | shade | `▓▓▓▓▓░░░░░` |
| 4 | arrow | `▸▸▸▸▸▹▹▹▹▹` |
| 5 | star | `★★★★★☆☆☆☆☆` |
| 6 | diamond | `◆◆◆◆◆◇◇◇◇◇` |
| 7 | heart | `♥♥♥♥♥♡♡♡♡♡` |

## Project Structure

```
src/
├── index.tsx              # Entry point — CLI arg parsing, batch mode or Ink UI
├── types.ts               # Type definitions, enums, interfaces, presets
├── store.ts               # TODO CRUD — load/save to ~/.clocknode/todos.json
├── config.ts              # Config load/save — ~/.clocknode/config.json
├── parser.ts              # Input parser — commands (/cmd) vs TODO items (text @dur)
├── commands.ts            # Command definitions, aliases, auto-complete matching
├── notify.ts              # Notification helpers — BEL sound + node-notifier
├── utils.ts               # Formatting (time, progress bar, clock display)
├── cli.ts                 # Batch CLI handler (--add_task, --done, --list, etc.)
└── components/
    ├── App.tsx             # Main component — state, commands, countdown logic
    ├── Clock.tsx           # Real-time clock display
    ├── Timer.tsx           # Stopwatch with ms precision
    ├── Countdown.tsx       # Countdown timer with progress bar
    ├── TodoList.tsx        # Scrollable TODO list with status/priority/tags
    ├── TodoCountdownView.tsx  # Active task countdown with overtime display
    ├── HelpView.tsx        # Command reference panel
    └── InputBar.tsx        # Input with auto-complete, ghost text, notifications
```

### Data Flow

```
User Input → InputBar → parseInput() → App.handleSubmit()
  ├── Command → switch(name) dispatches to handler
  └── TODO text → createTodo() → setTodos() → saveTodos() → todos.json

External (Batch CLI):
  clocknode --add_task "..." → handleBatchCli() → store ops → todos.json
  → fs.watch detects change → setTodos(loadTodos()) → UI auto-refreshes
```

## Tech Stack

| Technology | Purpose |
|---|---|
| [Ink](https://github.com/vadimdemedes/ink) | React for terminal UIs |
| [React 18](https://react.dev/) | Component model & state management |
| [TypeScript 5.7](https://www.typescriptlang.org/) | Type safety |
| [node-notifier](https://github.com/mikaelbr/node-notifier) | Cross-platform OS notifications |
| [chalk](https://github.com/chalk/chalk) | Terminal string styling |
| [ink-text-input](https://github.com/vadimdemedes/ink-text-input) | Text input component for Ink |

## Development

```bash
npm run dev      # Run with tsx (hot reload)
npm run build    # Compile TypeScript to dist/
npm start        # Run compiled output
```

## License

MIT
