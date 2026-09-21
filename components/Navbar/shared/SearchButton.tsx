'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Search, X } from 'lucide-react';

interface SearchButtonProps {
  placeholder?: string;
}

// ============================================================
// 公共样式常量
// ============================================================
const COLOR_TRANSITION = `color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;
const BG_COLOR_TRANSITION = `background-color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;
const BORDER_TRANSITION = `border-color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;

export default function SearchButton({ placeholder: configPlaceholder = '' }: SearchButtonProps) {
  const t = useTranslations('Shared');
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [navbarBottom, setNavbarBottom] = useState(0);
  const [navbarHeight, setNavbarHeight] = useState(70);

  // 优先使用翻译，若翻译不可用则使用传入的占位符（降级）
  const finalPlaceholder = t('searchPlaceholder') || configPlaceholder;

  // 获取导航栏位置和高度
  useEffect(() => {
    const updateNavbarRect = () => {
      const navbar = document.querySelector('#main-navbar');
      if (navbar) {
        const rect = navbar.getBoundingClientRect();
        setNavbarBottom(rect.bottom);
        setNavbarHeight(rect.height);
      } else {
        setNavbarBottom(0);
        setNavbarHeight(70);
      }
    };
    updateNavbarRect();
    window.addEventListener('resize', updateNavbarRect);
    window.addEventListener('scroll', updateNavbarRect);
    return () => {
      window.removeEventListener('resize', updateNavbarRect);
      window.removeEventListener('scroll', updateNavbarRect);
    };
  }, []);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 打开时聚焦输入框
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(query)}`;
    }
  };

  const toggleOpen = () => setIsOpen(!isOpen);

  return (
    <>
      {/* ============================================================
          搜索触发按钮
          ============================================================ */}
      <button
        onClick={toggleOpen}
        className="rounded-md"
        style={{
          color: 'var(--navbar-text, var(--foreground, #0f172a))',
          padding: 'var(--spacing-2, 0.5rem)',
          borderRadius: 'var(--radius-md, 0.625rem)',
          transition: COLOR_TRANSITION,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--navbar-hover-text, var(--primary, #1e293b))';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--navbar-text, var(--foreground, #0f172a))';
        }}
        aria-label={t('search')}
      >
        <Search className="w-5 h-5" />
      </button>

      {/* ============================================================
          搜索面板
          ============================================================ */}
      {isOpen && (
        <div
          ref={containerRef}
          className="fixed left-0 w-full z-50"
          style={{
            top: `${navbarBottom}px`,
            backgroundColor: 'var(--navbar-bg, var(--background, #ffffff))',
            borderTop: '1px solid var(--navbar-divider-color, rgba(0, 0, 0, 0.05))',
            // ✅ 移除 borderBottom
            boxShadow: 'var(--shadow-lg, 0 10px 15px -3px rgb(0 0 0 / 0.1))',
            height: `${navbarHeight}px`,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <form
              onSubmit={handleSearch}
              className="flex items-center"
              style={{ gap: 'var(--spacing-4, 1rem)' }}
            >
              <div className="flex-1 flex justify-center">
                <div className="w-[70%] relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={finalPlaceholder}
                    className="w-full rounded-full border focus:outline-none focus:ring-2"
                    style={{
                      paddingLeft: 'var(--spacing-4, 1rem)',
                      paddingRight: 'var(--spacing-4, 1rem)',
                      paddingTop: 'var(--spacing-2, 0.5rem)',
                      paddingBottom: 'var(--spacing-2, 0.5rem)',
                      fontSize: 'var(--font-size-base, 1rem)',
                      backgroundColor: 'var(--background, #ffffff)',
                      borderColor: 'var(--border, #e5e7eb)',
                      color: 'var(--foreground, #1f2937)',
                      transition: `${BORDER_TRANSITION}, box-shadow var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`,
                      '--tw-ring-color': 'var(--ring, var(--primary, #3b82f6))',
                    } as React.CSSProperties}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--ring, var(--primary, #3b82f6))';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border, #e5e7eb)';
                    }}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={toggleOpen}
                className="rounded-md"
                style={{
                  color: 'var(--navbar-text, var(--foreground, #0f172a))',
                  padding: 'var(--spacing-2, 0.5rem)',
                  borderRadius: 'var(--radius-md, 0.625rem)',
                  transition: COLOR_TRANSITION,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--navbar-hover-text, var(--primary, #1e293b))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--navbar-text, var(--foreground, #0f172a))';
                }}
                aria-label={t('close')}
              >
                <X className="w-7 h-7" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}