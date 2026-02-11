// ============================================================
// ClockNode - Clock Display Component
// ============================================================

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { getClockDisplay } from '../utils.js';
import { icons } from '../icons.js';

export const Clock: React.FC = () => {
  const [clock, setClock] = useState(getClockDisplay());

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(getClockDisplay());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text color="cyan" bold>  {icons.clock} </Text>
        <Text color="white" bold>{clock.date}</Text>
        <Text color="gray"> {icons.separator} </Text>
        <Text color="greenBright" bold>{clock.time}</Text>
        <Text color="gray"> {icons.separator} </Text>
        <Text color="yellow">{clock.weekday}</Text>
      </Box>
    </Box>
  );
};
