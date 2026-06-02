'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ThemeConfig {
  name: string;
  displayName: string;
  cssVariables: Record<string, string>;
}

interface ThemeContextType {
  currentTheme: ThemeConfig | null;
  setCurrentTheme: (theme: ThemeConfig) => void;
  themes: ThemeConfig[];
  loadThemes: () => Promise<void>;
  saveTheme: (theme: ThemeConfig) => Promise<void>;
  deleteTheme: (name: string) => Promise<void>;
  activateTheme: (name: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig | null>(null);
  const [themes, setThemes] = useState<ThemeConfig[]>([]);

  const loadThemes = async () => {
    try {
      const res = await fetch('/api/themes');
      const data = await res.json();
      setThemes(data.themes);
      const active = data.themes.find((t: ThemeConfig) => t.name === data.activeTheme);
      setCurrentTheme(active || data.themes[0]);
    } catch (error) {
      console.error('加载主题失败', error);
    }
  };

  const saveTheme = async (theme: ThemeConfig) => {
    await fetch('/api/themes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(theme),
    });
    await loadThemes();
  };

  const deleteTheme = async (name: string) => {
    await fetch(`/api/themes/${name}`, { method: 'DELETE' });
    await loadThemes();
  };

  const activateTheme = async (name: string) => {
    await fetch('/api/themes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeName: name }),
    });
    await loadThemes();
    // 刷新页面以应用新主题（或动态更新 style）
    window.location.reload();
  };

  useEffect(() => {
    loadThemes();
  }, []);

  return (
    <ThemeContext.Provider value={{ currentTheme, setCurrentTheme, themes, loadThemes, saveTheme, deleteTheme, activateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useThemeContext must be used within ThemeProvider');
  return context;
};