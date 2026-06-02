'use client';

import { useState, useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';

export function PicwithTextTextField({ value, onChange, label }: any) {
  const [currentLocale, setCurrentLocale] = useState('zh');
  const [localText, setLocalText] = useState('');
  const initialized = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem('webbuilder_edit_locale');
    if (stored && (stored === 'zh' || stored === 'en')) {
      setCurrentLocale(stored);
    }
    const handler = (e: StorageEvent) => {
      if (e.key === 'webbuilder_edit_locale' && e.newValue && (e.newValue === 'zh' || e.newValue === 'en')) {
        setCurrentLocale(e.newValue);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  useEffect(() => {
    if (!initialized.current && (!value?.textId)) {
      const newValue = { zh: value?.zh || '', en: value?.en || '', textId: nanoid() };
      onChange(newValue);
      initialized.current = true;
    }
  }, [value, onChange]);

  useEffect(() => {
    if (value && typeof value === 'object') {
      setLocalText(value[currentLocale] || '');
    }
  }, [value, currentLocale]);

  const update = (text: string) => {
    setLocalText(text);
    onChange({ ...value, [currentLocale]: text });
  };

  if (!value || typeof value !== 'object') return null;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <input
        type="text"
        value={localText}
        onChange={(e) => update(e.target.value)}
        className="w-full border border-input rounded-md p-2 text-sm"
        placeholder={`输入${label}`}
      />
    </div>
  );
}