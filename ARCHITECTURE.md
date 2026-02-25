# ClockNode Architecture

> Auto-generated from GitNexus knowledge graph (126 symbols, 288 relationships, 15 execution flows)

## Overview

ClockNode 是一个基于 **Ink/React** 的终端应用，提供时钟、计时器、倒计时和 TODO 任务管理功能。采用 **TypeScript 5.7 + ESM** 模块，支持两种运行模式：

- **交互式 TUI**：基于 Ink 渲染的终端 UI，通过斜杠命令（`/xxx`）操作
- **批量 CLI**：通过命令行参数（`--xxx`）进行非交互式批量操作

数据持久化到 `~/.clocknode/` 目录（JSON 文件）。

## Architecture Diagram

```mermaid
graph TB
    subgraph Entry["入口层"]
        INDEX["index.tsx<br/>入口分发"]
    end

    subgraph CLI["批量 CLI 模式"]
        HBCLI["cli.ts<br/>handleBatchCli"]
        ADDTASK["cli.ts<br/>addTask / editTask"]
    end

    subgraph UI["交互式 TUI 模式 (Ink/React)"]
        APP["App.tsx<br/>主组件 · 状态管理 · 命令路由"]
        subgraph Views["视图组件"]
            CLOCK["Clock.tsx"]
            TIMER["Timer.tsx"]
            COUNTDOWN["Countdown.tsx"]
            TODOCDV["TodoCountdownView.tsx"]
            TODOLIST["TodoList.tsx"]
            DONEVIEW["DoneHistoryView.tsx"]
            HELPVIEW["HelpView.tsx"]
            INPUTBAR["InputBar.tsx"]
        end
    end

    subgraph Core["核心层"]
        PARSER["parser.ts<br/>输入解析 · 别名映射"]
        COMMANDS["commands.ts<br/>命令定义 · 自动补全"]
        STORE["store.ts<br/>数据持久化 · CRUD"]
        TYPES["types.ts<br/>类型 · 枚举 · 接口"]
    end

    subgraph Services["服务层"]
        NOTIFY["notify.ts<br/>声音 · 系统通知"]
        UTILS["utils.ts<br/>格式化 · 进度条"]
        ICONS["icons.ts<br/>Emoji/ASCII 图标"]
        CONFIG["config.ts<br/>配置读写"]
    end

    subgraph Storage["持久化层"]
        FS[("~/.clocknode/<br/>todos.json<br/>done_history.json<br/>config.json")]
    end

    INDEX -->|"--help / --args"| HBCLI
    INDEX -->|"无参数"| APP

    HBCLI --> ADDTASK
    ADDTASK --> PARSER
    ADDTASK --> STORE
    HBCLI --> STORE

    APP --> CLOCK
    APP --> TIMER
    APP --> COUNTDOWN
    APP --> TODOCDV
    APP --> TODOLIST
    APP --> DONEVIEW
    APP --> HELPVIEW
    APP --> INPUTBAR

    INPUTBAR --> COMMANDS
    APP --> PARSER
    APP --> STORE
    APP --> NOTIFY
    APP --> UTILS
    APP --> CONFIG

    TODOCDV --> UTILS
    COUNTDOWN --> UTILS
    TODOLIST --> UTILS
    TODOLIST --> ICONS
    DONEVIEW --> ICONS

    STORE --> FS
    CONFIG --> FS

    style Entry fill:#4a9eff,color:#fff
    style CLI fill:#ff9f43,color:#fff
    style UI fill:#26de81,color:#fff
    style Core fill:#a55eea,color:#fff
    style Services fill:#fd9644,color:#fff
    style Storage fill:#778ca3,color:#fff
```

## Functional Areas

知识图谱识别了 **2 个功能社区**：

### 1. Components（40 symbols，71% cohesion）

核心应用逻辑和 UI 组件集群，包含：

| 模块 | 关键符号 | 职责 |
|------|----------|------|
| **App.tsx** | `App`, `onExit`, `onSignal`, `calcActualTime`, `requireConfirm`, `advanceTodoCountdown` | 全局状态、命令路由、生命周期管理 |
| **store.ts** | `loadTodos`, `saveTodos`, `markDone`, `resetAll`, `sortTodos`, `loadDoneHistory`, `deleteDoneRecordRange` | 数据 CRUD 与持久化 |
| **cli.ts** | `handleBatchCli` | 批量命令处理入口 |
| **views** | `TodoList`, `TodoCountdownView`, `DoneHistoryView`, `InputBar` | UI 渲染组件 |
| **utils.ts** | `formatTime`, `renderProgressBar`, `priorityLabel` | 显示格式化 |
| **commands.ts** | `matchCommands` | 命令匹配与自动补全 |

