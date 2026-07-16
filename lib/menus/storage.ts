// lib/menus/storage.ts
import { getPrivateStorage } from '@/lib/storage/factory';

const STORAGE_PREFIX = 'menus';

// ---------- 缓存 ----------
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 60 秒

function getCacheKey(locale: string): string {
  return `menus_${locale}`;
}

/**
 * 获取缓存的菜单数据
 */
export function getMenuCache(locale: string): any | null {
  const key = getCacheKey(locale);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

/**
 * 设置菜单缓存
 */
export function setMenuCache(locale: string, data: any): void {
  const key = getCacheKey(locale);
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * 清除菜单缓存（可指定 locale）
 */
export function clearMenuCache(locale?: string): void {
  if (locale) {
    cache.delete(getCacheKey(locale));
  } else {
    cache.clear();
  }
}

// ---------- 存储操作 ----------
function getMenuKey(locale: string, menuType: string): string {
  return `${STORAGE_PREFIX}/${locale}/${menuType}.json`;
}

export async function readMenuFile(locale: string, menuType: string): Promise<any> {
  const storage = getPrivateStorage();
  const key = getMenuKey(locale, menuType);
  try {
    const content = await storage.read(key, 'utf8');
    const parsed = JSON.parse(content as string);
    if (menuType === 'custom_menus') {
      return Array.isArray(parsed) ? parsed : [];
    }
    if (menuType === 'navigation' || menuType === 'footer') {
      if (!parsed.items) parsed.items = [];
      if (typeof parsed.isEditable !== 'boolean') parsed.isEditable = false;
      return parsed;
    }
    return parsed;
  } catch (error: any) {
    const isNotFound =
      error?.code === 'NoSuchKey' ||
      error?.Code === 'NoSuchKey' ||
      error?.message?.includes('NoSuchKey') ||
      error?.message?.includes('not found');
    if (isNotFound) {
      if (menuType === 'custom_menus') return [];
      return {
        id: menuType,
        name: menuType === 'navigation' ? '主导航' : '底部菜单',
        isEditable: false,
        items: [],
      };
    }
    console.error(`[readMenuFile] 读取失败 Key: ${key}`, error);
    if (menuType === 'custom_menus') return [];
    return {
      id: menuType,
      name: menuType === 'navigation' ? '主导航' : '底部菜单',
      isEditable: false,
      items: [],
    };
  }
}

export async function writeMenuFile(locale: string, menuType: string, data: any): Promise<void> {
  const storage = getPrivateStorage();
  const key = getMenuKey(locale, menuType);
  await storage.write(key, JSON.stringify(data, null, 2), {
    contentType: 'application/json',
  });
  // 写入后清除该 locale 的缓存（包括组合缓存）
  clearMenuCache(locale);
}

export async function getAvailableLocales(): Promise<string[]> {
  const storage = getPrivateStorage();
  try {
    const keys = await storage.list(STORAGE_PREFIX);
    const locales = new Set<string>();
    for (const key of keys) {
      const parts = key.split('/');
      if (parts.length >= 3) {
        locales.add(parts[2]);
      }
    }
    if (locales.size === 0) {
      return ['zh', 'en'];
    }
    return Array.from(locales).sort();
  } catch (error) {
    console.error('[getAvailableLocales] 获取失败:', error);
    return ['zh', 'en'];
  }
}