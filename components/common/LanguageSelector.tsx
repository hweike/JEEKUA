'use client';

import { useState, useEffect, useRef } from 'react';
import { LANGUAGES, getLanguageDisplayName } from '@/lib/languages/config';

const ADMIN_LANG_KEY = 'admin_selected_language';

export default function LanguageSelector({
  currentLocale,
  onLocaleChange,
  displayMode = 'native',
  className = '',
}: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [availableLanguages, setAvailableLanguages] = useState<typeof LANGUAGES>([]);
  const [defaultLanguage, setDefaultLanguage] = useState<string>('zh');
  const [isReady, setIsReady] = useState(false); // 新增

  // 获取已开通的语言列表和默认语言设置
  useEffect(() => {
    Promise.all([
      fetch('/api/languages/enabled').then(res => res.json()),
      fetch('/api/admin/languages/settings').then(res => res.json())
    ]).then(([enabledData, settingsData]) => {
      setAvailableLanguages(enabledData);
      setDefaultLanguage(settingsData.defaultLanguage || 'zh');
      setIsReady(true);
    }).catch(err => {
      console.error('Failed to load language settings:', err);
      setAvailableLanguages(LANGUAGES.filter(l => l.code === currentLocale));
      setDefaultLanguage('zh');
      setIsReady(true);
    });
  }, [currentLocale]);

  // 初始化：处理默认语言和本地存储
  useEffect(() => {
    if (!isReady) return;
    const stored = localStorage.getItem(ADMIN_LANG_KEY);
    if (!stored) {
      localStorage.setItem(ADMIN_LANG_KEY, defaultLanguage);
      window.location.reload();
    } else if (stored !== currentLocale) {
      onLocaleChange(stored);
    }
  }, [isReady, defaultLanguage, currentLocale, onLocaleChange]);

  const handleLocaleChange = (locale: string) => {
    if (locale === currentLocale) {
      setOpen(false);
      return;
    }
    localStorage.setItem(ADMIN_LANG_KEY, locale);
    window.location.reload();
  };

  const currentDisplayName = getLanguageDisplayName(currentLocale, displayMode);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 数据未准备好时，不渲染任何内容，避免闪现
  if (!isReady) return null;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className="bg-white border rounded px-3 py-2 text-sm flex items-center gap-2"
      >
        <span>{currentDisplayName}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 max-h-96 overflow-y-auto bg-white border rounded shadow-lg z-10">
          {availableLanguages.map(lang => (
            <button
              key={lang.code}
              onClick={() => handleLocaleChange(lang.code)}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                currentLocale === lang.code ? 'bg-blue-50 text-blue-700' : ''
              }`}
            >
              {displayMode === 'native' ? lang.nativeName : lang.zhName} ({lang.code})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}