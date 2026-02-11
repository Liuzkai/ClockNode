// ============================================================
// ClockNode - Countdown Component
// ============================================================

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { formatTime, renderProgressBar } from '../utils.js';
import type { CountdownState, AppConfig } from '../types.js';
import { COUNTDOWN_PRESETS } from '../types.js';
import { icons } from '../icons.js';

interface CountdownProps {
  state: CountdownState;
  config: AppConfig;
}

export const Countdown: React.FC<CountdownProps> = ({ state, config }) => {
  const [remaining, setRemaining] = useState(state.remainingSeconds);

  useEffect(() => {
    if (!state.running) {
      setRemaining(state.remainingSeconds);
      return;
    }

    const timer = setInterval(() => {
      if (state.startedAt) {
        const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
        const r = (state.pausedRemaining ?? state.totalSeconds) - elapsed;
        setRemaining(Math.max(0, r));
      }
    }, 200);

    return () => clearInterval(timer);
  }, [state.running, state.startedAt, state.totalSeconds, state.remainingSeconds, state.pausedRemaining]);

  const progress = state.totalSeconds > 0
    ? 1 - (remaining / state.totalSeconds)
    : 0;

  const presetStr = Object.entries(COUNTDOWN_PRESETS)
    .map(([k, v]) => `${k}=${v}m`)
    .join(' ');

  if (!state.running && state.remainingSeconds === state.totalSeconds && state.totalSeconds === 0) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Box>
          <Text color="cyan" bold>  {icons.countdown} Countdown </Text>
          <Text color="gray">{icons.hLine} Select a preset or custom time</Text>
        </Box>
        <Box>
          <Text color="gray">
            {'  '}Presets: {presetStr} {icons.separator} /cd {'<'}minutes{'>'} for custom
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text color="cyan" bold>  {icons.countdown} </Text>
        <Text color={remaining <= 10 && remaining > 0 ? 'redBright' : 'greenBright'} bold>
          {formatTime(remaining)}
        </Text>
        <Text color="gray"> / {formatTime(state.totalSeconds)}</Text>
        <Text color="gray">
          {'  '}
          {state.running ? '(running)' : remaining === 0 ? '(done!)' : '(paused)'}
        </Text>
      </Box>
      <Box>
        <Text>{'  '}</Text>
        <Text color="gray">[</Text>
        <Text color={remaining <= 10 && remaining > 0 ? 'red' : 'green'}>
          {renderProgressBar(progress, 30, config)}
        </Text>
        <Text color="gray">] {Math.floor(progress * 100)}%</Text>
      </Box>
    </Box>
  );
};
