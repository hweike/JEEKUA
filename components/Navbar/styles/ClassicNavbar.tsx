'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { HeaderConfig } from '@/lib/config-loader';
import { SiteSettings } from '@/lib/getSiteSettings';
import Logo from '../shared/Logo';
import MenuItems from '../shared/MenuItems';
import LanguageSwitcher from '../shared/LanguageSwitcher';
import AnnouncementBar from '../shared/AnnouncementBar';
import { cn } from '@/lib/utils';

interface ClassicNavbarProps {
  headerConfig: HeaderConfig;
  menuTree: any[];
  siteSettings: SiteSettings;
}

const DEFAULT_CONFIG = {
  menu: {
    stickyBehavior: 'scroll-up' as const,
    menuType: 'dropdown' as const,
    showSeparator: true,
    menuSourceId: 'navigation'
  },
  utilities: {
    showLanguageSelector: true,
    topSpacing: 16,
    bottomSpacing: 16
  },
  announcements: {
    enabled: false,
    items: []
  },
  logo: {
    imageUrl: '',
    width: 120,
    position: 'middle-left' as const,
    mobilePosition: 'center' as const,
    faviconUrl: ''
  },
  search: {
    enabled: false,
    placeholder: ''
  }
};

const getDefaultNavbarHeight = (position: string): number => {
  return 70;
};

