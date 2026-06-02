'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useState, useRef, useEffect } from 'react';


interface MenuItem {
  id: string;
  label: string;
  linkType: 'internal' | 'external';
  linkValue: string;
  children?: MenuItem[];
}

interface FooterHorizontalMenuProps {
  items: MenuItem[];
}

export default function FooterHorizontalMenu({ items }: FooterHorizontalMenuProps) {
  const locale = useLocale();

  const getFullPath = (item: MenuItem) => {
    if (item.linkType === 'external') return item.linkValue;
    let path = item.linkValue;
    if (path.startsWith('/')) path = `/${locale}${path}`;
    return path;
  };

  // 渲染一级菜单项（带下拉）
  const renderMenuItem = (item: MenuItem) => {
    const hasChildren = item.children && item.children.length > 0;
    if (hasChildren) {
      return <DropdownMenuItem key={item.id} item={item} />;
    }
    return (
      <Link
        key={item.id}
        href={getFullPath(item)}
        className="text-footer-link hover:text-footer-link-hover transition-colors"
        style={{ fontSize: '16px' }}
      >
        {item.label}
      </Link>
    );
  };

  // 带下拉的菜单项（悬浮触发，带延迟）
  function DropdownMenuItem({ item }: { item: MenuItem }) {
    const [open, setOpen] = useState(false);
    const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = () => {
      if (hoverTimer) clearTimeout(hoverTimer);
      setOpen(true);
    };
    const handleMouseLeave = () => {
      const timer = setTimeout(() => setOpen(false), 150);
      setHoverTimer(timer);
    };

    useEffect(() => {
      return () => {
        if (hoverTimer) clearTimeout(hoverTimer);
      };
    }, [hoverTimer]);

    return (
      <div
        ref={containerRef}
        className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          className="flex items-center gap-1 text-footer-link hover:text-footer-link-hover transition-colors"
          style={{ fontSize: '18px' }}
        >
          {item.label}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {open && (
          <div
            className="absolute left-0 mt-2 w-56 rounded-md shadow-lg z-50"
            style={{
              backgroundColor: 'var(--footer-bg, var(--background))',
              border: '1px solid var(--border)',
            }}
          >
            <div className="py-1">
              {item.children!.map(child => (
                <FooterSubMenuItem key={child.id} item={child} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 二级/三级菜单项（递归支持三级）
  function FooterSubMenuItem({ item }: { item: MenuItem }) {
    const [open, setOpen] = useState(false);
    const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null);
    const hasChildren = item.children && item.children.length > 0;

    const handleMouseEnter = () => {
      if (hoverTimer) clearTimeout(hoverTimer);
      if (hasChildren) setOpen(true);
    };
    const handleMouseLeave = () => {
      const timer = setTimeout(() => setOpen(false), 150);
      setHoverTimer(timer);
    };

    useEffect(() => {
      return () => {
        if (hoverTimer) clearTimeout(hoverTimer);
      };
    }, [hoverTimer]);

    const linkContent = (
      <Link
        href={getFullPath(item)}
        className="block px-4 py-2 text-footer-link hover:text-footer-link-hover transition-colors"
        style={{ fontSize: '16px' }}
      >
        {item.label}
      </Link>
    );

    if (!hasChildren) {
      return <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>{linkContent}</div>;
    }

    return (
      <div
        className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex justify-between items-center px-4 py-2 cursor-pointer">
          <Link
            href={getFullPath(item)}
            className="flex-1 text-footer-link hover:text-footer-link-hover transition-colors"
            style={{ fontSize: '16px' }}
          >
            {item.label}
          </Link>
          <svg className="w-3 h-3 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
        {open && (
          <div
            className="absolute left-full top-0 ml-1 w-56 rounded-md shadow-lg z-50"
            style={{
              backgroundColor: 'var(--footer-bg, var(--background))',
              border: '1px solid var(--border)',
            }}
          >
            <div className="py-1">
              {item.children!.map(child => (
                <FooterSubMenuItem key={child.id} item={child} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
      {items.map(renderMenuItem)}
    </div>
  );
}