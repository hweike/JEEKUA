'use client';

import { useState, useEffect, useRef } from 'react';
import { HeaderConfig } from '@/lib/config-loader';
import { SiteSettings } from '@/lib/getSiteSettings';
import Logo from './Logo';
import MenuItems from './MenuItems';
import RightTools from './RightTools';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  logoConfig: HeaderConfig['logo'];
  siteSettings: SiteSettings;
  menuTree: any[];
  pathname: string;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  searchConfig: { enabled: boolean; placeholder?: string };
  utilities: { showLanguageSelector: boolean };
  locale: string;
  menuType: 'dropdown' | 'mega';
  onCloseMenu?: () => void;
}

// ============================================================
// 公共样式常量
// ============================================================
const BG_COLOR_TRANSITION = `background-color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;

export default function MobileNav({
  logoConfig,
  siteSettings,
  menuTree,
  pathname,
  mobileMenuOpen,
  setMobileMenuOpen,
  searchConfig,
  utilities,
  locale,
  menuType,
  onCloseMenu,
}: MobileNavProps) {
  const mobileWidth = Math.round(logoConfig.width * 0.7);
  const isCenter = logoConfig.mobilePosition === 'center';

  // 控制 body 滚动
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <>
      {/* 移动端导航栏 */}
      <div className="relative flex items-center justify-between w-full">
        {/* ============================================================
            汉堡按钮
            ============================================================ */}
        <button
          className="rounded-md"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu"
          style={{
            padding: 'var(--spacing-2, 0.5rem)',
            borderRadius: 'var(--radius-md, 0.625rem)',
            color: 'var(--navbar-text, var(--foreground, #0f172a))',
            transition: BG_COLOR_TRANSITION,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent, #f1f5f9)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* ============================================================
            Logo（居中或左对齐）
            ============================================================ */}
        {isCenter ? (
          <div className="absolute left-1/2 -translate-x-1/2">
            <Logo
              logoConfig={{ ...logoConfig, width: mobileWidth }}
              siteName={siteSettings?.siteName || 'My Web'}
            />
          </div>
        ) : (
          <div className="flex justify-start flex-1">
            <Logo
              logoConfig={{ ...logoConfig, width: mobileWidth }}
              siteName={siteSettings?.siteName || 'My Web'}
            />
          </div>
        )}

        {/* ============================================================
            右侧工具（搜索、语言切换等）
            ============================================================ */}
        <div
          className="flex items-center relative z-10"
          style={{ gap: 'var(--spacing-2, 0.5rem)' }}
        >
          <RightTools
            showSearch={searchConfig.enabled}
            searchPlaceholder={searchConfig.placeholder}
            showLanguageSelector={utilities.showLanguageSelector}
            locale={locale}
          />
        </div>
      </div>

      {/* ============================================================
          移动端菜单抽屉
          ============================================================ */}
      {mobileMenuOpen && (
        <div
          className="absolute left-0 right-0 overflow-y-auto z-50"
          style={{
            top: '100%',
            maxHeight: 'calc(100vh - 70px)',
            backgroundColor: 'var(--navbar-bg, var(--background, #ffffff))',
            color: 'var(--navbar-text, var(--foreground, #0f172a))',
          }}
        >
          <div style={{ padding: 'var(--spacing-4, 1rem)' }}>
            <MenuItems
              items={menuTree}
              pathname={pathname}
              mobile
              onClickItem={() => {
                setMobileMenuOpen(false);
                if (onCloseMenu) onCloseMenu();
              }}
              menuType={menuType}
            />
          </div>
        </div>
      )}
    </>
  );
}