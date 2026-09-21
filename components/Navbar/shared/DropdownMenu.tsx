'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

interface MenuItem {
  id: string;
  label: string;
  linkType: 'internal' | 'external';
  linkValue: string;
  children?: MenuItem[];
}

interface DropdownMenuProps {
  items: MenuItem[];
  pathname: string;
  locale: string;
  wrap?: boolean;
}

const FONT_SIZE = 'var(--font-size-base, 1rem)';
const FONT_WEIGHT = 'var(--font-weight-medium, 500)';
const COLOR_TRANSITION = `color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;

// ============================================================
// 🔥 公共组件：根据 linkType 渲染 <a> 或 <Link>
// ============================================================
function MenuLink({
  item,
  locale,
  className,
  style,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  item: MenuItem;
  locale: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const getFullPath = () => {
    if (item.linkType === 'external') return item.linkValue;
    let path = item.linkValue;
    if (path.startsWith('/')) path = `/${locale}${path}`;
    return path;
  };

  if (item.linkType === 'external') {
    return (
      <a
        href={item.linkValue}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        style={style}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {item.label}
      </a>
    );
  }

  return (
    <Link
      href={getFullPath()}
      className={className}
      style={style}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {item.label}
    </Link>
  );
}

// 单链接（无子菜单）
function SimpleLink({ item, pathname, locale }: { item: MenuItem; pathname: string; locale: string }) {
  const isActive = (href: string) => {
    if (href === '/') return pathname === `/${locale}` || pathname === `/${locale}/`;
    return pathname?.startsWith(href);
  };
  const active = isActive(item.linkValue);
  const [hover, setHover] = useState(false);
  const color = active
    ? 'var(--navbar-active-text, var(--navbar-hover-text, var(--primary, #1e293b)))'
    : hover
    ? 'var(--navbar-hover-text, var(--primary, #1e293b))'
    : 'var(--navbar-text, var(--foreground, #0f172a))';

  return (
    <MenuLink
      item={item}
      locale={locale}
      className="block transition-colors"
      style={{
        fontSize: FONT_SIZE,
        fontWeight: FONT_WEIGHT,
        color,
        transition: COLOR_TRANSITION,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    />
  );
}

// 带下拉菜单的项（点击整个区域展开/折叠，带动画）
function DropdownMenuItem({ item, pathname, locale }: { item: MenuItem; pathname: string; locale: string }) {
  const [open, setIsOpen] = useState(false);
  const [animated, setAnimated] = useState(false);
  const [hover, setHover] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<'left' | 'right'>('left');

  const isActive = (href: string) => {
    if (href === '/') return pathname === `/${locale}` || pathname === `/${locale}/`;
    return pathname?.startsWith(href);
  };
  const active = isActive(item.linkValue);
  const buttonColor = active
    ? 'var(--navbar-active-text, var(--navbar-hover-text, var(--primary, #1e293b)))'
    : hover
    ? 'var(--navbar-hover-text, var(--primary, #1e293b))'
    : 'var(--navbar-text, var(--foreground, #0f172a))';

  // ✅ 新增：关闭菜单的专用函数（替代 toggle）
  const closeMenu = () => {
    setAnimated(false);
    setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  // ✅ 新增：路径变化时自动关闭（处理客户端路由导航）
  useEffect(() => {
    if (open) {
      setAnimated(false);
      setTimeout(() => {
        setIsOpen(false);
      }, 200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    requestAnimationFrame(() => {
      const event = new CustomEvent('dropdown-toggle', {
        detail: { open },
        bubbles: true,
      });
      document.dispatchEvent(event);
    });
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setAnimated(false);
        setTimeout(() => {
          setIsOpen(false);
        }, 200);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && containerRef.current && dropdownRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownRect = dropdownRef.current.getBoundingClientRect();
      const rightEdge = rect.right + dropdownRect.width;
      if (rightEdge > window.innerWidth) {
        setDropdownPosition('right');
      } else {
        setDropdownPosition('left');
      }
    }
  }, [open]);

  const toggle = () => {
    if (!open) {
      setIsOpen(true);
      setTimeout(() => setAnimated(true), 10);
    } else {
      setAnimated(false);
      setTimeout(() => {
        setIsOpen(false);
      }, 200);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={toggle}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="w-full text-left flex items-center justify-between transition-colors"
        style={{
          fontSize: FONT_SIZE,
          fontWeight: FONT_WEIGHT,
          color: buttonColor,
          gap: 'var(--spacing-1, 0.25rem)',
          transition: COLOR_TRANSITION,
        }}
      >
        <span>{item.label}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div
          ref={dropdownRef}
          className={`absolute ${dropdownPosition === 'left' ? 'left-0' : 'right-0'} w-56 z-50`}
          style={{
            marginTop: 'var(--spacing-2, 0.5rem)',
            borderRadius: 'var(--radius-lg, 0.75rem)',
            backgroundColor: 'var(--navbar-bg, var(--background, #ffffff))',
            color: 'var(--navbar-text, var(--foreground, #0f172a))',
            transform: animated ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(-12px)',
            opacity: animated ? 1 : 0,
            transitionProperty: 'transform, opacity',
            transitionTimingFunction: 'cubic-bezier(0.34, 1.2, 0.64, 1)',
            transitionDuration: 'var(--transition-duration-200, 200ms)',
            boxShadow: 'var(--dropdown-shadow, 0 4px 12px rgba(0, 0, 0, 0.08))',
            borderTop: '1px solid var(--navbar-divider-color, rgba(255,255,255,0.15))',
          }}
          data-dropdown-open="true"
        >
          <div style={{ paddingTop: 'var(--spacing-1, 0.25rem)', paddingBottom: 'var(--spacing-1, 0.25rem)' }}>
            {item.children!.map(child => {
              const hasGrandChildren = child.children && child.children.length > 0;
              if (hasGrandChildren) {
                return (
                  <DropdownSubMenuItem
                    key={child.id}
                    item={child}
                    pathname={pathname}
                    locale={locale}
                    closeParent={closeMenu}   // ✅ 用 closeMenu 而非 toggle
                  />
                );
              }
              return (
                <DropdownLink
                  key={child.id}
                  item={child}
                  pathname={pathname}
                  locale={locale}
                  closeParent={closeMenu}   // ✅ 用 closeMenu 而非 toggle
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// 三级菜单项（内部折叠，带动画）
function DropdownSubMenuItem({
  item,
  pathname,
  locale,
  closeParent,
}: {
  item: MenuItem;
  pathname: string;
  locale: string;
  closeParent: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [subAnimated, setSubAnimated] = useState(false);
  const [hover, setHover] = useState(false);

  const linkColor = hover
    ? 'var(--navbar-hover-text, var(--primary, #1e293b))'
    : 'var(--navbar-text, var(--foreground, #0f172a))';

  const toggle = () => {
    if (!isOpen) {
      setIsOpen(true);
      setTimeout(() => setSubAnimated(true), 10);
    } else {
      setSubAnimated(false);
      setTimeout(() => setIsOpen(false), 150);
    }
  };

  return (
    <div>
      <div
        onClick={toggle}
        className="flex justify-between items-center cursor-pointer"
        style={{
          fontSize: FONT_SIZE,
          color: 'var(--navbar-text, var(--foreground, #0f172a))',
          paddingLeft: 'var(--spacing-4, 1rem)',
          paddingRight: 'var(--spacing-4, 1rem)',
          paddingTop: 'var(--spacing-2, 0.5rem)',
          paddingBottom: 'var(--spacing-2, 0.5rem)',
        }}
      >
        {/* 🔥 使用 MenuLink，外部链接新窗口打开 */}
        <MenuLink
          item={item}
          locale={locale}
          className="flex-1 transition-colors"
          style={{ color: linkColor, transition: COLOR_TRANSITION }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onClick={(e) => {
            e.stopPropagation();
            closeParent();   // ✅ 点击三级菜单父项，关闭整个下拉
          }}
        />
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ marginLeft: 'var(--spacing-2, 0.5rem)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {isOpen && (
        <div
          className="transition-all"
          style={{
            backgroundColor: 'var(--navbar-hover-bg, var(--accent, #f1f5f9))',
            transform: subAnimated ? 'translateY(0)' : 'translateY(-8px)',
            opacity: subAnimated ? 1 : 0,
            transitionProperty: 'transform, opacity',
            transitionTimingFunction: 'ease-out',
            transitionDuration: 'var(--transition-duration-150, 150ms)',
            marginTop: 'var(--spacing-1, 0.25rem)',
            padding: 'var(--spacing-2, 0.5rem)',
            paddingLeft: 'var(--spacing-4, 1rem)',
          }}
        >
          {item.children!.map(grandChild => (
            <DropdownLink
              key={grandChild.id}
              item={grandChild}
              pathname={pathname}
              locale={locale}
              closeParent={closeParent}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// 普通下拉链接（无子菜单）
function DropdownLink({
  item,
  pathname,
  locale,
  closeParent,
}: {
  item: MenuItem;
  pathname: string;
  locale: string;
  closeParent: () => void;
}) {
  const isActive = (href: string) => {
    if (href === '/') return pathname === `/${locale}` || pathname === `/${locale}/`;
    return pathname?.startsWith(href);
  };
  const active = isActive(item.linkValue);
  const [hover, setHover] = useState(false);
  const color = active
    ? 'var(--navbar-active-text, var(--navbar-hover-text, var(--primary, #1e293b)))'
    : hover
    ? 'var(--navbar-hover-text, var(--primary, #1e293b))'
    : 'var(--navbar-text, var(--foreground, #0f172a))';

  return (
    <MenuLink
      item={item}
      locale={locale}
      className="block transition-colors"
      style={{
        fontSize: FONT_SIZE,
        color,
        paddingLeft: 'var(--spacing-4, 1rem)',
        paddingRight: 'var(--spacing-4, 1rem)',
        paddingTop: 'var(--spacing-2, 0.5rem)',
        paddingBottom: 'var(--spacing-2, 0.5rem)',
        transition: COLOR_TRANSITION,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => closeParent()}   // ✅ 点击关闭整个下拉
    />
  );
}

// 主组件
export default function DropdownMenu({ items, pathname, locale, wrap = false }: DropdownMenuProps) {
  const safeItems = items || [];
  const containerStyle: React.CSSProperties = wrap
    ? {
        display: 'flex',
        flexWrap: 'wrap',
        columnGap: 'var(--spacing-4, 1rem)',
        rowGap: 'var(--spacing-2, 0.5rem)',
        justifyContent: 'flex-start',
      }
    : {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-6, 1.5rem)',
      };

  return (
    <div style={containerStyle}>
      {safeItems.map(item => {
        const hasChildren = item.children && item.children.length > 0;
        if (hasChildren) {
          return <DropdownMenuItem key={item.id} item={item} pathname={pathname} locale={locale} />;
        }
        return <SimpleLink key={item.id} item={item} pathname={pathname} locale={locale} />;
      })}
    </div>
  );
}