### 2. Task Creation（5 symbols，50% cohesion）

任务创建与输入解析管道：

| 符号 | 文件 | 职责 |
|------|------|------|
| `parseInput` | parser.ts | 解析用户输入为命令或待办 |
| `parseDuration` | parser.ts | 时长字符串解析（预设/分钟/小时） |
| `createTodo` | store.ts | 创建 TodoItem 对象 |
| `insertTodo` | store.ts | 插入到指定位置 |
| `addTask` | cli.ts | CLI 任务添加协调器 |

## Key Execution Flows

知识图谱追踪了 **15 条执行流**，按功能分为 5 大类：

### Flow 1: 批量 CLI 任务添加

```
handleBatchCli (cli.ts)
  → addTask (cli.ts)
    → parseInput (parser.ts)  →  parseDuration (parser.ts)
    → createTodo (store.ts)   →  insertTodo (store.ts)
    → loadTodos (store.ts)    →  ensureDir (store.ts)  →  ~/.clocknode/
```

用户通过 `--add_task "内容 @20m"` 添加任务，经过解析、创建、持久化的完整链路。

### Flow 2: 倒计时任务推进

```
advanceTodoCountdown (App.tsx)
  → addDoneRecord (store.ts)
    → loadDoneHistory (store.ts)
      → ensureDir (store.ts)  →  ~/.clocknode/done_history.json
  → triggerNotification (notify.ts)
    → playSound (notify.ts)            // BEL 声音
    → showSystemNotification (notify.ts) // 系统通知
```

任务完成时，记录到历史并触发声音+系统通知。

### Flow 3: 安全退出与进度保存

```
onExit / onSignal (App.tsx)
  → saveCountdownProgress (App.tsx)
    → saveTodos (store.ts)
      → ensureDir (store.ts)  →  ~/.clocknode/todos.json
```

`beforeExit`、`SIGINT`、`SIGTERM` 信号触发，确保倒计时进度不丢失。

### Flow 4: 通知系统

```
App (App.tsx)  /  advanceTodoCountdown (App.tsx)
  → triggerNotification (notify.ts)
    ├→ playSound (notify.ts)              // BEL 字符到 stderr/stdout
    └→ showSystemNotification (notify.ts)  // node-notifier 动态导入
```

倒计时结束、任务超时等场景同时触发终端铃声和操作系统原生通知。

### Flow 5: 输入自动补全

```
InputBar (InputBar.tsx)
  → getSuggestions (InputBar.tsx)
    → matchCommands (commands.ts)  // 前缀匹配 23 个命令的 name + aliases
```

用户输入 `/` 开头时实时匹配命令，最多显示 6 条建议。

## Data Flow

```mermaid
flowchart LR
    subgraph Input
        SLASH["/斜杠命令"]
        CLIPARAM["--CLI 参数"]
        TODO["任务文本"]
    end

    subgraph Processing
        PARSER["parser.ts"]
        APPCMD["App.tsx 命令路由"]
        CLICMD["cli.ts 批量处理"]
    end

    subgraph State
        TODOS["todos: TodoItem[]"]
        DONE["doneHistory: DoneRecord[]"]
        CFG["config: AppConfig"]
        TCDSTATE["todoCountdown: State"]
    end

    subgraph Persistence
        TF["todos.json"]
        DF["done_history.json"]
        CF["config.json"]
    end

    SLASH --> PARSER --> APPCMD
    CLIPARAM --> CLICMD
    TODO --> PARSER

    APPCMD --> TODOS
    APPCMD --> DONE
    APPCMD --> CFG
    APPCMD --> TCDSTATE
    CLICMD --> TODOS
    CLICMD --> DONE

    TODOS -->|"auto-save"| TF
    DONE -->|"auto-save"| DF
    CFG -->|"auto-save"| CF
    TF -->|"fs.watch"| TODOS
```

## Component Rendering Tree

```
App (column layout)
├── Header: "ClockNode | mode | /h for help"
├── ─────── (divider)
├── Clock (always visible, 1s refresh)
├── [Timer | Countdown | TodoCountdownView] (mode-dependent)
├── ─────── (divider)
├── [HelpView | DoneHistoryView | TodoList] (mutually exclusive)
├── ─────── (divider)
└── InputBar (autocomplete + notification)
```

