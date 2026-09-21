'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { HeaderConfig } from '@/lib/config-loader';
import { SiteSettings } from '@/lib/getSiteSettings';
import Logo from '../shared/Logo';
import MenuItems from '../shared/MenuItems';
import RightTools from '../shared/RightTools';
import AnnouncementBar from '../shared/AnnouncementBar';
import { cn } from '@/lib/utils';
import MobileNav from '../shared/MobileNav';

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
  if (position === 'top-center') return 100;
  return 70;
};

export default function ClassicNavbar({ headerConfig, menuTree, siteSettings }: ClassicNavbarProps) {
  const pathname = usePathname();
  const t = useTranslations('Shared');
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navbarHeight, setNavbarHeight] = useState<number>(70);
  const navbarHeightRef = useRef<number>(70);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [navbarVisible, setNavbarVisible] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navbarRef = useRef<HTMLElement>(null);

  const safeConfig = {
    menu: { ...DEFAULT_CONFIG.menu, ...(headerConfig?.menu || {}) },
    utilities: { ...DEFAULT_CONFIG.utilities, ...(headerConfig?.utilities || {}) },
    announcements: { ...DEFAULT_CONFIG.announcements, ...(headerConfig?.announcements || {}) },
    logo: { ...DEFAULT_CONFIG.logo, ...(headerConfig?.logo || {}) },
    search: { ...DEFAULT_CONFIG.search, ...(headerConfig?.search || {}) }
  };

  const { menu: menuConfig, utilities, announcements, logo: logoConfig, search: searchConfig } = safeConfig;
  const logoPosition = logoConfig.position;
  const mobileLogoPosition = logoConfig.mobilePosition;
  const defaultHeight = getDefaultNavbarHeight(logoPosition);
  const minHeight = 70;
  const maxHeight = 120;
  const menuType = menuConfig.menuType as any;
  const locale = pathname.split('/')[1] || 'zh';

  useEffect(() => {
    if (!logoConfig.imageUrl) {
      const h = Math.min(maxHeight, Math.max(minHeight, defaultHeight));
      setNavbarHeight(h);
      navbarHeightRef.current = h;
      return;
    }
    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.height / img.width;
      const scaledHeight = logoConfig.width * aspectRatio;
      const totalHeight = scaledHeight + 16;
      const finalHeight = Math.min(maxHeight, Math.max(minHeight, Math.max(defaultHeight, totalHeight)));
      setNavbarHeight(finalHeight);
      navbarHeightRef.current = finalHeight;
    };
    img.onerror = () => {
      const h = Math.min(maxHeight, Math.max(minHeight, defaultHeight));
      setNavbarHeight(h);
      navbarHeightRef.current = h;
    };
    img.src = logoConfig.imageUrl;
  }, [logoConfig.imageUrl, logoConfig.width, defaultHeight]);

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

  // ✅ 改进滚动粘性：使用导航栏实际高度 + 缓冲
  useEffect(() => {
    if (menuConfig.stickyBehavior !== 'scroll-up') return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const actualHeight = navbarRef.current?.offsetHeight || navbarHeightRef.current;
      const threshold = actualHeight + 20;

      if (currentScrollY > threshold && currentScrollY > lastScrollY) {
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

  const navbarStyle: React.CSSProperties = {
    paddingBottom: `${utilities.bottomSpacing}px`,
  };

  const isSticky = menuConfig.stickyBehavior !== 'none';
  const showSeparator = menuConfig.showSeparator;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const searchPlaceholder = searchConfig.placeholder || t('searchPlaceholder');

  // ✅ 搜索框样式（用变量 + fallback）
  const searchInputStyle: React.CSSProperties = {
    borderColor: 'var(--navbar-text, var(--foreground, #0f172a))',
    backgroundColor: 'color-mix(in srgb, var(--navbar-bg, var(--background, #ffffff)) 70%, transparent)',
    color: 'var(--navbar-text, var(--foreground, #0f172a))',
    paddingLeft: 'var(--spacing-4, 1rem)',
    paddingRight: 'var(--spacing-4, 1rem)',
    paddingTop: 'var(--spacing-2, 0.5rem)',
    paddingBottom: 'var(--spacing-2, 0.5rem)',
    borderRadius: 'var(--radius-full, 9999px)',
    fontSize: 'var(--font-size-base, 1rem)',
    transition: `border-color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease), box-shadow var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`,
  };

  // ========== 桌面布局 ==========
  // ---- 顶部居中：Logo 居中，搜索框居中，RightTools 右对齐 ----
  const renderTopCenter = () => (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      style={{ paddingTop: `${utilities.topSpacing}px` }}
    >
      <div style={{ paddingTop: 'var(--spacing-2, 0.5rem)', paddingBottom: 'var(--spacing-2, 0.5rem)' }}>
        <div className="flex justify-center">
          <Logo logoConfig={logoConfig} siteName={siteSettings?.siteName || 'My Web'} />
        </div>
      </div>
      <div
        className="grid grid-cols-3 items-center"
        style={{ paddingTop: 'var(--spacing-2, 0.5rem)', paddingBottom: 'var(--spacing-2, 0.5rem)' }}
      >
        <div className="flex justify-start" /> {/* 左占位 */}
        <div className="flex justify-center" style={{ paddingLeft: 'var(--spacing-4, 1rem)', paddingRight: 'var(--spacing-4, 1rem)' }}>
          {searchConfig.enabled && (
            <form onSubmit={handleSearch} className="w-full" style={{ maxWidth: '500px' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full border focus:outline-none focus:ring-2"
                style={searchInputStyle}
              />
            </form>
          )}
        </div>
        <div className="flex justify-end">
          <RightTools
            showSearch={false}
            showLanguageSelector={utilities.showLanguageSelector}
            locale={locale}
          />
        </div>
      </div>
      <div
        className="flex justify-center"
        style={{ paddingTop: 'var(--spacing-2, 0.5rem)', paddingBottom: 'var(--spacing-2, 0.5rem)' }}
      >
        <MenuItems items={menuTree} pathname={pathname} menuType={menuType} />
      </div>
    </div>
  );

  // ---- 中部居左：Logo 左，搜索框居中，RightTools 右 ----
  const renderMiddleLeft = () => (
    <>
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        style={{ paddingTop: `${utilities.topSpacing}px` }}
      >
        <div
          className="flex items-center justify-between"
          style={{ paddingTop: 'var(--spacing-2, 0.5rem)', paddingBottom: 'var(--spacing-2, 0.5rem)' }}
        >
          <div className="flex-shrink-0">
            <Logo logoConfig={logoConfig} siteName={siteSettings?.siteName || 'My Web'} />
          </div>
          <div
            className="flex-1 flex justify-center"
            style={{ paddingLeft: 'var(--spacing-4, 1rem)', paddingRight: 'var(--spacing-4, 1rem)' }}
          >
            {searchConfig.enabled && (
              <form onSubmit={handleSearch} className="w-full" style={{ maxWidth: '28rem' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full border focus:outline-none focus:ring-2"
                  style={searchInputStyle}
                />
              </form>
            )}
          </div>
          <div className="flex-shrink-0">
            <RightTools
              showSearch={false}
              showLanguageSelector={utilities.showLanguageSelector}
              locale={locale}
            />
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="flex justify-center"
          style={{ paddingTop: 'var(--spacing-2, 0.5rem)', paddingBottom: 'var(--spacing-2, 0.5rem)' }}
        >
          <MenuItems items={menuTree} pathname={pathname} menuType={menuType} />
        </div>
      </div>
    </>
  );

  // ---- 中部居中：Logo 中，RightTools 右，菜单在下 ----
  const renderMiddleCenter = () => (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      style={{ paddingTop: `${utilities.topSpacing}px` }}
    >
      <div
        className="flex items-center justify-between"
        style={{ paddingTop: 'var(--spacing-2, 0.5rem)', paddingBottom: 'var(--spacing-2, 0.5rem)' }}
      >
        <div className="flex-1 flex justify-start" />
        <div className="flex justify-center">
          <Logo logoConfig={logoConfig} siteName={siteSettings?.siteName || 'My Web'} />
        </div>
        <div
          className="flex-1 flex justify-end items-center"
          style={{ gap: 'var(--spacing-4, 1rem)' }}
        >
          <RightTools
            showSearch={searchConfig.enabled}
            searchPlaceholder={searchConfig.placeholder}
            showLanguageSelector={utilities.showLanguageSelector}
            locale={locale}
          />
        </div>
      </div>
      <div
        className="flex justify-center"
        style={{ paddingTop: 'var(--spacing-2, 0.5rem)', paddingBottom: 'var(--spacing-2, 0.5rem)' }}
      >
        <MenuItems items={menuTree} pathname={pathname} menuType={menuType} />
      </div>
    </div>
  );

  const renderDesktop = () => {
    switch (logoPosition) {
      case 'top-center':
        return renderTopCenter();
      case 'middle-center':
        return renderMiddleCenter();
      default:
        return renderMiddleLeft();
    }
  };

  const stickyClass = () => {
    if (!isSticky) return '';
    if (menuConfig.stickyBehavior === 'always') return 'sticky top-0';
    if (menuConfig.stickyBehavior === 'scroll-up') {
      return 'sticky top-0';
    }
    return '';
  };

  const showAnnouncement = announcements.enabled && announcements.items.length > 0;

  return (
    <nav
      id="main-navbar"
      ref={navbarRef}
      className={cn(
        "relative w-full box-border",
        stickyClass()
      )}
      style={{
        left: 0,
        right: 0,
        minWidth: 0,
        backgroundColor: 'transparent',
      } as React.CSSProperties}
    >
      {/* 滑动容器 */}
      <div
        className={cn(
          "bg-[var(--navbar-bg,var(--background,#ffffff))]",
          "text-[var(--navbar-text,var(--foreground,#0f172a))]",
          showSeparator && "border-b",
          menuConfig.stickyBehavior === 'scroll-up' && !navbarVisible && "-translate-y-full"
        )}
        style={{
          ...navbarStyle,
          borderColor: showSeparator
            ? 'var(--navbar-divider-color, rgba(255,255,255,0.1))'
            : undefined,
          transition: `transform var(--transition-duration-300, 300ms) var(--transition-timing-ease, ease), box-shadow var(--transition-duration-300, 300ms) var(--transition-timing-ease, ease)`,
          boxShadow: menuConfig.stickyBehavior === 'scroll-up' && scrolled
            ? 'var(--shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1))'
            : undefined,
        }}
      >
        {/* 公告栏 */}
        {showAnnouncement && <AnnouncementBar items={announcements.items} />}

        <div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          style={{ paddingTop: `${utilities.topSpacing}px` }}
        >
          {/* 桌面内容 */}
          <div className="hidden md:block">{renderDesktop()}</div>

          {/* 移动端内容 */}
          <div className="md:hidden">
            <MobileNav
              logoConfig={logoConfig}
              siteSettings={siteSettings}
              menuTree={menuTree}
              pathname={pathname}
              mobileMenuOpen={mobileMenuOpen}
              setMobileMenuOpen={setMobileMenuOpen}
              searchConfig={searchConfig}
              utilities={utilities}
              locale={locale}
              menuType={menuType}
              onCloseMenu={() => {}}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}