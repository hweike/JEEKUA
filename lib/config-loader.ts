import fs from 'fs/promises';
import path from 'path';
import { cache } from 'react';

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
   // 新增搜索配置（可选）
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

// 获取页头配置
export const getHeaderConfig = cache(async (locale: string): Promise<HeaderConfig> => {
  const filePath = path.join(process.cwd(), `data/SiteHeadersFooters/header/${locale}.json`);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const userConfig = JSON.parse(content);
    return mergeDeep(DEFAULT_HEADER_CONFIG, userConfig);
  } catch (error) {
    console.error(`Failed to load header config for locale ${locale}:`, error);
    if (locale !== 'zh') {
      try {
        const fallbackPath = path.join(process.cwd(), 'data/SiteHeadersFooters/header/zh.json');
        const fallbackContent = await fs.readFile(fallbackPath, 'utf-8');
        const fallbackConfig = JSON.parse(fallbackContent);
        return mergeDeep(DEFAULT_HEADER_CONFIG, fallbackConfig);
      } catch (fallbackError) {
        console.error(`Failed to load fallback zh header config, using defaults`, fallbackError);
        return DEFAULT_HEADER_CONFIG;
      }
    }
    return DEFAULT_HEADER_CONFIG;
  }
});

// 获取页脚配置
export const getFooterConfig = cache(async (locale: string): Promise<FooterConfig> => {
  const filePath = path.join(process.cwd(), `data/SiteHeadersFooters/footer/${locale}.json`);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const userConfig = JSON.parse(content);
    return mergeDeep(DEFAULT_FOOTER_CONFIG, userConfig);
  } catch (error) {
    console.error(`Failed to load footer config for locale ${locale}:`, error);
    if (locale !== 'zh') {
      try {
        const fallbackPath = path.join(process.cwd(), 'data/SiteHeadersFooters/footer/zh.json');
        const fallbackContent = await fs.readFile(fallbackPath, 'utf-8');
        const fallbackConfig = JSON.parse(fallbackContent);
        return mergeDeep(DEFAULT_FOOTER_CONFIG, fallbackConfig);
      } catch (fallbackError) {
        console.error(`Failed to load fallback zh footer config, using defaults`, fallbackError);
        return DEFAULT_FOOTER_CONFIG;
      }
    }
    return DEFAULT_FOOTER_CONFIG;
  }
});

// 获取固定菜单（navigation / footer）- 文件不存在返回 null
async function getFixedMenu(locale: string, menuSourceId: 'navigation' | 'footer'): Promise<Menu | null> {
  const filePath = path.join(process.cwd(), `data/menus/${locale}/${menuSourceId}.json`);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // console.error(`Menu file not found: ${filePath}`);
      return null;
    }
    throw error;
  }
}

// 获取自定义菜单（从 custom_menus.json 中按 ID 查找）
async function getCustomMenuById(locale: string, menuId: string | number): Promise<Menu | null> {
  const customFilePath = path.join(process.cwd(), `data/menus/${locale}/custom_menus.json`);
  try {
    const content = await fs.readFile(customFilePath, 'utf-8');
    const customMenus: Menu[] = JSON.parse(content);
    const target = customMenus.find(menu => String(menu.id) === String(menuId));
    return target || null;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // console.error(`Custom menus file not found: ${customFilePath}`);
      return null;
    }
    console.error(`Failed to load custom_menus.json for locale ${locale}:`, error);
    return null;
  }
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