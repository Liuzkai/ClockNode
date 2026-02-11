// ============================================================
// ClockNode - Done History View Component
// ============================================================

import React from 'react';
import { Box, Text } from 'ink';
import { type DoneRecord } from '../types.js';
import { formatTime } from '../utils.js';
import { icons } from '../icons.js';

interface DoneHistoryViewProps {
  records: DoneRecord[];
  scrollOffset: number;
  viewHeight: number;
}

function formatDate(isoStr: string): string {
  const d = new Date(isoStr);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export const DoneHistoryView: React.FC<DoneHistoryViewProps> = ({
  records,
  scrollOffset,
  viewHeight,
}) => {
  if (records.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text color="gray" dimColor>
          {icons.hLine}{icons.hLine}{icons.hLine} Done History (empty) {icons.hLine}{icons.hLine}{icons.hLine}
        </Text>
        <Text color="gray" dimColor>
          Completed tasks will appear here.
        </Text>
      </Box>
    );
  }

  const visible = records.slice(scrollOffset, scrollOffset + viewHeight);
  const hasMore = records.length > scrollOffset + viewHeight;
  const hasBefore = scrollOffset > 0;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text color="cyan" bold>{icons.hLine}{icons.hLine}{icons.hLine} Done History </Text>
        <Text color="gray">({records.length} records)</Text>
        <Text color="cyan" bold> {icons.hLine}{icons.hLine}{icons.hLine}</Text>
      </Box>
      <Text color="gray" dimColor>  Use /d N or /d N-M to delete records. /back to return.</Text>

      {hasBefore && (
        <Text color="gray" dimColor>  ↑ {scrollOffset} more above</Text>
      )}

      {visible.map((record, vIdx) => {
        const idx = scrollOffset + vIdx + 1;
        const dateStr = formatDate(record.completedAt);
        const timeStr = formatTime(record.actualTime);
        const tagsStr = record.tags.length > 0
          ? ` ${record.tags.map(t => `#${t}`).join(' ')}`
          : '';

        return (
          <Box key={record.id + '-' + idx}>
            <Text color="gray">{String(idx).padStart(3, ' ')}. </Text>
            <Text color="gray">{dateStr} </Text>
            <Text color="white">{record.content}</Text>
            <Text color="cyan"> {timeStr}</Text>
            {tagsStr && (
              <Text color="blue">{tagsStr}</Text>
            )}
          </Box>
        );
      })}

      {hasMore && (
        <Text color="gray" dimColor>  ↓ {records.length - scrollOffset - viewHeight} more below</Text>
      )}
    </Box>
  );
};
