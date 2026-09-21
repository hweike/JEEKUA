// app/admin/themes/customizer/config/global-groups.config.ts

/**
 * ============================================================
 * 全局主题编辑器的颜色分组配置
 * 用于 GlobalTabs 组件中的"亮色颜色"和"暗色颜色"标签页
 * ============================================================
 */

interface ColorGroup {
  id: string;
  name: string;
  description: string;
  keys: string[];
}

/**
 * 排除变量（现在为空数组）
 */
export const EXCLUDED_FROM_COLOR_GROUPS: string[] = [];

/**
 * 颜色分组配置（仅全局主题需要的8个分组）
 */
export const COLOR_GROUPS: ColorGroup[] = [
  // ============================================================
  // 品牌色（去掉 brand-* 重复项，保留 primary、secondary、accent、destructive）
  // ============================================================
  {
    id: 'brand',
    name: '品牌色',
    description: '按钮、链接、徽章、图标等品牌元素',
    keys: [
      'primary',
      'secondary',
      'accent',
      'destructive',
    ],
  },

  // ============================================================
  // 背景与文字（去掉 page-bg、page-bg-alt 重复项）
  // ============================================================
  {
    id: 'background',
    name: '背景与文字',
    description: '页面背景、卡片、弹窗等容器',
    keys: [
      'background',
      'foreground',
      'card',
      'card-foreground',
      'popover',
      'popover-foreground',
    ],
  },

  // ============================================================
  // 状态与交互
  // ============================================================
  {
    id: 'interaction',
    name: '状态与交互',
    description: '禁用状态、聚焦环等交互反馈',
    keys: ['muted', 'muted-foreground', 'ring'],
  },

  // ============================================================
  // 边框与分隔
  // ============================================================
  {
    id: 'border',
    name: '边框与分隔',
    description: '输入框边框、分割线等',
    keys: ['border', 'input'],
  },

  // ============================================================
  // 图表颜色
  // ============================================================
  {
    id: 'chart',
    name: '图表颜色',
    description: '数据图表系列颜色',
    keys: ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'],
  },

  // ============================================================
  // 侧边栏（管理后台侧边栏）
  // ============================================================
  {
    id: 'sidebar',
    name: '侧边栏',
    description: '管理后台侧边栏样式',
    keys: [
      'sidebar',
      'sidebar-foreground',
      'sidebar-primary',
      'sidebar-primary-foreground',
      'sidebar-accent',
      'sidebar-accent-foreground',
      'sidebar-border',
      'sidebar-ring',
    ],
  },

  // ============================================================
  // 页头（导航栏 + 公告栏）
  // ============================================================
  {
    id: 'header',
    name: '页头',
    description: '导航栏、公告栏等页面顶部区域',
    keys: [
      'navbar-bg',
      'navbar-text',
      'navbar-hover-bg',
      'navbar-hover-text',
      'navbar-active-text',
      'navbar-divider-color',
      'announcement-bg',
      'announcement-text',
    ],
  },

  // ============================================================
  // 页脚
  // ============================================================
  {
    id: 'footer',
    name: '页脚',
    description: '页脚区域样式',
    keys: [
      'footer-bg',
      'footer-text',
      'footer-link',
      'footer-link-hover',
      'footer-divider-color',
    ],
  },
];

/**
 * 获取颜色分组列表
 */
export function getColorGroups() {
  return COLOR_GROUPS;
}

/**
 * 获取某个分组包含的所有变量键
 */
export function getGroupKeys(groupId: string): string[] {
  const group = COLOR_GROUPS.find(g => g.id === groupId);
  return group?.keys || [];
}

/**
 * 获取所有分组中出现的变量键（去重）
 */
export function getAllGroupedColorKeys(): string[] {
  const allKeys: string[] = [];
  for (const group of COLOR_GROUPS) {
    for (const key of group.keys) {
      if (!allKeys.includes(key)) {
        allKeys.push(key);
      }
    }
  }
  return allKeys;
}