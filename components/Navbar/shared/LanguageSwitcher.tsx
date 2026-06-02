'use client';

import { useLocale } from 'next-intl';
import { useState, useEffect, useRef } from 'react';

interface Language {
  code: string;
  nativeName: string;
  zhName: string;
}

export default function LanguageSwitcher() {
  const locale = useLocale();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 获取已开通语言列表
  useEffect(() => {
    fetch('/api/languages/enabled')
      .then(res => res.json())
      .then(data => setLanguages(data))
      .catch(err => console.error('Failed to load languages:', err))
      .finally(() => setLoading(false));
  }, []);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLocaleChange = (newLocale: string) => {
    if (newLocale === locale) {
      setOpen(false);
      return;
    }
    // 存储用户偏好语言
    document.cookie = `preferred_language=${newLocale}; path=/; max-age=31536000`;
    document.cookie = `user_selected_language=true; path=/; max-age=31536000`;
    // 直接跳转到目标语言的首页
    window.location.href = `/${newLocale}`;
  };

  const currentLang = languages.find(lang => lang.code === locale)?.nativeName || locale;
  if (languages.length === 0 || loading) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-3 py-1.5 text-sm transition-colors hover:text-[var(--navbar-hover-text,var(--primary))]"
        style={{ color: 'var(--navbar-text, var(--foreground))' }}
      >
        {currentLang}
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute right-0 mt-[10px] w-48 max-h-80 overflow-y-auto rounded-[18px] z-50"
          style={{
            backgroundColor: 'var(--navbar-bg, var(--background))',
            color: 'var(--navbar-text, var(--foreground))',
            boxShadow: '0 -2px 8px -2px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.05)',
            borderTop: '1px solid rgba(255, 255, 255, 0.15)',
          }}
        >
          <div className="py-1">
            {languages.map(lang => (
              <button
                key={lang.code}
                onClick={() => handleLocaleChange(lang.code)}
                className="block w-full text-left px-4 py-2 text-base transition-colors"
                style={{
                  color: lang.code === locale
                    ? 'var(--navbar-active-text, var(--navbar-hover-text, var(--primary)))'
                    : 'var(--navbar-text, var(--foreground))',
                }}
              >
                {lang.nativeName} ({lang.code})
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}