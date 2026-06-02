import { HeaderConfig, Menu, FooterConfig } from '@/lib/config-loader';
import { SiteSettings } from '@/lib/getSiteSettings';
import NavbarClient from './NavbarClient';

interface NavbarProps {
  headerConfig: HeaderConfig;
  menuData: Menu | null;
  siteSettings: SiteSettings;
  footerConfig?: FooterConfig;
}

// 将扁平菜单（带 parentId）转换为树形结构
function buildMenuTree(flatItems: any[]): any[] {
  if (!flatItems.length) return [];
  // 如果已经是树形（第一个 item 有 children），直接返回
  if (flatItems[0].children !== undefined) return flatItems;

  const map = new Map();
  const roots: any[] = [];

  flatItems.forEach(item => {
    map.set(item.id, { ...item, children: [] });
  });

  flatItems.forEach(item => {
    const node = map.get(item.id);
    if (item.parentId === null || item.parentId === undefined) {
      roots.push(node);
    } else {
      const parent = map.get(item.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        // 如果找不到父节点，也作为根节点（避免丢失）
        roots.push(node);
      }
    }
  });

  // 按 order 排序
  const sortByOrder = (items: any[]) => {
    items.sort((a, b) => (a.order || 0) - (b.order || 0));
    items.forEach(item => {
      if (item.children && item.children.length) sortByOrder(item.children);
    });
  };
  sortByOrder(roots);

  return roots;
}

export default function Navbar({ headerConfig, menuData, siteSettings, footerConfig }: NavbarProps) {
  const flatItems = menuData?.items || [];
  const menuTree = buildMenuTree(flatItems);
  return (
    <NavbarClient
      headerConfig={headerConfig}
      menuTree={menuTree}
      siteSettings={siteSettings}
      footerConfig={footerConfig}
    />
  );
}