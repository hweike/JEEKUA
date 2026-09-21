'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useState, useEffect, useRef } from 'react';
import DropdownMenu from './DropdownMenu';
import MegaMenu from './MegaMenu';

interface MenuItem {
  id: string;
  label: string;
  linkType: 'internal' | 'external';
  linkValue: string;
  children?: MenuItem[];
  order?: number;
  picture?: string;
  description?: string;
  megaMenuImageMode?: boolean;
}

interface MenuItemsProps {
  items: MenuItem[];
  pathname: string;
  mobile?: boolean;
  onClickItem?: () => void;
  menuType?: 'dropdown' | 'mega';
  wrap?: boolean;
}

interface HistoryItem {
  items: MenuItem[];
  parentLabel: string;
}

const COLOR_TRANSITION = `color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;
const BG_COLOR_TRANSITION = `background-color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;

export default function MenuItems({
  items,
  pathname,
  mobile = false,
  onClickItem,
  menuType = 'dropdown',
  wrap = false,
}: MenuItemsProps) {
  const locale = useLocale();

  // ---------- 桌面端逻辑 ----------
  if (!mobile) {
    if (!items || items.length === 0) return null;

    if (menuType === 'mega') {
      return <MegaMenu items={items} pathname={pathname} locale={locale} />;
    }

    return <DropdownMenu items={items} pathname={pathname} locale={locale} wrap={wrap} />;
  }

  // ---------- 移动端分层导航 ----------
  const [currentLevelItems, setCurrentLevelItems] = useState<MenuItem[]>(items);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const prevItemsRef = useRef<string>('');

  useEffect(() => {
    const itemsStr = JSON.stringify(items);
    if (itemsStr !== prevItemsRef.current) {
      prevItemsRef.current = itemsStr;
      setCurrentLevelItems(items);
      setHistory([]);
    }
  }, [items]);

  const navigateToChildren = (item: MenuItem) => {
    if (item.children && item.children.length > 0) {
      setHistory(prev => [...prev, { items: currentLevelItems, parentLabel: item.label }]);
      setCurrentLevelItems(item.children!);
    }
  };

  const goBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory(prev => prev.slice(0, -1));
      setCurrentLevelItems(prev.items);
    }
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === `/${locale}` || pathname === `/${locale}/`;
    return pathname?.startsWith(href);
  };

  const getFullPath = (item: MenuItem) => {
    if (item.linkType === 'external') return item.linkValue;
    let path = item.linkValue;
    if (path.startsWith('/')) path = `/${locale}${path}`;
    return path;
  };

  // 渲染当前层级
  const renderLevel = () => {
    const isRoot = history.length === 0;
    const dividerColor = 'var(--navbar-divider-color, rgba(255,255,255,0.1))';

    const itemBaseStyle: React.CSSProperties = {
      paddingLeft: 'var(--spacing-4, 1rem)',
      paddingRight: 'var(--spacing-4, 1rem)',
      paddingTop: 'var(--spacing-3, 0.75rem)',
      paddingBottom: 'var(--spacing-3, 0.75rem)',
      fontSize: 'var(--font-size-base, 1rem)',
      borderBottom: `1px solid ${dividerColor}`,
      transition: `${COLOR_TRANSITION}, ${BG_COLOR_TRANSITION}`,
      width: '100%',
      textAlign: 'left' as const,
    };

    return (
      <div className="flex flex-col">
        {/* 返回按钮 */}
        {!isRoot && (
          <button
            onClick={goBack}
            className="flex items-center hover:bg-[var(--navbar-hover-bg,var(--accent,#f1f5f9))]"
            style={{
              ...itemBaseStyle,
              color: 'var(--navbar-text, var(--foreground, #0f172a))',
              fontWeight: 'var(--font-weight-medium, 500)',
              fontSize: 'var(--font-size-sm, 0.875rem)',
              gap: 'var(--spacing-2, 0.5rem)',
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {history[history.length - 1].parentLabel}
          </button>
        )}

        {currentLevelItems.map(item => {
          const hasChildren = item.children && item.children.length > 0;
          const active = isActive(item.linkValue);

          if (hasChildren) {
            return (
              <button
                key={item.id}
                onClick={() => navigateToChildren(item)}
                className="flex items-center justify-between hover:bg-[var(--navbar-hover-bg,var(--accent,#f1f5f9))]"
                style={{
                  ...itemBaseStyle,
                  color: 'var(--navbar-text, var(--foreground, #0f172a))',
                }}
              >
                <span>{item.label}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            );
          }

          // 🔥 外部链接：使用 <a> 标签，新窗口打开
          if (item.linkType === 'external') {
            return (
              <a
                key={item.id}
                href={item.linkValue}
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:bg-[var(--navbar-hover-bg,var(--accent,#f1f5f9))]"
                style={{
                  ...itemBaseStyle,
                  color: 'var(--navbar-text, var(--foreground, #0f172a))',
                }}
                onClick={onClickItem}
              >
                {item.label}
              </a>
            );
          }

          // 内部链接：使用 <Link>
          return (
            <Link
              key={item.id}
              href={getFullPath(item)}
              className="block hover:bg-[var(--navbar-hover-bg,var(--accent,#f1f5f9))]"
              style={{
                ...itemBaseStyle,
                color: active
                  ? 'var(--navbar-active-text, var(--navbar-hover-text, var(--primary, #1e293b)))'
                  : 'var(--navbar-text, var(--foreground, #0f172a))',
              }}
              onClick={onClickItem}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    );
  };

  if (!items || items.length === 0) {
    return (
      <div
        className="text-center"
        style={{
          padding: 'var(--spacing-4, 1rem)',
          color: 'var(--muted-foreground, #64748b)',
        }}
      >
        暂无菜单
      </div>
    );
  }

  return renderLevel();
}