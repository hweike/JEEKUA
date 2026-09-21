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

interface LuxuryNavbarProps {
  headerConfig: HeaderConfig;
  menuTree: any[];
  siteSettings: SiteSettings;
  footerConfig?: any;
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

export default function LuxuryNavbar({ headerConfig, menuTree, siteSettings, footerConfig }: LuxuryNavbarProps) {
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'zh';
  const isHome = pathname === '/' ||
    pathname === `/${locale}` ||
    pathname === `/${locale}/` ||
    pathname === `/${locale}/home` ||
    pathname === `/${locale}/home/`;

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navbarHeight, setNavbarHeight] = useState<number>(70);
  const [isHovering, setIsHovering] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastHoveredElementRef = useRef<HTMLElement | null>(null);

  const safeConfig = {
    menu: { ...DEFAULT_CONFIG.menu, ...(headerConfig?.menu || {}) },
    utilities: { ...DEFAULT_CONFIG.utilities, ...(headerConfig?.utilities || {}) },
    announcements: { ...DEFAULT_CONFIG.announcements, ...(headerConfig?.announcements || {}) },
    logo: { ...DEFAULT_CONFIG.logo, ...(headerConfig?.logo || {}) },
    search: { ...DEFAULT_CONFIG.search, ...(headerConfig?.search || {}) }
  };

  const { menu: menuConfig, utilities, announcements, logo: logoConfig, search: searchConfig } = safeConfig;
  const logoPosition = logoConfig.position;
  const defaultHeight = getDefaultNavbarHeight(logoPosition);
  const minHeight = 70;
  const maxHeight = 100;
  const menuType = menuConfig.menuType as any;

  // ✅ 先声明 showSeparator / showAnnouncement（避免 TDZ 报错）
  const showSeparator = menuConfig.showSeparator;
  const showAnnouncement = announcements.enabled && announcements.items.length > 0;

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

  // 滚动监听
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 移动端菜单 body 滚动控制
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

  // 辅助：判断元素是否在导航栏或菜单面板内
  const isInNavbarOrMenu = (target: HTMLElement | null): boolean => {
    if (!target) return false;
    const container = containerRef.current;
    if (container && container.contains(target)) return true;
    const menuPanel = target.closest('.dropdown-menu, .mega-menu, [role="menu"], [data-dropdown-open]');
    return !!menuPanel;
  };

  // 辅助：检测是否有任何菜单处于打开状态
  const isAnyMenuOpen = (): boolean => {
    const megaMenus = document.querySelectorAll('details.mega-menu[open]');
    const dropdownMenus = document.querySelectorAll('[data-dropdown-open]');
    return megaMenus.length > 0 || dropdownMenus.length > 0;
  };

  // 评估是否应该关闭背景
  const evaluateBackgroundOnMenuClose = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    if (lastHoveredElementRef.current && isInNavbarOrMenu(lastHoveredElementRef.current)) {
      setIsHovering(true);
      return;
    }

    if (isAnyMenuOpen()) {
      setIsHovering(true);
      return;
    }

    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovering(false);
    }, 200);
  };

  // 全局事件监听
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      lastHoveredElementRef.current = target;
      if (isInNavbarOrMenu(target)) {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        setIsHovering(true);
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const relatedTarget = e.relatedTarget as HTMLElement | null;
      if (!isInNavbarOrMenu(target)) return;
      if (relatedTarget && isInNavbarOrMenu(relatedTarget)) return;

      if (isAnyMenuOpen()) {
        return;
      }

      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHovering(false);
      }, 200);
    };

    const handleToggle = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.matches('details.mega-menu, details.dropdown-menu')) {
        setTimeout(() => {
          evaluateBackgroundOnMenuClose();
        }, 50);
      }
    };

    const handleDropdownToggle = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail.open !== 'undefined') {
        setTimeout(() => {
          evaluateBackgroundOnMenuClose();
        }, 50);
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('toggle', handleToggle, true);
    document.addEventListener('dropdown-toggle', handleDropdownToggle);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('toggle', handleToggle, true);
      document.removeEventListener('dropdown-toggle', handleDropdownToggle);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // 背景色逻辑
  const getBackgroundColor = () => {
    if (isHome) {
      if (scrolled || isHovering || mobileMenuOpen) {
        return 'var(--navbar-bg, var(--background, #ffffff))';
      }
      return 'transparent';
    } else {
      return 'var(--navbar-bg, var(--background, #ffffff))';
    }
  };
  const backgroundColor = getBackgroundColor();

  // ✅ navbarStyle 现在可以安全引用 showSeparator
  const navbarStyle: React.CSSProperties = {
    paddingBottom: `${utilities.bottomSpacing}px`,
    minHeight: `${navbarHeight}px`,
    backgroundColor,
    borderColor: showSeparator
      ? 'var(--navbar-divider-color, rgba(255,255,255,0.1))'
      : undefined,
    transition: `background-color var(--transition-duration-300, 300ms) var(--transition-timing-ease, ease), box-shadow var(--transition-duration-300, 300ms) var(--transition-timing-ease, ease)`,
    boxShadow: scrolled
      ? 'var(--shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1))'
      : undefined,
  };

  const renderDesktop = () => (
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

  const containerClassName = isHome
    ? 'fixed top-0 left-0 w-full z-50'
    : 'sticky top-0 z-50';

  return (
    <>
      <div
        ref={containerRef}
        className={containerClassName}
      >
        {showAnnouncement && (
          <div className="w-full">
            <AnnouncementBar items={announcements.items} />
          </div>
        )}

        <nav
          id="main-navbar"
          className={cn(
            "w-full box-border",
            showSeparator && "border-b"
          )}
          style={navbarStyle}
        >
          <div
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
            style={{ paddingTop: `${utilities.topSpacing}px` }}
          >
            <div className="hidden md:block">{renderDesktop()}</div>
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
        </nav>
      </div>
    </>
  );
}