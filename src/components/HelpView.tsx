// ============================================================
// ClockNode - Help View Component
// ============================================================

import React from 'react';
import { Box, Text } from 'ink';

export const HelpView: React.FC = () => {
  const commands = [
    ['General', [
      ['/help, /h, /?', 'Show this help'],
      ['/mode N, /m N', 'Switch mode (1=Clock 2=Timer 3=Countdown 4=TodoCD)'],
      ['/theme N, /th N', 'Switch progress bar theme (1-8)'],
      ['/quit, /q', 'Exit ClockNode'],
    ]],
    ['Timer (Stopwatch)', [
      ['/timer, /tm', 'Start/toggle timer'],
      ['/pause, /pa', 'Pause'],
      ['/resume, /r', 'Resume'],
      ['/stop, /sp', 'Reset timer'],
    ]],
    ['Countdown', [
      ['/countdown N, /cd N', 'Start countdown (N minutes)'],
      ['/cd 01~04', 'Use preset (01=5m 02=10m 03=30m 04=60m)'],
      ['/pa, /r, /sp', 'Pause, resume, stop'],
    ]],
    ['TODO Management', [
      ['<text> [@N]', 'Add TODO (default 60m, @N sets minutes)'],
      ['#N <text> [@M]', 'Insert TODO at position N'],
      ['<text> @0N', 'Add TODO with preset time (01=5m...)'],
      ['/delete N|*, /d N|*', 'Delete TODO (* = all)'],
      ['/edit N .., /e N ..', 'Edit text | /e N #M move | /e N @M duration'],
      ['/done N|*, /ok N|*', 'Mark done (* = all pending)'],
      ['/undo N|*, /u N|*', 'Undo done (* = all completed)'],
      ['/tag N|* tag', 'Add tag (* = all items)'],
      ['/priority N|* L', 'Set priority h|m|l (* = all)'],
      ['/sort BY, /s BY', 'Sort (p=priority s=status c=created)'],
      ['/clear, /cl', 'Clear completed TODOs'],
      ['/reset, /rs', 'Reset all to pending'],
    ]],
    ['TODO Countdown', [
      ['/start N,N|*, /st N|*', 'Start countdown (* = all pending)'],
      ['/ok', 'Mark current task done, next task'],
      ['/pass, /ps', 'Skip current task'],
      ['/pause, /pa', 'Pause countdown'],
      ['/resume, /r', 'Resume countdown'],
      ['/stop, /sp', 'Stop entire flow'],
    ]],
  ];

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text color="cyan" bold>{'─── ClockNode Help ───'}</Text>
      {commands.map(([section, cmds], i) => (
        <Box key={i} flexDirection="column" marginTop={1}>
          <Text color="yellow" bold>{section as string}</Text>
          {(cmds as string[][]).map(([cmd, desc], j) => (
            <Box key={j}>
              <Text color="green">{`  ${(cmd as string).padEnd(24)}`}</Text>
              <Text color="gray">{desc as string}</Text>
            </Box>
          ))}
        </Box>
      ))}
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Press ↑/↓ to scroll TODO list
        </Text>
      </Box>
    </Box>
  );
};
