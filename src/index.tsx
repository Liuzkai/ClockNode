#!/usr/bin/env node
// ============================================================
// ClockNode - Entry Point
// ============================================================

import React from 'react';
import { render } from 'ink';
import { App } from './components/App.js';
import { handleBatchCli } from './cli.js';
import { icons } from './icons.js';

// Parse CLI arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
  ClockNode - A CLI clock tool with timer, countdown, and TODO management

  Usage:
    clocknode                    Start in clock mode (default)
    clocknode --countdown 30     Start 30-minute countdown
    clocknode --countdown 01     Start preset countdown (01=5m, 02=10m, 03=30m, 04=60m)
    clocknode --timer            Start in timer mode

  Batch commands (non-interactive, for external tool integration):
    clocknode --add_task "buy groceries @30"       Add a task
    clocknode --add_task "#1 meeting @60"           Add at position #1
    clocknode --done 2                              Mark item 2 as done
    clocknode --undo 2                              Restore item 2 to pending
    clocknode --delete 3                            Delete item 3
    clocknode --edit "1 new content"                Edit item 1 content
    clocknode --edit "1 #3"                         Move item 1 to position 3
    clocknode --edit "1 @45"                        Change item 1 duration to 45m
    clocknode --list                                List all tasks
    clocknode --clear_done                          Remove completed tasks

  Multiple batch commands can be chained:
    clocknode --add_task "#1 task A @30" --add_task "#2 task B @60" --done 3

  Running instance auto-refreshes when batch commands modify tasks.

  Interactive commands:
    /h or /?                     Show help
    /m N                         Switch mode (1=Clock, 2=Timer, 3=Countdown, 4=TodoTimer)
    /q                           Quit

  For full command list, type /h inside the app.
`);
  process.exit(0);
}

// Try batch CLI mode first
const batchResults = handleBatchCli(args);
if (batchResults) {
  for (const r of batchResults) {
    console.log(r.success ? `${icons.check} ${r.message}` : `${icons.cross} ${r.message}`);
  }
  process.exit(batchResults.every(r => r.success) ? 0 : 1);
}

// Clear screen before rendering interactive UI
process.stdout.write('\x1B[2J\x1B[0f');

// Render the Ink app (interactive mode)
const { waitUntilExit } = render(React.createElement(App));

waitUntilExit().then(() => {
  process.exit(0);
});
