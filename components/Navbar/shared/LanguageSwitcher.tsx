'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { getEnabledLanguages, clearEnabledLanguagesCache } from '@/lib/languages/client';

const COLOR_TRANSITION = `color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;
const BG_COLOR_TRANSITION = `background-color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const currentLocale = pathname.split('/')[1] || 'en';

  const [languages, setLanguages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getEnabledLanguages()
      .then(setLanguages)
      .finally(() => setLoading(false));
  }, []);

  // ✅ 打开下拉框时，先清缓存再拉最新
  const handleToggle = async () => {
    const nextOpen = !open;

    if (nextOpen) {
      try {
        clearEnabledLanguagesCache();  // 先清缓存，强制重新拉取
        const fresh = await getEnabledLanguages();
        if (Array.isArray(fresh)) {
          setLanguages(fresh);
        }
      } catch (err) {
        console.warn('[LanguageSwitcher] 刷新语言列表失败，用缓存:', err);
      }
    }

    setOpen(nextOpen);
  };

  const handleLocaleChange = (newLocale: string) => {
    if (newLocale === currentLocale) return;
    document.cookie = `preferred_language=${newLocale}; path=/; max-age=31536000`;
    document.cookie = `user_selected_language=true; path=/; max-age=31536000`;
    window.location.href = `/${newLocale}`;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading || languages.length === 0) return null;

  const currentLang = languages.find(lang => lang.code === currentLocale)?.nativeName || currentLocale;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="flex items-center transition-colors"
        style={{
          color: 'var(--navbar-text, var(--foreground, #0f172a))',
          fontSize: 'var(--font-size-sm, 0.875rem)',
          gap: 'var(--spacing-1, 0.25rem)',
          paddingLeft: 'var(--spacing-3, 0.75rem)',
          paddingRight: 'var(--spacing-3, 0.75rem)',
          paddingTop: 'var(--spacing-2, 0.5rem)',
          paddingBottom: 'var(--spacing-2, 0.5rem)',
          transition: COLOR_TRANSITION,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--navbar-hover-text, var(--primary, #1e293b))';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--navbar-text, var(--foreground, #0f172a))';
        }}
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
          className="absolute right-0 w-48 max-h-80 overflow-y-auto z-50"
          style={{
            marginTop: 'var(--spacing-2, 0.5rem)',
            borderRadius: 'var(--radius-lg, 0.75rem)',
            backgroundColor: 'var(--navbar-bg, var(--background, #ffffff))',
            boxShadow: 'var(--dropdown-shadow, 0 -2px 8px -2px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05))',
            borderTop: '1px solid var(--navbar-divider-color, rgba(255,255,255,0.15))',
            paddingTop: 'var(--spacing-1, 0.25rem)',
            paddingBottom: 'var(--spacing-1, 0.25rem)',
          }}
        >
          {languages.map((lang) => {
            const isActive = lang.code === currentLocale;
            return (
              <button
                key={lang.code}
                onClick={() => handleLocaleChange(lang.code)}
                className="block w-full text-left transition-colors"
                style={{
                  color: isActive
                    ? 'var(--navbar-active-text, var(--navbar-hover-text, var(--primary, #1e293b)))'
                    : 'var(--navbar-text, var(--foreground, #0f172a))',
                  backgroundColor: isActive
                    ? 'var(--navbar-hover-bg, #f3f4f6)'
                    : 'transparent',
                  fontSize: 'var(--font-size-base, 1rem)',
                  paddingLeft: 'var(--spacing-4, 1rem)',
                  paddingRight: 'var(--spacing-4, 1rem)',
                  paddingTop: 'var(--spacing-2, 0.5rem)',
                  paddingBottom: 'var(--spacing-2, 0.5rem)',
                  transition: `${COLOR_TRANSITION}, ${BG_COLOR_TRANSITION}`,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--navbar-hover-bg, #f3f4f6)';
                    e.currentTarget.style.color = 'var(--navbar-hover-text, var(--primary, #1e293b))';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--navbar-text, var(--foreground, #0f172a))';
                  }
                }}
              >
                <span
                  className="flex items-center"
                  style={{ gap: 'var(--spacing-2, 0.5rem)' }}
                >
                  {isActive && (
                    <span style={{ color: 'var(--navbar-active-text, var(--primary, #1e293b))' }}>✓</span>
                  )}
                  {lang.nativeName} ({lang.code})
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}