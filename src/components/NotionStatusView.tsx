// ============================================================
// ClockNode - Notion Status View Component
// ============================================================

import React from 'react';
import { Box, Text } from 'ink';
import { icons } from '../icons.js';

export interface NotionStatusProps {
  configured: boolean;
  databaseId?: string;
  tokenPreview?: string;
  syncedCount: number;
  lastSyncAt?: string;
  connectionStatus?: 'connected' | 'error' | 'unknown';
  databaseTitle?: string;
  errorMessage?: string;
}

export const NotionStatusView: React.FC<NotionStatusProps> = ({
  configured,
  databaseId,
  tokenPreview,
  syncedCount,
  lastSyncAt,
  connectionStatus,
  databaseTitle,
  errorMessage,
}) => {
  if (!configured) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text color="cyan" bold>
          {icons.hLine}{icons.hLine}{icons.hLine} Notion Integration {icons.hLine}{icons.hLine}{icons.hLine}
        </Text>
        <Box marginTop={1} flexDirection="column">
          <Text color="yellow">Not configured.</Text>
          <Text color="gray"> </Text>
          <Text color="gray">To set up Notion sync, run:</Text>
          <Text color="green">  /notion setup {'<token>'} {'<database_id>'}</Text>
          <Text color="gray"> </Text>
          <Text color="gray">Or from CLI:</Text>
          <Text color="green">  clocknode --notion_setup "secret_xxx database_id"</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="gray" dimColor>/back to return</Text>
        </Box>
      </Box>
    );
  }

  const statusColor = connectionStatus === 'connected' ? 'green'
    : connectionStatus === 'error' ? 'red'
    : 'yellow';
  const statusText = connectionStatus === 'connected' ? 'Connected'
    : connectionStatus === 'error' ? 'Error'
    : 'Unknown';

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text color="cyan" bold>
        {icons.hLine}{icons.hLine}{icons.hLine} Notion Integration {icons.hLine}{icons.hLine}{icons.hLine}
      </Text>

      <Box marginTop={1} flexDirection="column">
        <Box>
          <Text color="gray">{'  Token:       '}</Text>
          <Text color="white">{tokenPreview ?? '***'}</Text>
        </Box>
        <Box>
          <Text color="gray">{'  Database ID: '}</Text>
          <Text color="white">{databaseId ?? '-'}</Text>
        </Box>
        {databaseTitle && (
          <Box>
            <Text color="gray">{'  DB Title:    '}</Text>
            <Text color="white">{databaseTitle}</Text>
          </Box>
        )}
        <Box>
          <Text color="gray">{'  Connection:  '}</Text>
          <Text color={statusColor}>{statusText}</Text>
        </Box>
        {errorMessage && (
          <Box>
            <Text color="gray">{'  Error:       '}</Text>
            <Text color="red">{errorMessage}</Text>
          </Box>
        )}
        <Box>
          <Text color="gray">{'  Synced:      '}</Text>
          <Text color="white">{syncedCount} entries</Text>
        </Box>
        {lastSyncAt && (
          <Box>
            <Text color="gray">{'  Last sync:   '}</Text>
            <Text color="white">{lastSyncAt}</Text>
          </Box>
        )}
      </Box>

      <Box marginTop={1}>
        <Text color="gray" dimColor>/notion disconnect to remove config. /back to return.</Text>
      </Box>
    </Box>
  );
};
