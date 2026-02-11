// ============================================================
// ClockNode - Input Bar Component with command autocomplete
// ============================================================

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import type { NotificationMessage } from '../types.js';
import { matchCommands, type CommandDef } from '../commands.js';
import { icons } from '../icons.js';

interface InputBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  notification: NotificationMessage | null;
  /** Index of the currently selected suggestion (managed by parent) */
  selectedSuggestion: number;
  /** Current history browsing index (-1 = not browsing) */
  historyIndex?: number;
  /** Total history length */
  historyLength?: number;
  /** Key to force TextInput remount (resets internal cursor) */
  inputKey?: number;
}

/**
 * Check whether autocomplete suggestions should display,
 * and return the matching commands.
 */
export function getSuggestions(value: string): CommandDef[] {
  const isCmd = value.startsWith('/');
  if (!isCmd) return [];
  const partial = value.slice(1).split(/\s/)[0];
  const hasArgs = value.slice(1).includes(' ');
  if (hasArgs) return [];
  return matchCommands(partial);
}

export const InputBar: React.FC<InputBarProps> = ({
  value,
  onChange,
  onSubmit,
  notification,
  selectedSuggestion,
  historyIndex = -1,
  historyLength = 0,
  inputKey = 0,
}) => {
  const showNotif = notification && (Date.now() - notification.timestamp < 5000);

  const matches = useMemo(() => getSuggestions(value), [value]);
  const showSuggestions = matches.length > 0;
  const clampedIndex = Math.min(selectedSuggestion, Math.max(0, matches.length - 1));

  // Compute partial typed after /
  const partial = value.startsWith('/') ? value.slice(1).split(/\s/)[0] : '';

  // Inline ghost text
  const ghostText = useMemo(() => {
    if (!showSuggestions || matches.length === 0) return '';
    const selected = matches[clampedIndex];
    if (!selected) return '';
    const fullCmd = selected.name;
    if (fullCmd.startsWith(partial) && fullCmd.length > partial.length) {
      return fullCmd.slice(partial.length);
    }
    if (!fullCmd.startsWith(partial)) {
      return ` → /${fullCmd}`;
    }
    return '';
  }, [showSuggestions, matches, clampedIndex, partial]);

  // Sliding window: keep selected item always visible
  const maxVisible = 6;
  const windowStart = useMemo(() => {
    if (matches.length <= maxVisible) return 0;
    // Keep selected roughly centered, but clamp to valid range
    const half = Math.floor(maxVisible / 2);
    let start = clampedIndex - half;
    start = Math.max(0, start);
    start = Math.min(matches.length - maxVisible, start);
    return start;
  }, [matches.length, maxVisible, clampedIndex]);

  const visibleMatches = matches.slice(windowStart, windowStart + maxVisible);
  const hasAbove = windowStart > 0;
  const hasBelow = windowStart + maxVisible < matches.length;

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Notification */}
      {showNotif && (
        <Box>
          <Text color="yellow"> {icons.info} {notification!.text}</Text>
        </Box>
      )}

      {/* Autocomplete suggestions */}
      {showSuggestions && (
        <Box flexDirection="column">
          <Box>
            <Text color="gray" dimColor>
              {'  '}Tab ↹ complete · ↑↓ select
              {matches.length > maxVisible ? ` (${clampedIndex + 1}/${matches.length})` : ''}
            </Text>
          </Box>
          {hasAbove && (
            <Box>
              <Text color="gray" dimColor>{'   ↑ '}{windowStart} more</Text>
            </Box>
          )}
          {visibleMatches.map((cmd, i) => {
            const globalIndex = windowStart + i;
            const isSelected = globalIndex === clampedIndex;
            const aliasStr = cmd.aliases.length > 0
              ? cmd.aliases.map(a => `/${a}`).join(', ')
              : '';

            return (
              <Box key={cmd.name}>
                <Text color={isSelected ? 'cyanBright' : 'gray'}>
                  {isSelected ? ` ${icons.pointer} ` : '   '}
                </Text>
                <Text color={isSelected ? 'cyanBright' : 'white'} bold={isSelected}>
                  {`/${cmd.name}`}
                </Text>
                {aliasStr && (
                  <Text color="gray" dimColor>
                    {` (${aliasStr})`}
                  </Text>
                )}
                <Text color="gray"> — </Text>
                <Text color={isSelected ? 'yellowBright' : 'gray'} dimColor={!isSelected}>
                  {cmd.description}
                </Text>
              </Box>
            );
          })}
          {hasBelow && (
            <Box>
              <Text color="gray" dimColor>{'   ↓ '}{matches.length - windowStart - maxVisible} more</Text>
            </Box>
          )}
        </Box>
      )}

      {/* Input line */}
      <Box>
        <Text color="magentaBright" bold>{`${icons.prompt} `}</Text>
        <TextInput
          key={inputKey}
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          placeholder="Type a task or /command..."
        />
        {ghostText && (
          <Text color="gray" dimColor>{ghostText}</Text>
        )}
        {historyIndex >= 0 && (
          <Text color="gray" dimColor>{` (history ${historyIndex + 1}/${historyLength})`}</Text>
        )}
      </Box>
    </Box>
  );
};
