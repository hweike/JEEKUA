'use client';

import { ThemeProvider } from './theme-context';
import { ThemeEditor } from './theme-editor';

export function ThemeCustomizer() {
  return (
    <ThemeProvider>
      <ThemeEditor />
    </ThemeProvider>
  );
}