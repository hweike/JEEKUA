'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Menu } from '@/lib/config-loader';

interface MenuColumnProps {
  title?: string;
  menu: Menu | null;
  menuId: string;
  /** 横向展开模式：标题与菜单项同排，菜单项横向排列，超宽自动换行 */
  horizontal?: boolean;
}

// ============================================================
// 公共样式常量
// ============================================================
const COLOR_TRANSITION = `color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;

export default function MenuColumn({
  title,
  menu,
  menuId,
  horizontal = false,
}: MenuColumnProps) {
  const locale = useLocale();

  if (!menu || !menu.items || menu.items.length === 0) return null;

  const sortedItems = [...menu.items].sort((a, b) => (a.order || 0) - (b.order || 0));

  const getFullPath = (linkValue: string, linkType: string) => {
    if (linkType === 'external') return linkValue;
    let path = linkValue;
    if (path.startsWith('/')) path = `/${locale}${path}`;
    return path;
  };

  // ✅ 标题样式
  const titleStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-lg, 1.125rem)',
    fontWeight: 'var(--font-weight-semibold, 600)',
    color: 'var(--footer-text, var(--foreground, #0f172a))',
    // 横向时不需要底部间距，纵向时保留
    marginBottom: horizontal ? 0 : 'var(--spacing-4, 1rem)',
    // 横向时防止标题被压缩换行
    whiteSpace: horizontal ? 'nowrap' : 'normal',
  };

  // ✅ 链接样式
  const linkStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-base, 1rem)',
    color: 'var(--footer-link, var(--primary, #1e293b))',
    transition: COLOR_TRANSITION,
  };

  // ✅ 链接悬停处理
  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.color = 'var(--footer-link-hover, var(--accent, #f1f5f9))';
  };
  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.color = 'var(--footer-link, var(--primary, #1e293b))';
  };

  return (
    <div
      style={{
        display: 'flex',
        // 横向：标题 + 菜单项同排；纵向：标题在上、菜单项在下
        flexDirection: horizontal ? 'row' : 'column',
        alignItems: horizontal ? 'center' : 'stretch',
        flexWrap: horizontal ? 'wrap' : 'nowrap',
        gap: horizontal
          ? 'var(--spacing-6, 1.5rem)'
          : 'var(--spacing-2, 0.5rem)',
      }}
    >
      {title && <h3 style={titleStyle}>{title}</h3>}
      <ul
        style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 'var(--spacing-6, 1.5rem)',
          // 纵向模式：菜单项竖直排列
          ...(horizontal
            ? {}
            : {
                flexDirection: 'column',
                gap: 'var(--spacing-2, 0.5rem)',
              }),
          margin: 0,
          padding: 0,
          listStyle: 'none',
        }}
      >
        {sortedItems.map((item) => (
          <li key={item.id}>
            {item.linkType === 'external' ? (
              <a
                href={item.linkValue}
                target="_blank"
                rel="noopener noreferrer"
                style={linkStyle}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                {item.label}
              </a>
            ) : (
              <Link
                href={getFullPath(item.linkValue, item.linkType)}
                style={linkStyle}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}