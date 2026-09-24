'use client';

import { useState, useEffect, useRef } from 'react';
import { getLanguageDisplayName } from '@/lib/languages/config';

// ---------- 模块级缓存 ----------
let cachedLanguages: any[] | null = null;
let cachedAt = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟兜底（正常情况下会被主动清）
let fetchPromise: Promise<any[]> | null = null;

/** ✅ 导出：清空缓存（保存语言设置后调用） */
export function clearLanguagesCache() {
  cachedLanguages = null;
  cachedAt = 0;
  console.log('[LanguageSelector] 语言缓存已清空');
}

async function fetchEnabledLanguages(): Promise<any[]> {
  const now = Date.now();

  // ✅ 有缓存且未过期
  if (cachedLanguages && now - cachedAt < CACHE_TTL) {
    return cachedLanguages;
  }

  // ✅ 已有进行中的请求，复用
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch('/api/languages/enabled')
    .then((res) => {
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    })
    .then((data) => {
      cachedLanguages = data;
      cachedAt = Date.now();
      return data;
    })
    .catch(() => {
      const { LANGUAGES } = require('@/lib/languages/config');
      cachedLanguages = LANGUAGES.map((lang: any) => ({
        code: lang.code,
        nativeName: lang.nativeName,
        zhName: lang.zhName,
      }));
      cachedAt = Date.now();
      return cachedLanguages!;
    })
    .finally(() => {
      fetchPromise = null;
    });

  return fetchPromise;
}

interface LanguageSelectorProps {
  currentLocale: string;
  onLocaleChange: (locale: string) => void;
  displayMode?: 'native' | 'zh';
  className?: string;
}

export default function LanguageSelector({
  currentLocale,
  onLocaleChange,
  displayMode = 'native',
  className = '',
}: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchEnabledLanguages().then((langs) => {
      setAvailableLanguages(langs);
      setLoading(false);
    });
  }, []);

  const handleLocaleChange = (locale: string) => {
    if (locale === currentLocale) {
      setOpen(false);
      return;
    }
    onLocaleChange(locale);
    setOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className={`relative ${className}`}>
        <div className="bg-white border rounded px-3 py-2 text-sm flex items-center gap-2">
          <span>加载中...</span>
        </div>
      </div>
    );
  }

  const currentDisplayName = getLanguageDisplayName(currentLocale, displayMode);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className="bg-white border rounded px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition"
      >
        <span>{currentDisplayName}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 max-h-96 overflow-y-auto bg-white border rounded shadow-lg z-10">
          {availableLanguages.map((lang) => (
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