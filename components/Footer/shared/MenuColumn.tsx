'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Menu } from '@/lib/config-loader';

interface MenuColumnProps {
  title?: string;
  menu: Menu | null;
  menuId: string;
}

export default function MenuColumn({ title, menu, menuId }: MenuColumnProps) {
  const locale = useLocale();

  if (!menu || !menu.items || menu.items.length === 0) return null;

  const sortedItems = [...menu.items].sort((a, b) => (a.order || 0) - (b.order || 0));

  const getFullPath = (linkValue: string, linkType: string) => {
    if (linkType === 'external') return linkValue;
    let path = linkValue;
    if (path.startsWith('/')) path = `/${locale}${path}`;
    return path;
  };

  return (
    <div>
      {title && (
        <h3 className="font-semibold mb-4" style={{ fontSize: '18px', color: 'var(--footer-text)' }}>
          {title}
        </h3>
      )}
      <ul className="space-y-2">
        {sortedItems.map((item) => (
          <li key={item.id}>
            {item.linkType === 'external' ? (
              <a
                href={item.linkValue}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors"
                style={{ fontSize: '16px', color: 'var(--footer-link)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--footer-link-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--footer-link)')}
              >
                {item.label}
              </a>
            ) : (
              <Link
                href={getFullPath(item.linkValue, item.linkType)}
                className="transition-colors"
                style={{ fontSize: '16px', color: 'var(--footer-link)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--footer-link-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--footer-link)')}
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