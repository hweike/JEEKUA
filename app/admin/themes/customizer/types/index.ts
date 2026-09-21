// app/admin/themes/customizer/types/index.ts

export interface ThemeData {
  colors: Record<string, string>;
  darkColors: Record<string, string>;
  typography: Record<string, string>;
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
  shadows: Record<string, string>;
  animation: Record<string, string>;
  darkMode: 'light' | 'dark' | 'system';
}

export interface PageThemeData {
  pages: {
    pagePath: string;
    overrides: Partial<ThemeData>;
  }[];
}

export interface ThemeIndexItem {
  id: string;
  type: 'builtin' | 'custom';
  category: string;
  name: string;
  displayName: string;
  previewImage: string | null;
  primaryColor: string;
  globalThemePath: string;
  pageThemePath: string;
}

export type EditScope = 'global' | 'page';