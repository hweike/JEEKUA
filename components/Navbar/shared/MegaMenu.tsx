'use client';

import Link from 'next/link';
import { useRef, useEffect } from 'react';

interface MenuItem {
  id: string;
  label: string;
  linkType: 'internal' | 'external';
  linkValue: string;
  children?: MenuItem[];
}

interface MegaMenuProps {
  items: MenuItem[];
  pathname: string;
  locale: string;
}

export default function MegaMenu({ items, pathname, locale }: MegaMenuProps) {
  const detailsRefs = useRef<(HTMLDetailsElement | null)[]>([]);

  // 点击外部关闭所有打开的 details
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      detailsRefs.current.forEach((details) => {
        if (details && !details.contains(target) && details.open) {
          details.open = false;
        }
      });
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const getFullPath = (item: MenuItem) => {
    if (item.linkType === 'external') return item.linkValue;
    let path = item.linkValue;
    if (path.startsWith('/')) path = `/${locale}${path}`;
    return path;
  };

  const renderMegaMenuContent = (columns: MenuItem[]) => {
    return (
      <div className="mega-menu__content" style={{ backgroundColor: 'var(--navbar-bg, var(--background))' }}>
        <div className="page-width relative py-6">
          <div className="overflow-x-auto scroll-smooth" style={{ scrollbarWidth: 'thin' }}>
            <ul className="flex flex-nowrap gap-6" style={{ minWidth: 'max-content' }}>
              {columns.map((column, idx) => (
                <li key={idx} className="w-48 flex-shrink-0">
                  <Link
                    href={getFullPath(column)}
                    className="mega-menu__link mega-menu__link--level-2 block font-semibold mb-3 hover:text-[var(--navbar-hover-text,var(--primary))]"
                    style={{ color: 'var(--navbar-text, var(--foreground))' }}
                  >
                    {column.label}
                  </Link>
                  {column.children && column.children.length > 0 && (
                    <ul className="list-unstyled space-y-2">
                      {column.children.map(child => (
                        <li key={child.id}>
                          <Link
                            href={getFullPath(child)}
                            className="mega-menu__link text-sm hover:text-[var(--navbar-hover-text,var(--primary))]"
                            style={{ color: 'var(--navbar-text, var(--foreground))' }}
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ul className="list-menu list-menu--inline flex items-center space-x-6">
      {items.map((item, idx) => {
        const hasChildren = item.children && item.children.length > 0;
        if (hasChildren) {
          return (
            <li key={item.id}>
              <header-menu>
                <details
                  ref={el => { detailsRefs.current[idx] = el; }}
                  className="mega-menu"
                  onToggle={(e) => {
                    if ((e.target as HTMLDetailsElement).open) {
                      detailsRefs.current.forEach((detail, i) => {
                        if (i !== idx && detail) detail.open = false;
                      });
                    }
                  }}
                >
                  <summary
                    className="header__menu-item list-menu__item link focus-inset flex items-center gap-1 cursor-pointer"
                    style={{
                      color: pathname?.startsWith(item.linkValue)
                        ? 'var(--navbar-active-text, var(--navbar-hover-text, var(--primary)))'
                        : 'var(--navbar-text, var(--foreground))',
                    }}
                  >
                    <span>{item.label}</span>
                    <svg className="icon icon-caret w-4 h-4 transition-transform" viewBox="0 0 10 6" fill="currentColor">
                      <path fillRule="evenodd" d="M9.354.646a.5.5 0 0 0-.708 0L5 4.293 1.354.646a.5.5 0 0 0-.708.708l4 4a.5.5 0 0 0 .708 0l4-4a.5.5 0 0 0 0-.708" clipRule="evenodd" />
                    </svg>
                  </summary>
                  {renderMegaMenuContent(item.children!)}
                </details>
              </header-menu>
            </li>
          );
        } else {
          return (
            <li key={item.id}>
              <Link
                href={getFullPath(item)}
                className="header__menu-item list-menu__item link link--text focus-inset"
                style={{
                  color: pathname?.startsWith(item.linkValue)
                    ? 'var(--navbar-active-text, var(--navbar-hover-text, var(--primary)))'
                    : 'var(--navbar-text, var(--foreground))',
                }}
              >
                <span>{item.label}</span>
              </Link>
            </li>
          );
        }
      })}
    </ul>
  );
}