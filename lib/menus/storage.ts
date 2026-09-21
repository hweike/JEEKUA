// lib/menus/storage.ts
import { menuService } from './menu-service';

// ---------- 缓存 ----------
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 300 * 1000;

function getCacheKey(locale: string, menuType: string): string {
  return `menus_${locale}_${menuType}`;
}

function getCache(locale: string, menuType: string): any | undefined {
  const key = getCacheKey(locale, menuType);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return undefined;
}

function setCache(locale: string, menuType: string, data: any): void {
  const key = getCacheKey(locale, menuType);
  cache.set(key, { data, timestamp: Date.now() });
}

function clearCache(locale?: string, menuType?: string): void {
  if (locale && menuType) {
    cache.delete(getCacheKey(locale, menuType));
  } else if (locale) {
    for (const key of cache.keys()) {
      if (key.startsWith(`menus_${locale}`)) cache.delete(key);
    }
  } else {
    cache.clear();
  }
}

export function clearMenuCache(locale?: string, menuType?: string): void {
  const actualMenuType = menuType === 'footer' ? 'footer-menu' : menuType;
  clearCache(locale, actualMenuType);
}

// ---------- 存储操作 ----------
export async function readMenuFile(locale: string, menuType: string): Promise<any> {
  const actualMenuType = menuType === 'footer' ? 'footer-menu' : menuType;
  const cached = getCache(locale, actualMenuType);
  if (cached !== undefined) return cached;

  let data: any;
  if (actualMenuType === 'custom_menus') {
    data = await menuService.getCustomMenus(locale);
  } else {
    data = await menuService.getMenu(actualMenuType, locale);
  }
  setCache(locale, actualMenuType, data);
  return data;
}

export async function writeMenuFile(locale: string, menuType: string, data: any): Promise<void> {
  const actualMenuType = menuType === 'footer' ? 'footer-menu' : menuType;
  
  // 支持删除：如果 data 为 null，删除菜单记录
  if (data === null) {
    if (actualMenuType === 'custom_menus') {
      await menuService.saveCustomMenus(locale, []);
    } else {
      await menuService.saveMenu(actualMenuType, locale, null);
    }
    clearCache(locale, actualMenuType);
    return;
  }
  
  if (actualMenuType === 'custom_menus') {
    await menuService.saveCustomMenus(locale, data);
  } else {
    await menuService.saveMenu(actualMenuType, locale, data);
  }
  clearCache(locale, actualMenuType);
}

export async function getAvailableLocales(): Promise<string[]> {
  return await menuService.getAvailableMenuLocales();
}

/**
 * 批量更新菜单翻译
 */
export async function updateMenuTranslations(
  targetLocale: string,
  translations: Array<{
    menuId: string;
    config: any;
  }>,
  sourceLocale?: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const trans of translations) {
    const { menuId, config: translatedConfig } = trans;
    try {
      let targetData = await readMenuFile(targetLocale, menuId);

      if (targetData === null && sourceLocale) {
        const sourceData = await readMenuFile(sourceLocale, menuId);
        if (sourceData !== null) {
          targetData = sourceData;
        } else {
          targetData = menuService.getDefaultMenu(menuId);
        }
      } else if (targetData === null) {
        targetData = menuService.getDefaultMenu(menuId);
      }

      if (targetData === null) {
        const msg = `菜单 ${menuId} 在目标语言中不存在且无法创建`;
        errors.push(msg);
        failed++;
        continue;
      }

      // 按 id 合并数组
      function mergeLabels(original: any, translated: any): any {
        if (original === null || typeof original !== 'object') return translated !== undefined ? translated : original;

        if (Array.isArray(original) && Array.isArray(translated)) {
          const translatedMap = new Map(translated.map(item => [item.id, item]));
          const originalMap = new Map(original.map(item => [item.id, item]));
          const mergedArray = translated.map(tItem => {
            const oItem = originalMap.get(tItem.id);
            if (oItem) {
              return mergeLabels(oItem, tItem);
            } else {
              return { ...tItem };
            }
          });
          return mergedArray;
        }

        const result = { ...original };
        for (const key in translated) {
          if (key === 'items' || key === 'children') {
            if (Array.isArray(original[key]) && Array.isArray(translated[key])) {
              result[key] = mergeLabels(original[key], translated[key]);
            } else {
              result[key] = translated[key];
            }
          } else {
            result[key] = translated[key];
          }
        }
        return result;
      }

      const merged = mergeLabels(targetData, translatedConfig);
      await writeMenuFile(targetLocale, menuId, merged);
      success++;
    } catch (err: any) {
      const msg = `菜单 ${menuId} 导入失败: ${err.message}`;
      errors.push(msg);
      failed++;
    }
  }

  return { success, failed, errors };
}