export default function ClassicNavbar({ headerConfig, menuTree, siteSettings }: ClassicNavbarProps) {
  const pathname = usePathname();
  const t = useTranslations('Common');
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navbarHeight, setNavbarHeight] = useState<number>(70);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [navbarVisible, setNavbarVisible] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const safeConfig = {
    menu: { ...DEFAULT_CONFIG.menu, ...(headerConfig?.menu || {}) },
    utilities: { ...DEFAULT_CONFIG.utilities, ...(headerConfig?.utilities || {}) },
    announcements: { ...DEFAULT_CONFIG.announcements, ...(headerConfig?.announcements || {}) },
    logo: { ...DEFAULT_CONFIG.logo, ...(headerConfig?.logo || {}) },
    search: { ...DEFAULT_CONFIG.search, ...(headerConfig?.search || {}) }
  };

  const { menu: menuConfig, utilities, announcements, logo: logoConfig, search: searchConfig } = safeConfig;
  const defaultHeight = getDefaultNavbarHeight(logoConfig.position);
  const minHeight = 70;
  const maxHeight = 100;

  // 计算行高
  useEffect(() => {
    if (!logoConfig.imageUrl) {
      setNavbarHeight(Math.min(maxHeight, Math.max(minHeight, defaultHeight)));
      return;
    }
    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.height / img.width;
      const scaledHeight = logoConfig.width * aspectRatio;
      const totalHeight = scaledHeight + 16;
      const finalHeight = Math.min(maxHeight, Math.max(minHeight, Math.max(defaultHeight, totalHeight)));
      setNavbarHeight(finalHeight);
    };
    img.onerror = () => {
      setNavbarHeight(Math.min(maxHeight, Math.max(minHeight, defaultHeight)));
    };
    img.src = logoConfig.imageUrl;
  }, [logoConfig.imageUrl, logoConfig.width, defaultHeight]);

  // 滚动粘性
  useEffect(() => {
    if (menuConfig.stickyBehavior !== 'scroll-up') return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 10) {
        setNavbarVisible(false);
        setScrolled(true);
      } else {
        setNavbarVisible(true);
        if (currentScrollY <= 10) setScrolled(false);
        else setScrolled(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, menuConfig.stickyBehavior]);

  useEffect(() => {
    if (menuConfig.stickyBehavior === 'always') {
      const handleScroll = () => {
        setScrolled(window.scrollY > 10);
      };
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [menuConfig.stickyBehavior]);

  const navbarStyle = {
    paddingTop: `${utilities.topSpacing}px`,
    paddingBottom: `${utilities.bottomSpacing}px`,
    minHeight: `${navbarHeight}px`,
  };

  const isSticky = menuConfig.stickyBehavior !== 'none';
  const showSeparator = menuConfig.showSeparator;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const searchPlaceholder = searchConfig.placeholder || t('search_placeholder');

  // 搜索框统一样式
  const searchInputStyle = {
    borderColor: 'var(--navbar-text)',
    backgroundColor: 'color-mix(in srgb, var(--navbar-bg) 70%, transparent)',
    color: 'var(--navbar-text)',
  };

  // 桌面布局
  const renderDesktop = () => (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2">
          <div className="flex-shrink-0">
            <Logo logoConfig={logoConfig} siteName={siteSettings?.siteName || 'FEISMAN POWER'} />
          </div>
          <div className="flex-1 flex justify-center px-4">
            {searchConfig.enabled && (
              <form onSubmit={handleSearch} className="w-full max-w-md">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full px-4 py-2 rounded-full border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  style={searchInputStyle}
                />
              </form>
            )}
          </div>
          <div className="flex-shrink-0">
            {utilities.showLanguageSelector && <LanguageSwitcher />}
          </div>
        </div>
      </div>
            {/* 取消分割线 */}
      {/* <div className="border-t border-[rgba(255,255,255,0.15)] w-full" /> */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center mt-2">
          <MenuItems items={menuTree} pathname={pathname} menuType={menuConfig.menuType} />
        </div>
      </div>
    </>
  );

  // 移动端布局（支持居中/左对齐）
  const renderMobile = () => {
    const isCenter = logoConfig.mobilePosition === 'center';

    return (
      <div className="flex flex-col gap-2">
        {/* 第一行：根据位置显示不同布局 */}
        {isCenter ? (
          <div className="flex items-center justify-between w-full">
            <button
              className="p-2 rounded-md hover:bg-accent"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            <div className="flex justify-center flex-1">
              <Logo logoConfig={logoConfig} siteName={siteSettings?.siteName || 'FEISMAN POWER'} />
            </div>
            <div className="flex items-center gap-2">
              {utilities.showLanguageSelector && <LanguageSwitcher />}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="flex justify-start">
              <Logo logoConfig={logoConfig} siteName={siteSettings?.siteName || 'FEISMAN POWER'} />
            </div>
            <div className="flex items-center gap-2">
              {utilities.showLanguageSelector && <LanguageSwitcher />}
              <button
                className="p-2 rounded-md hover:bg-accent"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* 搜索框（独立一行） */}
        {searchConfig.enabled && (
          <form onSubmit={handleSearch} className="mt-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full px-4 py-2 rounded-full border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              style={searchInputStyle}
            />
          </form>
        )}

        {/* 移动端菜单 */}
        {mobileMenuOpen && (
          <div className="py-2 border-t border-[rgba(255,255,255,0.15)]">
            <MenuItems items={menuTree} pathname={pathname} mobile onClickItem={() => setMobileMenuOpen(false)} menuType={menuConfig.menuType} />
          </div>
        )}
      </div>
    );
  };

  const stickyClass = () => {
    if (!isSticky) return '';
    if (menuConfig.stickyBehavior === 'always') return 'sticky top-0';
    if (menuConfig.stickyBehavior === 'scroll-up') {
      return navbarVisible ? 'sticky top-0' : 'sticky top-0 -translate-y-full';
    }
    return '';
  };

  return (
    <>
      {announcements.enabled && announcements.items.length > 0 && (
        <AnnouncementBar items={announcements.items} />
      )}
      <nav
        id="main-navbar"
        className={cn(
          "relative transition-transform duration-300 ease-in-out",
          stickyClass(),
          menuConfig.stickyBehavior === 'scroll-up' && scrolled && "shadow-md",
          showSeparator && "border-b border-[rgba(255,255,255,0.1)]"
        )}
        style={{
          ...navbarStyle,
          backgroundColor: 'var(--navbar-bg, var(--background))',
          color: 'var(--navbar-text, var(--foreground))',
          '--navbar-height': `${navbarHeight}px`,
        } as React.CSSProperties}
      >
        <div className="hidden md:block">{renderDesktop()}</div>
        <div className="md:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {renderMobile()}
          </div>
        </div>
      </nav>
    </>
  );
}