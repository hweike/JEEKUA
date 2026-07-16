'use client';

import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import Logo from '../../shared/Logo';
import SearchButton from '../../shared/SearchButton';
import LuxuryAnnouncementBar from './LuxuryAnnouncementBar';
import LuxuryMenuDrawer from './LuxuryMenuDrawer';

const MenuHoverContext = createContext<{
  onMenuHover: () => void;
  onMenuLeave: () => void;
}>({
  onMenuHover: () => {},
  onMenuLeave: () => {},
});

// ==================== 普通下拉菜单项 ====================
function DropdownMenuItem({ item, pathname, locale, navbarRef }: { item: any; pathname: string; locale: string; navbarRef: React.RefObject<HTMLElement> }) {
  const [open, setOpen] = useState(false);
  const [panelTop, setPanelTop] = useState(0);
  const [panelLeft, setPanelLeft] = useState(0);
  const hoverTimer = useRef<NodeJS.Timeout | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { onMenuHover, onMenuLeave } = useContext(MenuHoverContext);

  const updatePanelPosition = () => {
    if (!navbarRef.current || !buttonRef.current) return;
    const navbarRect = navbarRef.current.getBoundingClientRect();
    const buttonRect = buttonRef.current.getBoundingClientRect();
    setPanelTop(navbarRect.bottom);
    setPanelLeft(buttonRect.left);
  };

  useEffect(() => {
    if (open) {
      updatePanelPosition();
      window.addEventListener('resize', updatePanelPosition);
      return () => window.removeEventListener('resize', updatePanelPosition);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleScroll = () => setOpen(false);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [open]);

  const handleMouseEnter = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    onMenuHover();
    setOpen(true);
  };
  const handleMouseLeave = () => {
    hoverTimer.current = setTimeout(() => {
      setOpen(false);
      onMenuLeave();
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    };
  }, []);

  const isActive = pathname === `/${locale}${item.linkValue}` || pathname?.startsWith(item.linkValue);
  const getFullPath = (linkValue: string) => (linkValue.startsWith('/') ? `/${locale}${linkValue}` : linkValue);

  if (!item.children || item.children.length === 0) {
    return (
      <Link
        href={getFullPath(item.linkValue)}
        className={cn(
          "inline-block px-3 py-2 rounded-md transition-all duration-200 hover:bg-[var(--navbar-hover-bg)] hover:text-[var(--navbar-hover-text)]",
          isActive && "text-[var(--navbar-active-text)] font-semibold"
        )}
        style={{
          color: isActive ? 'var(--navbar-active-text)' : 'var(--navbar-text, var(--foreground))',
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {item.label}
      </Link>
    );
  }

  const renderSubMenu = (items: any[]) => {
    return (
      <div
        className="fixed w-56 rounded-b-2xl shadow-lg border border-border/50 z-50 overflow-hidden"
        style={{
          top: `${panelTop}px`,
          left: `${panelLeft}px`,
          backgroundColor: 'var(--navbar-bg, var(--background))',
          color: 'var(--navbar-text, var(--foreground))',
        }}
      >
        <div className="py-1">
          {items.map((child: any, idx: number) => {
            const hasGrand = child.children && child.children.length > 0;
            return (
              <div
                key={child.id}
                className="relative group-sub"
                style={{ animation: `fadeInUp 0.2s ease-out ${idx * 0.03}s both` }}
              >
                <Link
                  href={getFullPath(child.linkValue)}
                  className="block px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  {child.label}
                </Link>
                {hasGrand && (
                  <div className="absolute left-full top-0 ml-1 w-56 rounded-b-2xl shadow-lg border border-border/50 hidden group-hover:block"
                    style={{ backgroundColor: 'var(--navbar-bg, var(--background))', color: 'var(--navbar-text, var(--foreground))' }}>
                    <div className="py-1">
                      {child.children.map((grand: any, gidx: number) => (
                        <Link
                          key={grand.id}
                          href={getFullPath(grand.linkValue)}
                          className="block px-4 py-2 text-sm hover:bg-accent transition-colors"
                          style={{ animation: `fadeInUp 0.15s ease-out ${gidx * 0.03}s both` }}
                        >
                          {grand.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        ref={buttonRef}
        className={cn(
          "inline-flex items-center gap-1 px-3 py-2 rounded-md transition-all duration-200 hover:bg-[var(--navbar-hover-bg)] hover:text-[var(--navbar-hover-text)]",
          isActive && "text-[var(--navbar-active-text)] font-semibold"
        )}
        style={{
          color: isActive ? 'var(--navbar-active-text)' : 'var(--navbar-text, var(--foreground))',
        }}
      >
        {item.label}
        <svg className="w-4 h-4 transition-transform duration-200 group-hover:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M19 9l-7 7-7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && renderSubMenu(item.children)}
    </div>
  );
}

// ==================== 面板菜单（全屏宽，从页头底部展开） ====================
function MegaPanel({ item, pathname, locale, navbarRef }: { item: any; pathname: string; locale: string; navbarRef: React.RefObject<HTMLElement> }) {
  const [open, setOpen] = useState(false);
  const [panelTop, setPanelTop] = useState(0);
  const hoverTimer = useRef<NodeJS.Timeout | null>(null);
  const { onMenuHover, onMenuLeave } = useContext(MenuHoverContext);

  const updatePanelTop = () => {
    if (navbarRef.current) {
      setPanelTop(navbarRef.current.getBoundingClientRect().bottom);
    }
  };

  useEffect(() => {
    if (open) {
      updatePanelTop();
      window.addEventListener('resize', updatePanelTop);
      return () => window.removeEventListener('resize', updatePanelTop);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleScroll = () => setOpen(false);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [open]);

  const handleMouseEnter = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    onMenuHover();
    setOpen(true);
  };
  const handleMouseLeave = () => {
    hoverTimer.current = setTimeout(() => {
      setOpen(false);
      onMenuLeave();
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    };
  }, []);

  const getFullPath = (linkValue: string) => (linkValue.startsWith('/') ? `/${locale}${linkValue}` : linkValue);

  // 根据配置生成面板内容（示例，可替换为动态配置）
  const renderPanelContent = () => {
    // 如果有自定义面板配置，可以在这里读取 headerConfig?.megaMenu
    // 当前返回示例内容
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h3 className="font-semibold mb-3">精选分类</h3>
          <ul className="space-y-2">
            <li><Link href={getFullPath('/collections/new')} className="text-sm hover:text-primary">新品上市</Link></li>
            <li><Link href={getFullPath('/collections/best-sellers')} className="text-sm hover:text-primary">畅销榜</Link></li>
            <li><Link href={getFullPath('/collections/sale')} className="text-sm hover:text-primary">限时特惠</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-3">技术支持</h3>
          <ul className="space-y-2">
            <li><Link href={getFullPath('/docs')} className="text-sm hover:text-primary">文档中心</Link></li>
            <li><Link href={getFullPath('/videos')} className="text-sm hover:text-primary">视频教程</Link></li>
            <li><Link href={getFullPath('/inquiry')} className="text-sm hover:text-primary">询盘支持</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-3">关于我们</h3>
          <ul className="space-y-2">
            <li><Link href={getFullPath('/about')} className="text-sm hover:text-primary">公司简介</Link></li>
            <li><Link href={getFullPath('/contact')} className="text-sm hover:text-primary">联系方式</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-3">特别推荐</h3>
          <div className="bg-muted/20 p-4 rounded-lg">
            <p className="text-sm">限时优惠，全场低至5折</p>
            <Link href={getFullPath('/promo')} className="text-sm text-primary hover:underline mt-2 inline-block">查看详情 →</Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        className="inline-block px-3 py-2 rounded-md transition-all duration-200 hover:bg-[var(--navbar-hover-bg)] hover:text-[var(--navbar-hover-text)]"
        style={{ color: 'var(--navbar-text, var(--foreground))' }}
      >
        {item.label}
      </button>
      {open && (
        <div
          className="fixed left-0 w-full z-50 shadow-xl rounded-b-2xl overflow-hidden"
          style={{
            top: `${panelTop}px`,
            backgroundColor: 'var(--navbar-bg, var(--background))',
            color: 'var(--navbar-text, var(--foreground))',
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {renderPanelContent()}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== 主组件 ====================
export default function LuxuryNavbar({ headerConfig = {}, footerConfig = {}, menuTree, siteSettings }: any) {
  const pathname = usePathname();
  const locale = useLocale();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [announcementHidden, setAnnouncementHidden] = useState(false);
  const [menuHovered, setMenuHovered] = useState(false);
  const [navbarHover, setNavbarHover] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const config = {
    logo: { imageUrl: '', width: 120, position: 'middle-center', mobilePosition: 'center' },
    menu: { menuType: 'dropdown', stickyBehavior: 'always', showSeparator: false },
    utilities: { showLanguageSelector: true, topSpacing: 16, bottomSpacing: 16 },
    announcements: { enabled: false, items: [] },
    search: { enabled: true, placeholder: 'Search...' },
    ...headerConfig,
  };

  const socialLinks = footerConfig?.social?.links || [];

  // 滚动效果：公告栏隐藏、菜单栏背景变化
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setScrolled(scrollTop > 10);
      setAnnouncementHidden(scrollTop > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavMouseEnter = () => {
    if (!scrolled) setNavbarHover(true);
  };
  const handleNavMouseLeave = () => {
    if (!scrolled) setNavbarHover(false);
  };

  const onMenuHover = () => {
    if (!scrolled) setMenuHovered(true);
  };
  const onMenuLeave = () => {
    if (!scrolled) setMenuHovered(false);
  };

  const navbarBackground = (scrolled || navbarHover || menuHovered) ? 'var(--navbar-bg, var(--background))' : 'transparent';

  const navbarStyle = {
    paddingTop: `${config.utilities.topSpacing}px`,
    paddingBottom: `${config.utilities.bottomSpacing}px`,
    backgroundColor: navbarBackground,
    color: 'var(--navbar-text, var(--foreground))',
    transition: 'background-color 0.2s ease',
  };

  // 使用从配置加载的菜单数据
  const menuItems = menuTree && menuTree.length > 0 ? menuTree : [];

  // 判断是否为超级菜单面板：有二级菜单且二级菜单下还有子菜单（三级）
  const isMegaMenu = (item: any) => {
    return item.children && item.children.some((child: any) => child.children && child.children.length > 0);
  };

  return (
    <MenuHoverContext.Provider value={{ onMenuHover, onMenuLeave }}>
      {config.announcements.enabled && (
        <LuxuryAnnouncementBar
          items={config.announcements.items}
          socialLinks={socialLinks}
          hidden={announcementHidden}
        />
      )}

      <nav
        ref={navRef}
        id="main-navbar"
        className={cn(
          "sticky top-0 z-50 transition-all duration-300 ease-in-out",
          scrolled && "shadow-md"
        )}
        style={navbarStyle}
        onMouseEnter={handleNavMouseEnter}
        onMouseLeave={handleNavMouseLeave}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="flex-shrink-0">
            <Logo logoConfig={config.logo} siteName={siteSettings?.siteName || 'My Web'} />
          </div>

          <div className="flex-1 flex justify-center">
            <div className="flex items-center space-x-2">
              {menuItems.map((item: any) => {
                if (isMegaMenu(item)) {
                  return (
                    <MegaPanel
                      key={item.id}
                      item={item}
                      pathname={pathname}
                      locale={locale}
                      navbarRef={navRef}
                    />
                  );
                } else {
                  return (
                    <DropdownMenuItem
                      key={item.id}
                      item={item}
                      pathname={pathname}
                      locale={locale}
                      navbarRef={navRef}
                    />
                  );
                }
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {config.search.enabled && <SearchButton placeholder={config.search.placeholder} />}
          </div>
        </div>
      </nav>

      <LuxuryMenuDrawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </MenuHoverContext.Provider>
  );
}