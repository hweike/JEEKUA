'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { HeaderConfig } from '@/lib/config-loader';
import { SiteSettings } from '@/lib/getSiteSettings';
import Logo from '../shared/Logo';
import MenuItems from '../shared/MenuItems';
import LanguageSwitcher from '../shared/LanguageSwitcher';
import SearchButton from '../shared/SearchButton';
import AnnouncementBar from '../shared/AnnouncementBar';
import { cn } from '@/lib/utils';

interface NavbarClientProps {
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

export default function NavbarClient({ headerConfig, menuTree, siteSettings }: NavbarClientProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navbarHeight, setNavbarHeight] = useState<number>(70);
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

  // 滚动粘性行为（向上滚动显示，向下滚动隐藏）
  useEffect(() => {
    if (menuConfig.stickyBehavior !== 'scroll-up') return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // 向下滚动超过10px且滚动距离大于0时隐藏，向上滚动时显示
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

  // 始终显示粘性（always）时，只添加阴影效果
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

  // 顶部居中布局
  const renderTopCenter = () => (
    <div className="flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex-1 flex justify-start">
          {searchConfig.enabled && <SearchButton placeholder={searchConfig.placeholder} />}
        </div>
        <div className="flex-1 flex justify-center" ref={logoContainerRef}>
          <Logo logoConfig={logoConfig} siteName={siteSettings?.siteName || 'FEISMAN POWER'} />
        </div>
        <div className="flex-1 flex justify-end">
          {utilities.showLanguageSelector && <LanguageSwitcher />}
        </div>
      </div>
      <div className="flex justify-center mt-4">
        <MenuItems items={menuTree} pathname={pathname} menuType={menuConfig.menuType} />
      </div>
    </div>
  );

  // 中间居左布局（原有）
  const renderMiddleLeft = () => (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-10">
        <Logo logoConfig={logoConfig} siteName={siteSettings?.siteName || 'FEISMAN POWER'} />
        <MenuItems items={menuTree} pathname={pathname} menuType={menuConfig.menuType} />
      </div>
      <div className="flex items-center gap-4">
        {searchConfig.enabled && <SearchButton placeholder={searchConfig.placeholder} />}
        {utilities.showLanguageSelector && <LanguageSwitcher />}
      </div>
    </div>
  );

// 中间居中布局（菜单最左，Logo居中，右侧工具，菜单可换行）
const renderMiddleCenter = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 items-center w-full">
    {/* 左侧菜单区域：flex 换行，左对齐 */}
    <div className="flex flex-wrap justify-start gap-x-6 gap-y-2">
      <MenuItems items={menuTree} pathname={pathname} menuType={menuConfig.menuType} />
    </div>

    {/* 中间 Logo：全局居中 */}
    <div className="flex justify-center">
      <Logo logoConfig={logoConfig} siteName={siteSettings?.siteName || 'FEISMAN POWER'} />
    </div>

    {/* 右侧工具：右对齐 */}
    <div className="flex justify-end items-center gap-4">
      {searchConfig.enabled && <SearchButton placeholder={searchConfig.placeholder} />}
      {utilities.showLanguageSelector && <LanguageSwitcher />}
    </div>
  </div>
);
  // 移动端布局
  const renderMobile = () => {
  const isCenter = mobileLogoPosition === 'center';

  if (isCenter) {
    // 居中布局：左侧菜单按钮，中间 Logo，右侧工具
    return (
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
          {searchConfig.enabled && <SearchButton placeholder={searchConfig.placeholder} />}
          {utilities.showLanguageSelector && <LanguageSwitcher />}
        </div>
      </div>
    );
  } else {
    // 左对齐布局：左侧 Logo，右侧工具 + 菜单按钮（原逻辑）
    return (
      <div className="flex items-center justify-between w-full">
        <div className="flex justify-start">
          <Logo logoConfig={logoConfig} siteName={siteSettings?.siteName || 'FEISMAN POWER'} />
        </div>
        <div className="flex items-center gap-2">
          {searchConfig.enabled && <SearchButton placeholder={searchConfig.placeholder} />}
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
    );
  }
};

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

  // 粘性页头样式：始终显示时使用 sticky top-0；向上滚动时动态控制 translateY
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
          showSeparator && "border-b",
          showSeparator && "border-b border-[rgba(255,255,255,0.1)]"
        )}
        style={{
          ...navbarStyle,
          backgroundColor: 'var(--navbar-bg, var(--background))',
          color: 'var(--navbar-text, var(--foreground))',
          '--navbar-height': `${navbarHeight}px`,
        } as React.CSSProperties}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="hidden md:block">{renderDesktop()}</div>
          <div className="md:hidden">{renderMobile()}</div>
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-[rgba(255,255,255,0.15)] mt-2">
              <MenuItems items={menuTree} pathname={pathname} mobile onClickItem={() => setMobileMenuOpen(false)} menuType={menuConfig.menuType} />
            </div>
          )}
        </div>
      </nav>
    </>
  );
}