import React, { useState } from 'react';
import { createDocsTemplate } from '@teambit/docs.docs-template';
import { Box } from '@mui/material';
import { darkPortfolioTheme } from '@nitsan770/portfolio.theme.dark-portfolio-theme';
import { lightPortfolioTheme } from '@nitsan770/portfolio.theme.light-portfolio-theme';
import { ThemeProvider } from '@nitsan770/portfolio.theme.theme-provider';
import { ThemeToggle } from '@nitsan770/portfolio.theme.theme-toggle';

/**
 * use the provider to inject and wrap your component overview
 * with common needs like [routing](), [theming]() and [data fetching]().
 */
// eslint-disable-next-line react/prop-types
export function DocsProvider({ children }) {
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  return (
    <ThemeProvider
      theme={
        themeMode === 'dark' ? darkPortfolioTheme() : lightPortfolioTheme()
      }
    >
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