## File Dependency Map

| File | Depends On | Depended By |
|------|-----------|-------------|
| `index.tsx` | App.tsx, cli.ts, types.ts | — (entry) |
| `App.tsx` | store, parser, notify, utils, config, icons, types, all views | index.tsx |
| `cli.ts` | store, parser, utils, icons, types | index.tsx |
| `store.ts` | types | App.tsx, cli.ts |
| `parser.ts` | types, commands | App.tsx, cli.ts |
| `commands.ts` | types | parser.ts, InputBar.tsx |
| `notify.ts` | types | App.tsx |
| `utils.ts` | types, icons | App.tsx, Countdown, TodoCountdownView, TodoList, cli.ts |
| `config.ts` | types | App.tsx |
| `icons.ts` | — | utils.ts, TodoList, DoneHistoryView, cli.ts |
| `types.ts` | — | all files |

## Knowledge Graph（知识图谱）

### 1. 完整模块依赖图

```mermaid
graph LR
    %% ===== 入口 =====
    INDEX(["index.tsx<br/>入口"])

    %% ===== 核心模块 =====
    APP["App.tsx"]
    CLI["cli.ts"]
    STORE["store.ts"]
    PARSER["parser.ts"]
    COMMANDS["commands.ts"]
    CONFIG["config.ts"]
    NOTIFY["notify.ts"]
    UTILS["utils.ts"]
    ICONS["icons.ts"]
    TYPES["types.ts"]

    %% ===== 组件 =====
    CLOCK["Clock.tsx"]
    TIMER["Timer.tsx"]
    COUNTDOWN["Countdown.tsx"]
    TODOCDV["TodoCountdownView.tsx"]
    TODOLIST["TodoList.tsx"]
    INPUTBAR["InputBar.tsx"]
    HELPVIEW["HelpView.tsx"]
    DONEVIEW["DoneHistoryView.tsx"]

    %% ===== 入口分发 =====
    INDEX -->|batch| CLI
    INDEX -->|interactive| APP

    %% ===== App → 组件 =====
    APP --> CLOCK
    APP --> TIMER
    APP --> COUNTDOWN
    APP --> TODOCDV
    APP --> TODOLIST
    APP --> INPUTBAR
    APP --> HELPVIEW
    APP --> DONEVIEW

    %% ===== App → 核心 =====
    APP --> STORE
    APP --> PARSER
    APP --> CONFIG
    APP --> NOTIFY
    APP --> UTILS
    APP --> ICONS

    %% ===== CLI → 核心 =====
    CLI --> STORE
    CLI --> PARSER
    CLI --> ICONS

    %% ===== 组件 → 服务 =====
    CLOCK --> UTILS
    CLOCK --> ICONS
    TIMER --> UTILS
    TIMER --> ICONS
    COUNTDOWN --> UTILS
    COUNTDOWN --> ICONS
    TODOCDV --> UTILS
    TODOCDV --> ICONS
    TODOLIST --> UTILS
    TODOLIST --> ICONS
    DONEVIEW --> UTILS
    DONEVIEW --> ICONS
    INPUTBAR --> COMMANDS
    INPUTBAR --> ICONS
    HELPVIEW --> ICONS

    %% ===== 核心互依赖 =====
    PARSER --> TYPES
    STORE --> TYPES
    CONFIG --> TYPES
    NOTIFY --> TYPES
    UTILS --> TYPES
    UTILS --> ICONS
    TYPES -.->|supportsEmoji| ICONS

    %% ===== 样式 =====
    classDef entry fill:#4a9eff,stroke:#2d7cd4,color:#fff
    classDef app fill:#26de81,stroke:#1aab60,color:#fff
    classDef component fill:#45d6b5,stroke:#2db391,color:#fff
    classDef core fill:#a55eea,stroke:#8044c6,color:#fff
    classDef service fill:#fd9644,stroke:#d47a2e,color:#fff

    class INDEX entry
    class APP app
    class CLOCK,TIMER,COUNTDOWN,TODOCDV,TODOLIST,INPUTBAR,HELPVIEW,DONEVIEW component
    class STORE,PARSER,COMMANDS,TYPES core
    class CONFIG,NOTIFY,UTILS,ICONS service
```

### 2. 执行流程图（15 条 Execution Flows）

