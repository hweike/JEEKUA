// lib/config-loader.ts
import { cache } from 'react';
import { getPrivateStorage } from '@/lib/storage/factory';

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
    enabled: false,
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

// 深度合并函数
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

// 从私有桶读取 JSON 文件，不存在时返回 null
async function readConfigFile(key: string): Promise<any | null> {
  const storage = getPrivateStorage();
  try {
    const content = await storage.read(key, 'utf8');
    return JSON.parse(content as string);
  } catch (error: any) {
    // ✅ 增强错误捕获：检查多种可能的 404 标识
    if (error?.code === 'NoSuchKey' ||
        error?.Code === 'NoSuchKey' ||
        error?.$metadata?.httpStatusCode === 404 ||
        (error?.message && (error.message.includes('NoSuchKey') || error.message.includes('not found')))) {
      return null;
    }
    // 其他错误继续抛出
    throw error;
  }
}

// 获取页头配置（文件不存在直接返回默认配置）
export const getHeaderConfig = cache(async (locale: string): Promise<HeaderConfig> => {
  const key = `SiteHeadersFooters/header/${locale}.json`;
  const userConfig = await readConfigFile(key);
  if (!userConfig) {
    console.warn(`Header config for locale ${locale} not found, using default.`);
    return DEFAULT_HEADER_CONFIG;
  }
  return mergeDeep(DEFAULT_HEADER_CONFIG, userConfig);
});

// 获取页脚配置（文件不存在直接返回默认配置）
export const getFooterConfig = cache(async (locale: string): Promise<FooterConfig> => {
  const key = `SiteHeadersFooters/footer/${locale}.json`;
  const userConfig = await readConfigFile(key);
  if (!userConfig) {
    console.warn(`Footer config for locale ${locale} not found, using default.`);
    return DEFAULT_FOOTER_CONFIG;
  }
  return mergeDeep(DEFAULT_FOOTER_CONFIG, userConfig);
});

// 获取固定菜单（navigation / footer）- 文件不存在返回 null
async function getFixedMenu(locale: string, menuSourceId: 'navigation' | 'footer'): Promise<Menu | null> {
  const key = `menus/${locale}/${menuSourceId}.json`;
  return await readConfigFile(key);
}

// 获取自定义菜单（从 custom_menus.json 中按 ID 查找）
async function getCustomMenuById(locale: string, menuId: string | number): Promise<Menu | null> {
  const key = `menus/${locale}/custom_menus.json`;
  const customMenus = await readConfigFile(key);
  if (!customMenus || !Array.isArray(customMenus)) return null;
  const target = customMenus.find(menu => String(menu.id) === String(menuId));
  return target || null;
}

// 获取菜单（支持固定菜单和自定义菜单），不存在返回 null
export const getMenuBySourceId = cache(async (locale: string, menuSourceId: string): Promise<Menu | null> => {
  if (menuSourceId === 'navigation' || menuSourceId === 'footer') {
    return await getFixedMenu(locale, menuSourceId);
  }
  return await getCustomMenuById(locale, menuSourceId);
});

// 批量获取多个菜单
export const getMultipleMenus = cache(async (locale: string, menuIds: string[]): Promise<Map<string, Menu | null>> => {
  const results = new Map();
  const uniqueIds = [...new Set(menuIds.filter(id => id && id.trim() !== ''))];
  await Promise.all(uniqueIds.map(async (id) => {
    const menu = await getMenuBySourceId(locale, id);
    results.set(id, menu);
  }));
  return results;
});