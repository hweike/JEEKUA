'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { nanoid } from 'nanoid';

const SUPPORTED_LOCALES = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
];

interface ButtonTextFieldProps {
  value: { zh: string; en: string; textId: string };
  onChange: (value: any) => void;
}

export function ButtonTextField({ value, onChange }: ButtonTextFieldProps) {
  const [currentLocale, setCurrentLocale] = useState('zh');
  const [localText, setLocalText] = useState('');

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current && (!value || typeof value !== 'object' || !value.textId)) {
      onChange({ zh: '', en: '', textId: nanoid() });
    }
    isFirstRender.current = false;
  }, []);

  useEffect(() => {
    if (value && typeof value === 'object') {
      setLocalText(value[currentLocale] || '');
    }
  }, [value, currentLocale]);

  const updateText = useCallback(
    (text: string) => {
      setLocalText(text);
      const newValue = { ...value, [currentLocale]: text };
      onChange(newValue);
    },
    [value, currentLocale, onChange]
  );

  const handleLocaleChange = (newLocale: string) => {
    setCurrentLocale(newLocale);
    localStorage.setItem('webbuilder_edit_locale', newLocale);
    window.dispatchEvent(new StorageEvent('storage', { key: 'webbuilder_edit_locale', newValue: newLocale }));
  };

  if (!value || typeof value !== 'object') return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">按钮文字</label>
        <select
          value={currentLocale}
          onChange={(e) => handleLocaleChange(e.target.value)}
          className="px-2 py-1 border border-input rounded-md text-sm bg-background"
        >
          {SUPPORTED_LOCALES.map((loc) => (
            <option key={loc.value} value={loc.value}>
              {loc.label}
            </option>
          ))}
        </select>
      </div>
      <input
        type="text"
        value={localText}
        onChange={(e) => updateText(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
        placeholder={`输入按钮文字 (${currentLocale === 'zh' ? '中文' : '英文'})`}
      />
    </div>
  );
}