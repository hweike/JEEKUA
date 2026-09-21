'use client';

import React from 'react';
import Link from 'next/link';
import { useRef, useEffect, useState } from 'react';

interface MenuItem {
  id: string;
  label: string;
  linkType: 'internal' | 'external';
  linkValue: string;
  picture?: string;
  description?: string;
  children?: MenuItem[];
  megaMenuImageMode?: boolean;
}

interface MegaMenuProps {
  items: MenuItem[];
  pathname: string;
  locale: string;
}

const COLOR_TRANSITION = `color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;

// ============================================================
// 🔥 公共组件：根据 linkType 渲染 <a> 或 <Link>，支持 onClick
// ============================================================
function MenuLink({
  item,
  locale,
  className,
  style,
  children,
  onClick,
}: {
  item: MenuItem;
  locale: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  onClick?: () => void;
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
      >
        {children || item.label}
      </a>
    );
  }

  return (
    <Link href={getFullPath()} className={className} style={style} onClick={onClick}>
      {children || item.label}
    </Link>
  );
}

export default function MegaMenu({ items, pathname, locale }: MegaMenuProps) {
  const detailsRefs = useRef<(HTMLDetailsElement | null)[]>([]);
  const [carouselOffsets, setCarouselOffsets] = useState<Record<string, number>>({});

  // ✅ 新增：路径变化时关闭所有 details
  useEffect(() => {
    detailsRefs.current.forEach((details) => {
      if (details) details.open = false;
    });
  }, [pathname]);

  // ✅ 新增：关闭所有菜单的函数
  const closeAllMenus = () => {
    detailsRefs.current.forEach((details) => {
      if (details) details.open = false;
    });
  };

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

  const renderImage = (src?: string, alt = '', className = '') => {
    if (!src) return null;
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        onError={(e) => (e.currentTarget.style.display = 'none')}
      />
    );
  };

  // ---------- 大图模式 ----------
  const renderImageMode = (columns: MenuItem[], menuId: string, onClose: () => void) => {
    const total = columns.length;
    const offset = carouselOffsets[menuId] || 0;
    const visibleColumns = total > 3 ? columns.slice(offset, offset + 3) : columns;
    const showArrows = total > 3;
    const maxOffset = total - 3;

    const goPrev = () => {
      setCarouselOffsets((prev) => ({
        ...prev,
        [menuId]: Math.max(0, (prev[menuId] || 0) - 1),
      }));
    };

    const goNext = () => {
      setCarouselOffsets((prev) => ({
        ...prev,
        [menuId]: Math.min(maxOffset, (prev[menuId] || 0) + 1),
      }));
    };

    return (
      <div
        className="mega-menu__content"
        style={{
          backgroundColor: 'var(--navbar-bg, var(--background, #ffffff))',
          borderTop: '1px solid var(--navbar-divider-color, rgba(255,255,255,0.15))',
        }}
      >
        <div
          className="page-width relative"
          style={{
            paddingTop: 'var(--spacing-6, 1.5rem)',
            paddingBottom: 'var(--spacing-6, 1.5rem)',
          }}
        >
          <div className="relative">
            <div
              className={`flex overflow-hidden ${total <= 3 ? 'justify-center' : ''}`}
              style={{ gap: 'var(--spacing-6, 1.5rem)' }}
            >
              {visibleColumns.map((column) => (
                <div key={column.id} className="flex-1 min-w-0 max-w-[350px]">
                  {/* ✅ 使用 MenuLink，并传入 onClick 关闭菜单 */}
                  <MenuLink
                    item={column}
                    locale={locale}
                    className="block group"
                    onClick={onClose}
                  >
                    <div
                      className="overflow-hidden"
                      style={{ borderRadius: 'var(--radius-lg, 0.75rem)' }}
                    >
                      {renderImage(column.picture, column.label, 'w-full h-auto object-cover')}
                    </div>
                    <div style={{ marginTop: 'var(--spacing-3, 0.75rem)' }}>
                      <div
                        className="truncate group-hover:text-[var(--navbar-hover-text,var(--primary,#1e293b))]"
                        style={{
                          color: 'var(--navbar-text, var(--foreground, #0f172a))',
                          fontWeight: 'var(--font-weight-semibold, 600)',
                          transition: COLOR_TRANSITION,
                        }}
                      >
                        {column.label}
                      </div>
                      {column.description && (
                        <div
                          className="truncate"
                          style={{
                            fontSize: 'var(--font-size-sm, 0.875rem)',
                            color: 'var(--muted-foreground, #64748b)',
                          }}
                        >
                          {column.description}
                        </div>
                      )}
                    </div>
                  </MenuLink>
                </div>
              ))}
            </div>
            {showArrows && (
              <>
                <button
                  onClick={goPrev}
                  disabled={offset === 0}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -ml-4 w-8 h-8 rounded-full shadow-md flex items-center justify-center text-gray-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition z-10"
                  style={{
                    backgroundColor: 'var(--card, #ffffff)',
                    boxShadow: 'var(--shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1))',
                  }}
                  aria-label="Previous"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={goNext}
                  disabled={offset >= maxOffset}
                  className="absolute right-0 top-1/2 -translate-y-1/2 -mr-4 w-8 h-8 rounded-full shadow-md flex items-center justify-center text-gray-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition z-10"
                  style={{
                    backgroundColor: 'var(--card, #ffffff)',
                    boxShadow: 'var(--shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1))',
                  }}
                  aria-label="Next"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ---------- 普通模式 ----------
  const renderDefaultMode = (columns: MenuItem[], menuId: string, onClose: () => void) => {
    const rawRows: Array<{
      type: 'level2' | 'level3';
      item: MenuItem;
    }> = [];
    columns.forEach((col) => {
      rawRows.push({ type: 'level2', item: col });
      if (col.children) {
        col.children.forEach((child) => {
          rawRows.push({ type: 'level3', item: child });
        });
      }
    });

    let level2Count = 0;
    const rows = rawRows.map((row) => {
      if (row.type === 'level2') {
        level2Count++;
        return {
          ...row,
          shouldHaveGap: level2Count > 1,
        };
      } else {
        return { ...row, shouldHaveGap: false };
      }
    });

    const totalRows = rows.length;
    const ROWS_PER_COL = 12;
    const totalCols = Math.ceil(totalRows / ROWS_PER_COL);
    const offset = carouselOffsets[`${menuId}-default`] || 0;
    const showArrows = totalCols > 5;
    const maxOffset = totalCols - 5;

    const columnGroups: typeof rows[] = [];
    for (let i = 0; i < totalCols; i++) {
      const start = i * ROWS_PER_COL;
      const end = Math.min(start + ROWS_PER_COL, totalRows);
      columnGroups.push(rows.slice(start, end));
    }

    const visibleGroups = totalCols > 5
      ? columnGroups.slice(offset, offset + 5)
      : columnGroups;

    const goPrev = () => {
      setCarouselOffsets((prev) => ({
        ...prev,
        [`${menuId}-default`]: Math.max(0, (prev[`${menuId}-default`] || 0) - 1),
      }));
    };

    const goNext = () => {
      setCarouselOffsets((prev) => ({
        ...prev,
        [`${menuId}-default`]: Math.min(maxOffset, (prev[`${menuId}-default`] || 0) + 1),
      }));
    };

    return (
      <div
        className="mega-menu__content"
        style={{
          backgroundColor: 'var(--navbar-bg, var(--background, #ffffff))',
          borderTop: '1px solid var(--navbar-divider-color, rgba(255,255,255,0.15))',
        }}
      >
        <div
          className="page-width relative"
          style={{
            paddingTop: 'var(--spacing-6, 1.5rem)',
            paddingBottom: 'var(--spacing-6, 1.5rem)',
          }}
        >
          <div className="relative">
            <div
              className="flex overflow-visible"
              style={{ gap: 'var(--spacing-6, 1.5rem)' }}
            >
              {visibleGroups.map((colRows, colIndex) => (
                <div key={colIndex} className="flex-1 min-w-0">
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2, 0.5rem)' }}>
                    {colRows.map((row, rowIndex) => {
                      const isLevel2 = row.type === 'level2';
                      const item = row.item;
                      const imgSize = isLevel2 ? 'w-12 h-12' : 'w-10 h-10';
                      const fontWeight = isLevel2
                        ? 'var(--font-weight-semibold, 600)'
                        : 'var(--font-weight-normal, 400)';

                      const placeholder = row.shouldHaveGap ? (
                        <li
                          key={`placeholder-${colIndex}-${rowIndex}`}
                          style={{ height: 'var(--spacing-4, 1rem)' }}
                        />
                      ) : null;

                      return (
                        <React.Fragment key={`${colIndex}-${rowIndex}`}>
                          {placeholder}
                          <li>
                            {/* ✅ 使用 MenuLink，并传入 onClick 关闭菜单 */}
                            <MenuLink
                              item={item}
                              locale={locale}
                              className="flex items-center truncate hover:text-[var(--navbar-hover-text,var(--primary,#1e293b))]"
                              style={{
                                color: 'var(--navbar-text, var(--foreground, #0f172a))',
                                fontSize: 'var(--font-size-sm, 0.875rem)',
                                fontWeight,
                                gap: 'var(--spacing-2, 0.5rem)',
                                transition: COLOR_TRANSITION,
                              }}
                              onClick={onClose}
                            >
                              {renderImage(item.picture, item.label, `${imgSize} object-cover rounded flex-shrink-0`)}
                              <span className="truncate">{item.label}</span>
                            </MenuLink>
                          </li>
                        </React.Fragment>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
            {showArrows && (
              <>
                <button
                  onClick={goPrev}
                  disabled={offset === 0}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -ml-4 w-8 h-8 rounded-full shadow-md flex items-center justify-center text-gray-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition z-10"
                  style={{
                    backgroundColor: 'var(--card, #ffffff)',
                    boxShadow: 'var(--shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1))',
                  }}
                  aria-label="Previous"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={goNext}
                  disabled={offset >= maxOffset}
                  className="absolute right-0 top-1/2 -translate-y-1/2 -mr-4 w-8 h-8 rounded-full shadow-md flex items-center justify-center text-gray-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition z-10"
                  style={{
                    backgroundColor: 'var(--card, #ffffff)',
                    boxShadow: 'var(--shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1))',
                  }}
                  aria-label="Next"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMegaMenuContent = (columns: MenuItem[], imageMode: boolean, menuId: string, onClose: () => void) => {
    return imageMode
      ? renderImageMode(columns, menuId, onClose)
      : renderDefaultMode(columns, menuId, onClose);
  };

  return (
    <ul
      className="list-menu list-menu--inline flex items-center"
      style={{ gap: 'var(--spacing-6, 1.5rem)' }}
    >
      {items.map((item, idx) => {
        const hasChildren = item.children && item.children.length > 0;
        const imageMode = item.megaMenuImageMode || false;

        if (hasChildren) {
          return (
            <li key={item.id}>
              <div>
                <details
                  ref={(el) => { detailsRefs.current[idx] = el; }}
                  className="mega-menu"
                  onToggle={(e) => {
                    if ((e.target as HTMLDetailsElement).open) {
                      setCarouselOffsets((prev) => ({ ...prev, [item.id]: 0, [`${item.id}-default`]: 0 }));
                      detailsRefs.current.forEach((detail, i) => {
                        if (i !== idx && detail) detail.open = false;
                      });
                    }
                  }}
                >
                  <summary
                    className="header__menu-item list-menu__item link focus-inset flex items-center cursor-pointer"
                    style={{
                      color: pathname?.startsWith(item.linkValue)
                        ? 'var(--navbar-active-text, var(--navbar-hover-text, var(--primary, #1e293b)))'
                        : 'var(--navbar-text, var(--foreground, #0f172a))',
                      gap: 'var(--spacing-1, 0.25rem)',
                      transition: COLOR_TRANSITION,
                    }}
                  >
                    <span>{item.label}</span>
                    <svg className="icon icon-caret w-4 h-4 transition-transform" viewBox="0 0 10 6" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M9.354.646a.5.5 0 0 0-.708 0L5 4.293 1.354.646a.5.5 0 0 0-.708.708l4 4a.5.5 0 0 0 .708 0l4-4a.5.5 0 0 0 0-.708"
                        clipRule="evenodd"
                      />
                    </svg>
                  </summary>
                  {/* ✅ 传入 closeAllMenus */}
                  {renderMegaMenuContent(item.children!, imageMode, item.id, closeAllMenus)}
                </details>
              </div>
            </li>
          );
        } else {
          // ✅ 顶层无子菜单项：使用 MenuLink，并传入 closeAllMenus
          return (
            <li key={item.id}>
              <MenuLink
                item={item}
                locale={locale}
                className="header__menu-item list-menu__item link link--text focus-inset"
                style={{
                  color: pathname?.startsWith(item.linkValue)
                    ? 'var(--navbar-active-text, var(--navbar-hover-text, var(--primary, #1e293b)))'
                    : 'var(--navbar-text, var(--foreground, #0f172a))',
                  transition: COLOR_TRANSITION,
                }}
                onClick={closeAllMenus}
              >
                <span>{item.label}</span>
              </MenuLink>
            </li>
          );
        }
      })}
    </ul>
  );
}