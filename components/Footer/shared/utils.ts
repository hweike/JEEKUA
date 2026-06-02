import { FooterConfig } from '@/lib/config-loader';

export interface ActiveFooterItem {
  type: 'brand' | 'menu' | 'text';
  key: string;
  title?: string;
  data: any;
}

export function getActiveFooterItems(
  footerConfig: FooterConfig,
  menusMap: Map<string, any>,
  siteName: string
): ActiveFooterItem[] {
  const items: ActiveFooterItem[] = [];
  
  // 安全地获取 brandMenu，如果不存在则使用空对象
  const brandMenu = footerConfig?.brandMenu || {
    brandItem: { visible: false },
    column1: { visible: false, menuId: '' },
    column2: { visible: false, menuId: '' },
    column3: { visible: false, menuId: '' }
  };
  
  // brandItem
  if (brandMenu.brandItem?.visible) {
    items.push({
      type: 'brand',
      key: 'brand',
      title: undefined,
      data: brandMenu.brandItem
    });
  }
  
  // column1
  if (brandMenu.column1?.visible && brandMenu.column1?.menuId) {
    const menu = menusMap.get(brandMenu.column1.menuId);
    items.push({
      type: 'menu',
      key: 'column1',
      title: brandMenu.column1.title,
      data: { menu, menuId: brandMenu.column1.menuId }
    });
  }
  
  // column2
  if (brandMenu.column2?.visible && brandMenu.column2?.menuId) {
    const menu = menusMap.get(brandMenu.column2.menuId);
    items.push({
      type: 'menu',
      key: 'column2',
      title: brandMenu.column2.title,
      data: { menu, menuId: brandMenu.column2.menuId }
    });
  }
  
  // column3
  if (brandMenu.column3?.visible && brandMenu.column3?.menuId) {
    const menu = menusMap.get(brandMenu.column3.menuId);
    items.push({
      type: 'menu',
      key: 'column3',
      title: brandMenu.column3.title,
      data: { menu, menuId: brandMenu.column3.menuId }
    });
  }
  
  // textInfo
  const textInfo = footerConfig?.textInfo;
  if (textInfo?.enabled) {
    items.push({
      type: 'text',
      key: 'textInfo',
      title: textInfo.title,
      data: textInfo
    });
  }
  
  return items;
}

export function getLayoutMode(activeCount: number): 'horizontal' | 'grid' {
  return activeCount === 1 ? 'horizontal' : 'grid';
}