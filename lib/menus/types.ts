// lib/menus/types.ts
export interface MenuItem {
  id: string;
  parentId: string | null;
  label: string;
  linkType: 'internal' | 'external';
  linkValue: string;   // internal: 相对路径如 "/about"；external: 完整 URL
  order: number;
  picture?: string;      // 新增：图片 URL（仅二级/三级使用）
  description?: string;  // 新增：描述文本（仅二级/三级使用）
  megaMenuImageMode?: boolean; // 新增：二级菜单大图文模式（仅一级菜单有效）
}

export interface Menu {
  id: string;          // 固定：navigation / footer / 自定义菜单的 uuid
  name: string;
  isEditable: boolean; // 导航和底部为 false，自定义为 true
  items: MenuItem[];
}

// 自定义菜单存储格式：数组
export type CustomMenusStore = Menu[];