```mermaid
flowchart TB
    subgraph F1["Flow 1: 批量 CLI 任务添加"]
        direction LR
        F1A["handleBatchCli"] --> F1B["addTask"]
        F1B --> F1C["parseInput"]
        F1C --> F1D["parseDuration"]
        F1B --> F1E["createTodo"]
        F1E --> F1F["insertTodo"]
        F1F --> F1G["ensureDir"]
        F1G --> F1H[("~/.clocknode/")]
    end

    subgraph F2["Flow 2: 交互式命令处理"]
        direction LR
        F2A["InputBar<br/>onSubmit"] --> F2B["parseInput"]
        F2B --> F2C["App.handleSubmit"]
        F2C --> F2D{"command<br/>or todo?"}
        F2D -->|command| F2E["命令路由<br/>switch(name)"]
        F2D -->|todo| F2F["createTodo<br/>→ insertTodo"]
    end

    subgraph F3["Flow 3: 倒计时任务推进"]
        direction LR
        F3A["advanceTodoCountdown"] --> F3B["addDoneRecord"]
        F3B --> F3C["loadDoneHistory"]
        F3C --> F3D["ensureDir"]
        F3A --> F3E["triggerNotification"]
        F3E --> F3F["playSound"]
        F3E --> F3G["showSystemNotification"]
    end

    subgraph F4["Flow 4: 安全退出"]
        direction LR
        F4A["onExit / onSignal"] --> F4B["saveCountdownProgress"]
        F4B --> F4C["saveTodos"]
        F4C --> F4D["ensureDir"]
        F4D --> F4E[("todos.json")]
    end

    subgraph F5["Flow 5: 输入自动补全"]
        direction LR
        F5A["InputBar"] --> F5B["getSuggestions"]
        F5B --> F5C["matchCommands"]
        F5C --> F5D["COMMANDS[]<br/>23 条命令"]
    end

    style F1 fill:#fff3e0,stroke:#ff9800
    style F2 fill:#e8f5e9,stroke:#4caf50
    style F3 fill:#e3f2fd,stroke:#2196f3
    style F4 fill:#fce4ec,stroke:#e91e63
    style F5 fill:#f3e5f5,stroke:#9c27b0
```

### 3. 状态管理与数据流图

```mermaid
stateDiagram-v2
    [*] --> Clock : 启动 (Mode.Clock)

    Clock --> Timer : /timer
    Clock --> Countdown : /countdown N
    Clock --> TodoCountdown : /start

    Timer --> Clock : /stop
    Countdown --> Clock : 完成 / /stop
    TodoCountdown --> Clock : 全部完成 / /stop

    TodoCountdown --> TodoCountdown : /next /skip /now

    state TodoCountdown {
        [*] --> Running
        Running --> Paused : /pause
        Paused --> Running : /resume
        Running --> Overtime : 时间到
        Overtime --> WaitingAction : 等待操作
        WaitingAction --> Running : /next (下一个任务)
    }

    state Countdown {
        [*] --> CDRunning
        CDRunning --> CDPaused : /pause
        CDPaused --> CDRunning : /resume
        CDRunning --> CDDone : 时间到
    }
```

### 4. 数据持久化知识图谱

```mermaid
graph TB
    subgraph Memory["内存状态 (App.tsx useState)"]
        TODOS["todos: TodoItem[]"]
        DONE["doneHistory: DoneRecord[]"]
        CFG["config: AppConfig"]
        TCD["todoCountdown: State"]
    end

    subgraph StoreAPI["store.ts API"]
        LT["loadTodos()"]
        ST["saveTodos()"]
        CT["createTodo()"]
        IT["insertTodo()"]
        DT["deleteTodo()"]
        MD["markDone()"]
        MU["markUndone()"]
        CD["clearDone()"]
        LDH["loadDoneHistory()"]
        SDH["saveDoneHistory()"]
        ADR["addDoneRecord()"]
    end

    subgraph Disk["~/.clocknode/ (JSON)"]
        TF[("todos.json")]
        DF[("done_history.json")]
        CF[("config.json")]
    end

    subgraph Triggers["触发机制"]
        UE1["useEffect:<br/>todos 变化 → 自动保存"]
        UE2["useEffect:<br/>config 变化 → 自动保存"]
        UE3["useEffect:<br/>fs.watch → 外部同步"]
        UE4["useEffect:<br/>退出信号 → 进度保存"]
        UE5["useEffect:<br/>每30秒 → actualTime 保存"]
    end

    TODOS --> UE1 --> ST --> TF
    CFG --> UE2 -->|saveConfig| CF
    TF --> UE3 --> LT --> TODOS
    TCD --> UE4 --> ST
    TCD --> UE5 --> ST

    CT --> TODOS
    IT --> TODOS
    DT --> TODOS
    MD --> TODOS
    MD --> ADR --> LDH --> DF
    ADR --> SDH --> DF

    LDH --> DONE
    CD --> TODOS

    classDef memory fill:#e3f2fd,stroke:#1976d2
    classDef api fill:#f3e5f5,stroke:#7b1fa2
    classDef disk fill:#fff3e0,stroke:#f57c00
    classDef trigger fill:#e8f5e9,stroke:#388e3c

    class TODOS,DONE,CFG,TCD memory
    class LT,ST,CT,IT,DT,MD,MU,CD,LDH,SDH,ADR api
    class TF,DF,CF disk
    class UE1,UE2,UE3,UE4,UE5 trigger
```

