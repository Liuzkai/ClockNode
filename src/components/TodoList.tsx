// ============================================================
// ClockNode - TODO List Component
// ============================================================

import React from 'react';
import { Box, Text } from 'ink';
import { type TodoItem, TodoStatus, type TodoCountdownState } from '../types.js';
import { formatTime, priorityLabel } from '../utils.js';

interface TodoListProps {
  todos: TodoItem[];
  todoCountdown: TodoCountdownState | null;
  scrollOffset: number;
  viewHeight: number;
}

const statusIcon = (status: TodoStatus): string => {
  switch (status) {
    case TodoStatus.Done: return '✅';
    case TodoStatus.InProgress: return '▶️';
    case TodoStatus.Pending: return '⬜';
  }
};

export const TodoList: React.FC<TodoListProps> = ({
  todos,
  todoCountdown,
  scrollOffset,
  viewHeight,
}) => {
  if (todos.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text color="gray" dimColor>
          ─── TODO List (empty) ───
        </Text>
        <Text color="gray" dimColor>
          Type a task to add, e.g.: "Buy groceries @30"
        </Text>
      </Box>
    );
  }

  const visible = todos.slice(scrollOffset, scrollOffset + viewHeight);
  const hasMore = todos.length > scrollOffset + viewHeight;
  const hasBefore = scrollOffset > 0;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text color="cyan" bold>─── TODO List </Text>
        <Text color="gray">({todos.length} items)</Text>
        <Text color="cyan" bold> ───</Text>
      </Box>

      {hasBefore && (
        <Text color="gray" dimColor>  ↑ {scrollOffset} more above</Text>
      )}

      {visible.map((todo, vIdx) => {
        const idx = scrollOffset + vIdx + 1;
        const isActive =
          todoCountdown &&
          todoCountdown.queue[todoCountdown.currentIndex] === todo.id;

        const actualTimeStr = todo.actualTime !== undefined
          ? ` [${formatTime(todo.actualTime)}]`
          : '';

        const tagsStr = todo.tags.length > 0
          ? ` ${todo.tags.map(t => `#${t}`).join(' ')}`
          : '';

        return (
          <Box key={todo.id}>
            <Text color="gray">{String(idx).padStart(2, ' ')}. </Text>
            <Text>{statusIcon(todo.status)} </Text>
            <Text>{priorityLabel(todo.priority)} </Text>
            <Text
              color={
                todo.status === TodoStatus.Done
                  ? 'gray'
                  : isActive
                  ? 'yellowBright'
                  : 'white'
              }
              strikethrough={todo.status === TodoStatus.Done}
              bold={!!isActive}
            >
              {todo.content}
            </Text>
            <Text color="magenta"> @{todo.duration}m</Text>
            {actualTimeStr && (
              <Text color="cyan">{actualTimeStr}</Text>
            )}
            {tagsStr && (
              <Text color="blue">{tagsStr}</Text>
            )}
          </Box>
        );
      })}

      {hasMore && (
        <Text color="gray" dimColor>  ↓ {todos.length - scrollOffset - viewHeight} more below</Text>
      )}
    </Box>
  );
};
