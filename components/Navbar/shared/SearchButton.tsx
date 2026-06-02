'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Search, X } from 'lucide-react';

interface SearchButtonProps {
  placeholder?: string;
}

export default function SearchButton({ placeholder: configPlaceholder = '' }: SearchButtonProps) {
  const t = useTranslations('Common');
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [navbarBottom, setNavbarBottom] = useState(0);
  const [navbarHeight, setNavbarHeight] = useState(70);

  // 安全获取翻译，若缺失则使用降级文本
  const getSearchPlaceholder = () => {
    if (configPlaceholder) return configPlaceholder;
    try {
      // 尝试获取翻译
      return t('search_placeholder');
    } catch {
      // 降级为默认英文
      return 'Search...';
    }
  };
  const finalPlaceholder = getSearchPlaceholder();

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
      <button
        onClick={toggleOpen}
        className="p-2 rounded-md hover:bg-accent transition-colors"
        aria-label="Search"
      >
        <Search className="w-5 h-5" />
      </button>

      {isOpen && (
        <div
          ref={containerRef}
          className="fixed left-0 w-full z-50 shadow-lg"
          style={{
            top: `${navbarBottom}px`,
            backgroundColor: 'var(--navbar-bg, var(--background))',
            borderTop: '1px solid rgba(0, 0, 0, 0.05)',
            borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
            height: `${navbarHeight}px`,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <form onSubmit={handleSearch} className="flex items-center gap-4">
              <div className="flex-1 flex justify-center">
                <div className="w-[70%] relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={finalPlaceholder}
                    className="w-full px-4 py-2 text-base border border-input rounded-full bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={toggleOpen}
                className="p-2 rounded-full hover:bg-accent transition-colors"
                aria-label="Close"
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