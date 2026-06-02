'use client';

import { useThemeContext } from './theme-context';
import { useState } from 'react';
import { ColorPicker } from './color-picker';

export function ThemeEditor() {
  const { currentTheme, saveTheme, themes, activateTheme } = useThemeContext();
  const [localVars, setLocalVars] = useState<Record<string, string>>(currentTheme?.cssVariables || {});

  if (!currentTheme) return <div>加载中...</div>;

  const handleChange = (key: string, value: string) => {
    setLocalVars(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    await saveTheme({
      ...currentTheme,
      cssVariables: localVars,
    });
    alert('保存成功');
  };

  // 定义需要展示的变量（可配置）
  const colorVariables = [
    '--background', '--foreground', '--primary', '--primary-foreground',
    '--secondary', '--secondary-foreground', '--muted', '--muted-foreground',
    '--accent', '--accent-foreground', '--destructive', '--destructive-foreground',
    '--border', '--input', '--ring'
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">主题编辑器</h2>
        <div className="space-x-2">
          <select
            value={currentTheme.name}
            onChange={(e) => activateTheme(e.target.value)}
            className="border rounded p-2"
          >
            {themes.map(theme => (
              <option key={theme.name} value={theme.name}>{theme.displayName}</option>
            ))}
          </select>
          <button
            onClick={handleSave}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            保存主题
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {colorVariables.map(varName => (
          <div key={varName} className="flex items-center justify-between">
            <label className="text-sm font-mono">{varName}</label>
            <ColorPicker
              value={localVars[varName] || '#000000'}
              onChange={(val) => handleChange(varName, val)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}