### 5. 类型关系图（核心数据模型）

```mermaid
classDiagram
    class TodoItem {
        +string id
        +string content
        +TodoStatus status
        +Priority priority
        +string[] tags
        +number duration
        +number actualTime
        +string createdAt
        +string completedAt
    }

    class DoneRecord {
        +string id
        +string content
        +number actualTime
        +number duration
        +string[] tags
        +string completedAt
    }

    class AppConfig {
        +boolean soundEnabled
        +boolean notificationEnabled
        +boolean textNotificationEnabled
        +number themeIndex
        +CustomProgressBar customProgressBar
    }

    class TodoCountdownState {
        +string[] queue
        +number currentIndex
        +boolean running
        +boolean overtime
        +number totalSeconds
        +number remainingSeconds
        +Record actualTimes
        +boolean waitingForAction
    }

    class CountdownState {
        +boolean running
        +number totalSeconds
        +number remainingSeconds
    }

    class TimerState {
        +boolean running
        +number elapsed
    }

    class ParsedCommand {
        +type: "command"
        +string name
        +string[] args
    }

    class ParsedTodo {
        +type: "todo"
        +string content
        +number position
        +number duration
        +string warning
    }

    class Mode {
        <<enumeration>>
        Clock = 1
        Timer = 2
        Countdown = 3
        TodoCountdown = 4
    }

    class Priority {
        <<enumeration>>
        High
        Mid
        Low
        None
    }

    class TodoStatus {
        <<enumeration>>
        Pending
        InProgress
        Done
    }

    TodoItem --> TodoStatus
    TodoItem --> Priority
    TodoCountdownState --> TodoItem : queue 引用 id
    DoneRecord <-- TodoItem : markDone 时生成
    ParsedTodo ..> TodoItem : createTodo 转换
```

### 6. 组件渲染树与 Props 流

```mermaid
graph TB
    APP["App.tsx<br/>━━━━━━━━━━━━━━<br/>State: mode, todos, config,<br/>timerState, countdownState,<br/>todoCountdown, doneHistory,<br/>notification, showHelp"]

    CLOCK["Clock.tsx"]
    TIMER["Timer.tsx<br/>Props: state, onToggle, onReset"]
    CD["Countdown.tsx<br/>Props: state, config, onPause, onResume"]
    TCV["TodoCountdownView.tsx<br/>Props: state, todos, config"]
    TL["TodoList.tsx<br/>Props: todos, scrollOffset, selectedIndex,<br/>todoCountdown"]
    HV["HelpView.tsx"]
    DHV["DoneHistoryView.tsx<br/>Props: records, scrollOffset"]
    IB["InputBar.tsx<br/>Props: value, onChange, onSubmit,<br/>notification, suggestions"]

    APP --> CLOCK
    APP -->|Mode.Timer| TIMER
    APP -->|Mode.Countdown| CD
    APP -->|Mode.TodoCountdown| TCV
    APP -->|showHelp| HV
    APP -->|showDoneHistory| DHV
    APP -->|default| TL
    APP --> IB

    IB -->|onSubmit| APP
    IB -->|onChange| APP

    classDef root fill:#26de81,stroke:#1aab60,color:#fff,stroke-width:2px
    classDef view fill:#45d6b5,stroke:#2db391,color:#fff
    classDef input fill:#4a9eff,stroke:#2d7cd4,color:#fff

    class APP root
    class CLOCK,TIMER,CD,TCV,TL,HV,DHV view
    class IB input
```
