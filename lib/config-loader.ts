// lib/config-loader.ts
import { unstable_cache, revalidateTag } from 'next/cache';
import {
  readHeaderConfig,
  readFooterConfig,
} from '@/lib/SiteHeadersFooters/storage';
import { readMenuFile } from '@/lib/menus/storage';

// ========== 类型定义 ==========
export interface HeaderConfig {
  logo: {
    imageUrl: string;
    width: number;
    position: 'top-center' | 'middle-left' | 'middle-center' | 'middle-right';
    mobilePosition: 'left' | 'center' | 'right';
    faviconUrl: string;
  };
  menu: {
    menuSourceId: string;
    menuType: 'dropdown' | 'inline';
    stickyBehavior: 'scroll-up' | 'always' | 'none';
    showSeparator: boolean;
  };
  utilities: {
    showLanguageSelector: boolean;
    topSpacing: number;
    bottomSpacing: number;
  };
  announcements: {
    enabled: boolean;
    items: Array<{
      id: string;
      text: string;
      link?: string;
      type?: 'info' | 'warning' | 'error';
    }>;
  };
  search?: {
    enabled: boolean;
    placeholder?: string;
  };
}

export interface MenuItem {
  id: string;
  parentId: string | null;
  label: string;
  linkType: 'internal' | 'external';
  linkValue: string;
  order: number;
}

export interface Menu {
  id: string;
  name: string;
  isEditable?: boolean;
  items: MenuItem[];
}

export interface FooterConfig {
  emailSubscription: {
    enabled: boolean;
    title: string;
    subtitle: string;
  };
  brandMenu: {
    brandItem: {
      visible: boolean;
      imageUrl: string;
      imageWidth: number;
      imageAlign: 'left' | 'center' | 'right';
    };
    column1: {
      visible: boolean;
      title: string;
      menuId: string;
    };
    column2: {
      visible: boolean;
      title: string;
      menuId: string;
    };
    column3: {
      visible: boolean;
      title: string;
      menuId: string;
    };
  };
  social: {
    visible: boolean;
    links: Array<{
      platform: string;
      url: string;
      icon?: string;
    }>;
  };
  utilities: {
    showPolicyLinks: boolean;
    topSpacing: number;
    bottomSpacing: number;
  };
  textInfo: {
    enabled: boolean;
    title: string;
    content: string;
  };
}

// ========== 默认配置 ==========
const DEFAULT_HEADER_CONFIG: HeaderConfig = {
  logo: {
    imageUrl: "",
    width: 150,
    position: "middle-left",
    mobilePosition: "center",
    faviconUrl: ""
  },
  menu: {
    menuSourceId: "navigation",
    menuType: "dropdown",
    stickyBehavior: "scroll-up",
    showSeparator: false
  },
  utilities: {
    showLanguageSelector: true,
    topSpacing: 16,
    bottomSpacing: 16
  },
  announcements: {
    enabled: false,
    items: []
  },
  search: {
    enabled: true,
    placeholder: "Search..."
  }
};

const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  emailSubscription: {
    enabled: false,
    title: "Subscribe to our newsletter",
    subtitle: "Get the latest updates directly in your inbox."
  },
  brandMenu: {
    brandItem: {
      visible: true,
      imageUrl: "",
      imageWidth: 120,
      imageAlign: "left"
    },
    column1: {
      visible: false,
      title: "Quick Links",
      menuId: ""
    },
    column2: {
      visible: false,
      title: "Resources",
      menuId: ""
    },
    column3: {
      visible: false,
      title: "Support",
      menuId: ""
    }
  },
  social: {
    visible: true,
    links: []
  },
  utilities: {
    showPolicyLinks: true,
    topSpacing: 32,
    bottomSpacing: 32
  },
  textInfo: {
    enabled: false,
    title: "Contact Us",
    content: ""
  }
};

// ========== 深度合并函数 ==========
function mergeDeep(target: any, source: any): any {
  const output = { ...target };
  if (source && typeof source === 'object') {
    Object.keys(source).forEach(key => {
      const sourceValue = source[key];
      const targetValue = target[key];
      if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
        if (!(key in target)) {
          output[key] = sourceValue;
        } else {
          output[key] = mergeDeep(targetValue, sourceValue);
        }
      } else {
        output[key] = sourceValue;
      }
    });
  }
  return output;
}

// ============================================================
// 缓存标签 - 用于手动失效
// ============================================================
export const CONFIG_CACHE_TAGS = {
  HEADER: 'header-config',
  FOOTER: 'footer-config',
  MENU: 'menu-config',
} as const;

// ============================================================
// 对外接口（从数据库读取，带缓存）
// ============================================================

