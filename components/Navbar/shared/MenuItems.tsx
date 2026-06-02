'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import DropdownMenu from './DropdownMenu';
import MegaMenu from './MegaMenu';


interface MenuItem {
  id: string;
  label: string;
  linkType: 'internal' | 'external';
  linkValue: string;
  children?: MenuItem[];
  order?: number;
}

interface MenuItemsProps {
  items: MenuItem[];
  pathname: string;
  mobile?: boolean;
  onClickItem?: () => void;
  menuType?: 'dropdown' | 'mega';
}

export default function MenuItems({ items, pathname, mobile = false, onClickItem, menuType = 'dropdown' }: MenuItemsProps) {
  const locale = useLocale();

  if (!items || items.length === 0) return null;

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

  // 移动端
  if (mobile) {
    return (
      <div className="flex flex-col space-y-3">
        {items.map(item => {
          const hasChildren = item.children && item.children.length > 0;
          if (hasChildren) {
            return (
              <div key={item.id}>
                <div className="font-semibold px-4 py-2" style={{ color: 'var(--navbar-text, var(--foreground))' }}>
                  {item.label}
                </div>
                <div className="pl-4">
                  <MenuItems items={item.children!} pathname={pathname} mobile onClickItem={onClickItem} menuType={menuType} />
                </div>
              </div>
            );
          }
          return (
            <div key={item.id} className="px-4">
              <Link
                href={getFullPath(item)}
                className="block py-2"
                style={{
                  color: isActive(item.linkValue)
                    ? 'var(--navbar-active-text, var(--navbar-hover-text, var(--primary)))'
                    : 'var(--navbar-text, var(--foreground))',
                }}
                onClick={onClickItem}
              >
                {item.label}
              </Link>
            </div>
          );
        })}
      </div>
    );
  }

  // 桌面端
  if (menuType === 'mega') {
    return <MegaMenu items={items} pathname={pathname} locale={locale} />;
  }
  return <DropdownMenu items={items} pathname={pathname} locale={locale} />;
}