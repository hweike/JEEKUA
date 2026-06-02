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
}

// 单链接（无子菜单） - 添加悬浮文字颜色
function SimpleLink({ item, pathname, locale }: { item: MenuItem; pathname: string; locale: string }) {
  const isActive = (href: string) => {
    if (href === '/') return pathname === `/${locale}` || pathname === `/${locale}/`;
    return pathname?.startsWith(href);
  };
  const getFullPath = () => {
    if (item.linkType === 'external') return item.linkValue;
    let path = item.linkValue;
    if (path.startsWith('/')) path = `/${locale}${path}`;
    return path;
  };
  const active = isActive(item.linkValue);
  const [hover, setHover] = useState(false);
  const color = active
    ? 'var(--navbar-active-text, var(--navbar-hover-text, var(--primary)))'
    : hover
    ? 'var(--navbar-hover-text, var(--primary))'
    : 'var(--navbar-text, var(--foreground))';

  return (
    <Link
      href={getFullPath()}
      className="block transition-colors"
      style={{ fontSize: '16px', fontWeight: 500, color }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {item.label}
    </Link>
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
    ? 'var(--navbar-active-text, var(--navbar-hover-text, var(--primary)))'
    : hover
    ? 'var(--navbar-hover-text, var(--primary))'
    : 'var(--navbar-text, var(--foreground))';

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setAnimated(false);
        setTimeout(() => setIsOpen(false), 200);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 避免超出右边界
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
      setTimeout(() => setIsOpen(false), 200);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={toggle}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="w-full text-left flex items-center justify-between gap-1 transition-colors"
        style={{ fontSize: '16px', fontWeight: 500, color: buttonColor }}
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
          className={`absolute ${dropdownPosition === 'left' ? 'left-0' : 'right-0'} mt-[10px] w-56 rounded-[18px] z-50 transition-all duration-250`}
          style={{
            backgroundColor: 'var(--navbar-bg, var(--background))',
            color: 'var(--navbar-text, var(--foreground))',
            transform: animated ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(-12px)',
            opacity: animated ? 1 : 0,
            transitionProperty: 'transform, opacity',
            transitionTimingFunction: 'cubic-bezier(0.34, 1.2, 0.64, 1)',
            transitionDuration: '250ms',
            boxShadow: '0 -2px 8px -2px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.05)',
            borderTop: '1px solid rgba(255, 255, 255, 0.15)',
          }}
        >
          <div className="py-1">
            {item.children!.map(child => {
              const hasGrandChildren = child.children && child.children.length > 0;
              if (hasGrandChildren) {
                return <DropdownSubMenuItem key={child.id} item={child} pathname={pathname} locale={locale} closeParent={toggle} />;
              }
              return <DropdownLink key={child.id} item={child} pathname={pathname} locale={locale} closeParent={toggle} />;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// 三级菜单项（内部折叠，点击整个区域展开/折叠，带动画，直角背景）
function DropdownSubMenuItem({ item, pathname, locale, closeParent }: { item: MenuItem; pathname: string; locale: string; closeParent: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [subAnimated, setSubAnimated] = useState(false);
  const [hover, setHover] = useState(false);
  const getFullPath = () => {
    if (item.linkType === 'external') return item.linkValue;
    let path = item.linkValue;
    if (path.startsWith('/')) path = `/${locale}${path}`;
    return path;
  };
  const linkColor = hover ? 'var(--navbar-hover-text, var(--primary))' : 'var(--navbar-text, var(--foreground))';

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
        className="flex justify-between items-center px-4 py-2 cursor-pointer"
        style={{ fontSize: '16px', color: 'var(--navbar-text, var(--foreground))' }}
      >
        <Link
          href={getFullPath()}
          className="flex-1 transition-colors"
          style={{ color: linkColor }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onClick={(e) => e.stopPropagation()}
        >
          {item.label}
        </Link>
        <svg
          className={`w-3 h-3 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {isOpen && (
        <div
          className="pl-4 mt-1 space-y-1 p-2 transition-all duration-150"
          style={{
            backgroundColor: 'var(--navbar-hover-bg, var(--accent))',
            transform: subAnimated ? 'translateY(0)' : 'translateY(-8px)',
            opacity: subAnimated ? 1 : 0,
            transitionProperty: 'transform, opacity',
            transitionTimingFunction: 'ease-out',
            transitionDuration: '150ms',
          }}
        >
          {item.children!.map(grandChild => (
            <DropdownLink key={grandChild.id} item={grandChild} pathname={pathname} locale={locale} closeParent={closeParent} />
          ))}
        </div>
      )}
    </div>
  );
}

// 普通下拉链接（无子菜单，无悬浮效果）
function DropdownLink({ item, pathname, locale, closeParent }: { item: MenuItem; pathname: string; locale: string; closeParent: () => void }) {
  const isActive = (href: string) => {
    if (href === '/') return pathname === `/${locale}` || pathname === `/${locale}/`;
    return pathname?.startsWith(href);
  };
  const getFullPath = () => {
    if (item.linkType === 'external') return item.linkValue;
    let path = item.linkValue;
    if (path.startsWith('/')) path = `/${locale}${path}`;
    return path;
  };
  const active = isActive(item.linkValue);
  const [hover, setHover] = useState(false);
  const color = active
    ? 'var(--navbar-active-text, var(--navbar-hover-text, var(--primary)))'
    : hover
    ? 'var(--navbar-hover-text, var(--primary))'
    : 'var(--navbar-text, var(--foreground))';

  return (
    <Link
      href={getFullPath()}
      className="block px-4 py-2 transition-colors"
      style={{ fontSize: '16px', color }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={closeParent}
    >
      {item.label}
    </Link>
  );
}

// 主组件
export default function DropdownMenu({ items, pathname, locale }: DropdownMenuProps) {
  return (
    <div className="flex items-center space-x-6">
      {items.map(item => {
        const hasChildren = item.children && item.children.length > 0;
        if (hasChildren) {
          return <DropdownMenuItem key={item.id} item={item} pathname={pathname} locale={locale} />;
        }
        return <SimpleLink key={item.id} item={item} pathname={pathname} locale={locale} />;
      })}
    </div>
  );
}