/**
 * 获取页头配置
 * 缓存时间：1 小时
 * 缓存标签：header-config
 */
export const getHeaderConfig = unstable_cache(
  async (locale: string): Promise<HeaderConfig> => {
    const userConfig = await readHeaderConfig(locale);
    let finalConfig = userConfig ? mergeDeep(DEFAULT_HEADER_CONFIG, userConfig) : DEFAULT_HEADER_CONFIG;
    if (!finalConfig.menu?.menuSourceId) {
      finalConfig.menu = { ...finalConfig.menu, menuSourceId: 'navigation' };
    }
    if (!finalConfig.search) {
      finalConfig.search = { enabled: false, placeholder: 'Search...' };
    }
    return finalConfig;
  },
  ['header-config'],
  {
    revalidate: 3600,
    tags: [CONFIG_CACHE_TAGS.HEADER],
  }
);

/**
 * 获取页脚配置
 * 缓存时间：1 小时
 * 缓存标签：footer-config
 */
export const getFooterConfig = unstable_cache(
  async (locale: string): Promise<FooterConfig> => {
    const userConfig = await readFooterConfig(locale);
    return userConfig ? mergeDeep(DEFAULT_FOOTER_CONFIG, userConfig) : DEFAULT_FOOTER_CONFIG;
  },
  ['footer-config'],
  {
    revalidate: 3600,
    tags: [CONFIG_CACHE_TAGS.FOOTER],
  }
);

// ============================================================
// 菜单获取
// ============================================================

/**
 * 获取固定菜单（navigation / footer-menu）
 */
async function getFixedMenu(locale: string, menuSourceId: 'navigation' | 'footer-menu'): Promise<Menu | null> {
  return await readMenuFile(locale, menuSourceId);
}

/**
 * 获取自定义菜单（从 custom_menus 中按 ID 查找）
 */
async function getCustomMenuById(locale: string, menuId: string | number): Promise<Menu | null> {
  const customMenus = await readMenuFile(locale, 'custom_menus');
  if (!Array.isArray(customMenus)) return null;
  return customMenus.find(menu => String(menu.id) === String(menuId)) || null;
}

/**
 * 获取菜单（支持固定菜单和自定义菜单）
 * 缓存时间：1 小时
 * 缓存标签：menu-config
 */
export const getMenuBySourceId = unstable_cache(
  async (locale: string, menuSourceId: string): Promise<Menu | null> => {
    if (menuSourceId === 'navigation' || menuSourceId === 'footer-menu') {
      return await getFixedMenu(locale, menuSourceId as 'navigation' | 'footer-menu');
    }
    return await getCustomMenuById(locale, menuSourceId);
  },
  ['menu-config'],
  {
    revalidate: 3600,
    tags: [CONFIG_CACHE_TAGS.MENU],
  }
);

/**
 * 批量获取多个菜单
 * 注意：此函数不使用 unstable_cache，因为它内部已调用 getMenuBySourceId（已缓存）
 */
export async function getMultipleMenus(
  locale: string,
  menuIds: string[]
): Promise<Map<string, Menu | null>> {
  const results = new Map<string, Menu | null>();
  const uniqueIds = [...new Set(menuIds.filter(id => id && id.trim() !== ''))];

  await Promise.all(
    uniqueIds.map(async (id) => {
      const menu = await getMenuBySourceId(locale, id);
      results.set(id, menu);
    })
  );

  return results;
}

// ============================================================
// 缓存失效工具
// ============================================================

/**
 * 手动刷新页头配置缓存
 * 
 * 注意：Next.js 15+ 的 revalidateTag 需要第二个参数 profile。
 * - 'default'：标准缓存配置
 */
export async function revalidateHeaderConfig(): Promise<void> {
  revalidateTag(CONFIG_CACHE_TAGS.HEADER, 'default');
}

/**
 * 手动刷新页脚配置缓存
 */
export async function revalidateFooterConfig(): Promise<void> {
  revalidateTag(CONFIG_CACHE_TAGS.FOOTER, 'default');
}

/**
 * 手动刷新菜单缓存
 */
export async function revalidateMenuConfig(): Promise<void> {
  revalidateTag(CONFIG_CACHE_TAGS.MENU, 'default');
}

/**
 * 手动刷新所有配置缓存
 */
export async function revalidateAllConfig(): Promise<void> {
  revalidateTag(CONFIG_CACHE_TAGS.HEADER, 'default');
  revalidateTag(CONFIG_CACHE_TAGS.FOOTER, 'default');
  revalidateTag(CONFIG_CACHE_TAGS.MENU, 'default');
}