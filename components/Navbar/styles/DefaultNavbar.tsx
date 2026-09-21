'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { HeaderConfig } from '@/lib/config-loader';
import { SiteSettings } from '@/lib/getSiteSettings';
import Logo from '../shared/Logo';
import MenuItems from '../shared/MenuItems';
import RightTools from '../shared/RightTools';
import AnnouncementBar from '../shared/AnnouncementBar';
import { cn } from '@/lib/utils';
import MobileNav from '../shared/MobileNav';

interface DefaultNavbarProps {
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
    placeholder: 'Search...'
  }
};

const getDefaultNavbarHeight = (position: string): number => {
  if (position === 'top-center') return 90;
  return 70;
};

export default function DefaultNavbar({ headerConfig, menuTree, siteSettings }: DefaultNavbarProps) {
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'zh';
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navbarHeight, setNavbarHeight] = useState<number>(70);
  const navbarHeightRef = useRef<number>(70);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [navbarVisible, setNavbarVisible] = useState(true);
  const logoContainerRef = useRef<HTMLDivElement>(null);

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
  const maxHeight = 100;
  const menuType = menuConfig.menuType as any;

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

  useEffect(() => {
    if (menuConfig.stickyBehavior !== 'scroll-up') return;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const currentHeight = navbarHeightRef.current;
      if (currentScrollY > currentHeight && currentScrollY > lastScrollY) {
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

  // 仅保留 bottomSpacing
  const navbarStyle: React.CSSProperties = {
    paddingBottom: `${utilities.bottomSpacing}px`,
  };

  const isSticky = menuConfig.stickyBehavior !== 'none';
  const showSeparator = menuConfig.showSeparator;

  // ----- 桌面布局函数 -----
  const renderTopCenter = () => (
    <div className="flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex-1 flex justify-start">
          <RightTools
            showSearch={searchConfig.enabled}
            searchPlaceholder={searchConfig.placeholder}
            showLanguageSelector={false}
            locale={locale}
          />
        </div>
        <div className="flex-1 flex justify-center" ref={logoContainerRef}>
          <Logo logoConfig={logoConfig} siteName={siteSettings?.siteName || 'My Web'} />
        </div>
        <div className="flex-1 flex justify-end">
          <RightTools
            showSearch={false}
            showLanguageSelector={utilities.showLanguageSelector}
            locale={locale}
          />
        </div>
      </div>
      <div
        className="flex justify-center"
        style={{ marginTop: 'var(--spacing-4, 1rem)' }}
      >
        <MenuItems items={menuTree} pathname={pathname} menuType={menuType} />
      </div>
    </div>
  );

  const renderMiddleLeft = () => (
    <div className="flex items-center justify-between w-full">
      <div
        className="flex items-center"
        style={{ gap: 'var(--spacing-10, 2.5rem)' }}
      >
        <Logo logoConfig={logoConfig} siteName={siteSettings?.siteName || 'My Web'} />
        <MenuItems items={menuTree} pathname={pathname} menuType={menuType} />
      </div>
      <RightTools
        showSearch={searchConfig.enabled}
        searchPlaceholder={searchConfig.placeholder}
        showLanguageSelector={utilities.showLanguageSelector}
        locale={locale}
      />
    </div>
  );

  const renderMiddleCenter = () => (
    <div
      className="grid grid-cols-1 md:grid-cols-3 items-center w-full"
      style={{ columnGap: 'var(--spacing-12, 3rem)' }}
    >
      <div
        className="flex flex-wrap justify-start"
        style={{
          columnGap: 'var(--spacing-6, 1.5rem)',
          rowGap: 'var(--spacing-2, 0.5rem)',
          paddingRight: 'var(--spacing-8, 2rem)',
        }}
      >
        <MenuItems items={menuTree} pathname={pathname} menuType={menuType} wrap={true} />
      </div>
      <div className="flex justify-center">
        <Logo logoConfig={logoConfig} siteName={siteSettings?.siteName || 'My Web'} />
      </div>
      <div
        className="flex justify-end items-center"
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