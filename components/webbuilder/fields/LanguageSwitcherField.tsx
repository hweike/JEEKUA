// components/webbuilder/fields/LanguageSwitcherField.tsx
'use client';

import { useState, useEffect } from 'react';

const SUPPORTED_LOCALES = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
];

export function LanguageSwitcherField() {
  const [locale, setLocale] = useState('zh');

  useEffect(() => {
    const stored = localStorage.getItem('webbuilder_edit_locale');
    if (stored && (stored === 'zh' || stored === 'en')) {
      setLocale(stored);
    }
  }, []);

  const handleChange = (newLocale: string) => {
    setLocale(newLocale);
    localStorage.setItem('webbuilder_edit_locale', newLocale);
    window.dispatchEvent(new StorageEvent('storage', { key: 'webbuilder_edit_locale', newValue: newLocale }));
  };

  return (
    <div className="flex items-center justify-end gap-2 mb-4">
      <span className="text-sm text-muted-foreground">编辑语言：</span>
      <select
        value={locale}
        onChange={(e) => handleChange(e.target.value)}
        className="border border-input rounded-md px-2 py-1 text-sm bg-background"
      >
        {SUPPORTED_LOCALES.map((loc) => (
          <option key={loc.value} value={loc.value}>
            {loc.label}
          </option>
        ))}
      </select>
    </div>
  );
}