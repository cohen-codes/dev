import React, { useState } from 'react';
import { createDocsTemplate } from '@teambit/docs.docs-template';
import { Box } from '@mui/material';
import { darkTheme } from '@cohen-codes/design.theme.dark-theme';
import { lightTheme } from '@cohen-codes/design.theme.light-theme';
import { ThemeProvider } from '@cohen-codes/design.theme.theme-provider';
import { ThemeToggle } from '@cohen-codes/design.theme.theme-toggle';

/**
 * use the provider to inject and wrap your component overview
 * with common needs like [routing](), [theming]() and [data fetching]().
 */
// eslint-disable-next-line react/prop-types
export function DocsProvider({ children }) {
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  return (
    <ThemeProvider theme={themeMode === 'dark' ? darkTheme() : lightTheme()}>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2 }}>
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
 * customize the bit documentation template or
 * replace this with one of your own.
 */
export default createDocsTemplate(DocsProvider);
