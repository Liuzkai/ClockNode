// ============================================================
// ClockNode - Stopwatch Timer Component
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { Box, Text } from 'ink';
import { formatMs } from '../utils.js';
import type { TimerState } from '../types.js';
import { icons } from '../icons.js';

interface TimerProps {
  state: TimerState;
}

export const Timer: React.FC<TimerProps> = ({ state }) => {
  const [display, setDisplay] = useState('00:00.00');

  useEffect(() => {
    if (!state.running) {
      setDisplay(formatMs(state.elapsed));
      return;
    }

    const timer = setInterval(() => {
      const now = Date.now();
      const total = state.elapsed + (state.startedAt ? now - state.startedAt : 0);
      setDisplay(formatMs(total));
    }, 50);

    return () => clearInterval(timer);
  }, [state.running, state.elapsed, state.startedAt]);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text color="cyan" bold>  {icons.timer}  </Text>
        <Text color={state.running ? 'greenBright' : 'yellow'} bold>
          {display}
        </Text>
        <Text color="gray">
          {'  '}
          {state.running ? '(running)' : state.elapsed > 0 ? '(paused)' : '(ready)'}
        </Text>
      </Box>
      <Box>
        <Text color="gray" dimColor>
          {'  '}/tm start · /pa pause · /r resume · /sp reset
        </Text>
      </Box>
    </Box>
  );
};
