// ============================================================
// ClockNode - TODO Countdown Display Component
// ============================================================

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { formatTime, renderProgressBar } from '../utils.js';
import type { TodoCountdownState, TodoItem, AppConfig } from '../types.js';
import { icons } from '../icons.js';

interface TodoCountdownViewProps {
  state: TodoCountdownState;
  todos: TodoItem[];
  config: AppConfig;
}

export const TodoCountdownView: React.FC<TodoCountdownViewProps> = ({
  state,
  todos,
  config,
}) => {
  const [remaining, setRemaining] = useState(state.remainingSeconds);

  useEffect(() => {
    if (!state.running) {
      setRemaining(state.remainingSeconds);
      return;
    }

    const timer = setInterval(() => {
      if (state.startedAt) {
        const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
        const base = state.pausedRemaining ?? state.totalSeconds;
        setRemaining(base - elapsed);
      }
    }, 200);

    return () => clearInterval(timer);
  }, [state.running, state.startedAt, state.totalSeconds, state.remainingSeconds, state.pausedRemaining]);

  const currentTodoId = state.queue[state.currentIndex];
  const currentTodo = todos.find(t => t.id === currentTodoId);
  const isOvertime = remaining < 0;
  const progress = state.totalSeconds > 0
    ? Math.min(1, 1 - (Math.max(0, remaining) / state.totalSeconds))
    : 1;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text color="cyan" bold>  {icons.todoTimer} Task </Text>
        <Text color="white">({state.currentIndex + 1}/{state.queue.length})</Text>
        <Text color="gray"> {icons.separator} </Text>
        <Text color="yellowBright" bold>{currentTodo?.content || '?'}</Text>
      </Box>

      <Box>
        <Text>{'  '}</Text>
        {isOvertime ? (
          <>
            <Text color="redBright" bold>{icons.warning} OVERTIME </Text>
            <Text color="red" bold>{formatTime(remaining)}</Text>
          </>
        ) : (
          <>
            <Text color={remaining <= 30 ? 'redBright' : 'greenBright'} bold>
              {formatTime(remaining)}
            </Text>
            <Text color="gray"> / {formatTime(state.totalSeconds)}</Text>
          </>
        )}
        <Text color="gray">
          {'  '}
          {state.waitingForAction
            ? `${icons.pause} Action needed: /ok done · /ps skip`
            : state.running
            ? '(running)'
            : '(paused)'}
        </Text>
      </Box>

      {!isOvertime && (
        <Box>
          <Text>{'  '}</Text>
          <Text color="gray">[</Text>
          <Text color={remaining <= 30 ? 'red' : 'green'}>
            {renderProgressBar(progress, 30, config)}
          </Text>
          <Text color="gray">] {Math.floor(progress * 100)}%</Text>
        </Box>
      )}

      {isOvertime && (
        <Box>
          <Text>{'  '}</Text>
          <Text color="gray">[</Text>
          <Text color="red">
            {renderProgressBar(1, 30, config)}
          </Text>
          <Text color="gray">] 100%+</Text>
        </Box>
      )}
    </Box>
  );
};
