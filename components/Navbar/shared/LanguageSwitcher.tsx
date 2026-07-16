'use client';

import { useLocale } from 'next-intl';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface Language {
  code: string;
  nativeName: string;
  zhName: string;
}

interface Alternative {
  locale: string;
  url: string;
}

export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [alternatives, setAlternatives] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. 获取已开通语言列表
  useEffect(() => {
    fetch('/api/languages/enabled')
      .then(res => res.json())
      .then(data => setLanguages(data))
      .catch(err => console.error('Failed to load languages:', err));
  }, []);

  // 2. 获取当前页面的多语言映射
  useEffect(() => {
    if (!pathname) return;
    // 移除语言前缀，获取纯路径（如 /products/smartphone）
    const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(\/|$)/, '/');
    const cleanPath = pathWithoutLocale.startsWith('/') ? pathWithoutLocale : `/${pathWithoutLocale}`;

    fetch(`/api/page/alternatives?path=${encodeURIComponent(cleanPath)}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch alternatives');
        return res.json();
      })
      .then((data: Alternative[]) => {
        const map: Record<string, string> = {};
        data.forEach(item => {
          map[item.locale] = item.url;
        });
        setAlternatives(map);
      })
      .catch(err => {
        console.error('Failed to load language alternatives:', err);
        // 降级方案：使用路径前缀替换
        const fallbackMap: Record<string, string> = {};
        languages.forEach(lang => {
          fallbackMap[lang.code] = `/${lang.code}${pathname.replace(/^\/[a-z]{2}/, '')}`;
        });
        setAlternatives(fallbackMap);
      })
      .finally(() => setLoading(false));
  }, [pathname, languages]);

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

    // 1. 优先使用 API 返回的精确 URL
    const targetUrl = alternatives[newLocale];
    if (targetUrl && targetUrl !== pathname) {
      window.location.href = targetUrl;
      return;
    }

    // 2. 检查目标语言的首页是否存在（通过尝试获取页面或检查语言是否开通）
    // 这里假设所有已开通语言的首页都是有效的
    const isLanguageEnabled = languages.some(lang => lang.code === newLocale);
    if (isLanguageEnabled) {
      window.location.href = `/${newLocale}`;
    } else {
      // 3. 如果语言未开通，不做任何操作或提示
      console.warn(`Language ${newLocale} is not enabled`);
      setOpen(false);
    }
  };

  // 如果语言列表为空或正在加载，不显示
  if (languages.length === 0 || loading) return null;

  const currentLang = languages.find(lang => lang.code === locale)?.nativeName || locale;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-3 py-1.5 text-sm transition-colors hover:text-[var(--navbar-hover-text,var(--primary))]"
        style={{ color: 'var(--navbar-text, var(--foreground))' }}
      >
        {currentLang}
        <svg
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
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
                  color:
                    lang.code === locale
                      ? 'var(--navbar-active-text, var(--navbar-hover-text, var(--primary)))'
                      : 'var(--navbar-text, var(--foreground))',
                }}
              >
                {lang.nativeName} ({lang.code})
                {alternatives[lang.code] && lang.code !== locale && (
                  <span className="ml-2 text-xs opacity-60">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}