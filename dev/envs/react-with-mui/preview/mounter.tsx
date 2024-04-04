import React, { useState } from 'react';
import { createMounter } from '@teambit/react.mounter';
import { Box } from '@mui/material';
import { ThemeProvider } from '@cohen-codes/design.theme.theme-provider';
import { ThemeToggle } from '@cohen-codes/design.theme.theme-toggle';
import { darkTheme } from '@cohen-codes/design.theme.dark-theme';
import { lightTheme } from '@cohen-codes/design.theme.light-theme';

/**
 * use the mounter to inject and wrap your component previews
 * with common needs like [routing](), [theming]() and [data fetching]().
 */
// eslint-disable-next-line react/prop-types
export function MyReactProvider({ children }) {
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  return (
    <ThemeProvider theme={themeMode === 'dark' ? darkTheme() : lightTheme()}>
      <Box sx={{ p: 5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <ThemeToggle
            isDark={themeMode === 'dark'}
            onClick={() =>
              setThemeMode(themeMode === 'dark' ? 'light' : 'dark')
            }
          />
        </Box>
        {children}
      </Box>
    </ThemeProvider>
  );
}

/**
 * to replace that mounter component for different purposes, just return a function
 * that uses ReactDOM to render a node to a div.
 */
// @ts-ignore
export default createMounter(MyReactProvider) as any;
