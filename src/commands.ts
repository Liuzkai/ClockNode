// ============================================================
// ClockNode - Command Definitions for autocomplete
// ============================================================

export interface CommandDef {
  /** Full command name */
  name: string;
  /** Short aliases */
  aliases: string[];
  /** Usage pattern */
  usage: string;
  /** Brief description */
  description: string;
}

export const COMMANDS: CommandDef[] = [
  {
    name: 'help',
    aliases: ['h', '?'],
    usage: '/help',
    description: 'Show/hide help panel',
  },
  {
    name: 'quit',
    aliases: ['q'],
    usage: '/quit',
    description: 'Exit ClockNode',
  },
  {
    name: 'mode',
    aliases: ['m'],
    usage: '/mode <1-4>',
    description: 'Switch mode (1=Clock 2=Timer 3=Countdown 4=TodoCD)',
  },
  {
    name: 'theme',
    aliases: ['th'],
    usage: '/theme <1-8>',
    description: 'Switch progress bar theme',
  },
  {
    name: 'timer',
    aliases: ['tm'],
    usage: '/timer',
    description: 'Start/switch to stopwatch mode',
  },
  {
    name: 'countdown',
    aliases: ['cd'],
    usage: '/countdown <min|01-04>',
    description: 'Start countdown (minutes or preset 01=5m 02=10m 03=30m 04=60m)',
  },
  {
    name: 'pause',
    aliases: ['pa'],
    usage: '/pause',
    description: 'Pause current timer/countdown',
  },
  {
    name: 'resume',
    aliases: ['r'],
    usage: '/resume',
    description: 'Resume paused timer/countdown',
  },
  {
    name: 'stop',
    aliases: ['sp'],
    usage: '/stop',
    description: 'Stop and reset timer/countdown',
  },
  {
    name: 'start',
    aliases: ['st'],
    usage: '/start <N,N,...|*>',
    description: 'Start sequential TODO countdown (* = all pending)',
  },
  {
    name: 'done',
    aliases: ['ok'],
    usage: '/done [N|*]',
    description: 'Mark TODO done (* = all), or complete current in countdown',
  },
  {
    name: 'undo',
    aliases: ['u'],
    usage: '/undo <N|*>',
    description: 'Restore to pending (* = all completed)',
  },
  {
    name: 'pass',
    aliases: ['ps'],
    usage: '/pass',
    description: 'Skip current task in TODO countdown',
  },
  {
    name: 'delete',
    aliases: ['d'],
    usage: '/delete <N|N-M|*>',
    description: 'Delete TODO item (N-M = range, * = all)',
  },
  {
    name: 'edit',
    aliases: ['e'],
    usage: '/edit <N> <text|#pos|@min>',
    description: 'Edit content, move (#N), or set duration (@N)',
  },
  {
    name: 'tag',
    aliases: ['t'],
    usage: '/tag <N|*> <tag>',
    description: 'Add tag to TODO item (* = all items)',
  },
  {
    name: 'priority',
    aliases: ['p'],
    usage: '/priority <N|*> <h|m|l>',
    description: 'Set priority (* = all items)',
  },
  {
    name: 'sort',
    aliases: ['s'],
    usage: '/sort <p|s|c>',
    description: 'Sort TODOs (p=priority s=status c=created)',
  },
  {
    name: 'clear',
    aliases: ['cl'],
    usage: '/clear',
    description: 'Remove all completed TODOs',
  },
  {
    name: 'reset',
    aliases: ['rs'],
    usage: '/reset',
    description: 'Reset all TODOs to pending (clear progress & status)',
  },
  {
    name: 'history',
    aliases: ['hi'],
    usage: '/history',
    description: 'Show/hide completed tasks history',
  },
  {
    name: 'back',
    aliases: ['b'],
    usage: '/back',
    description: 'Return from history view to TODO list',
  },
];

/**
 * Find matching commands given a partial input (after /).
 * Matches against full name and all aliases.
 */
export function matchCommands(partial: string): CommandDef[] {
  const lower = partial.toLowerCase();
  if (!lower) return COMMANDS;

  return COMMANDS.filter(cmd => {
    if (cmd.name.startsWith(lower)) return true;
    return cmd.aliases.some(a => a.startsWith(lower));
  });
}
