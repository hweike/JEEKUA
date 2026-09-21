// lib/theme/index.ts
import { getPrivateStorage } from '@/lib/storage/factory';
import NodeCache from 'node-cache';

// ============================================================
// ✅ 主题 CSS 缓存（5 分钟）
// ============================================================
interface CachedThemeCss {
  lightCss: string;
  darkCss: string;
  darkMode: string;
  hasTheme: boolean;
}

const themeCssCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

export function getCachedThemeCss(themeId: string): CachedThemeCss | null {
  return themeCssCache.get<CachedThemeCss>(`theme-css:${themeId}`) || null;
}

export function setCachedThemeCss(themeId: string, data: CachedThemeCss): void {
  themeCssCache.set(`theme-css:${themeId}`, data);
}

export function invalidateThemeCss(themeId: string): void {
  themeCssCache.del(`theme-css:${themeId}`);
}

// ============================================================
// ✅ 主题列表缓存（60 秒，跨请求共享）
// 用于 GET /api/themes 的列表接口
// ============================================================
const themeListCache = new NodeCache({ stdTTL: 60, checkperiod: 30 });

export function getCachedThemeList<T = any>(): T | null {
  return themeListCache.get<T>('themes-list') || null;
}

export function setCachedThemeList<T = any>(data: T): void {
  themeListCache.set('themes-list', data);
}

export function invalidateThemeListCache(): void {
  themeListCache.flushAll();
  console.log('[themeListCache] 🗑️ 已清空');
}

// ============================================================
// 类型定义（内置）
// ============================================================

export interface ThemeIndexItem {
  id: string;
  type: 'builtin' | 'custom';
  category: string;
  name: string;
  displayName: string;
  previewImage: string | null;
  primaryColor: string;
  globalThemePath: string;
  pageThemePath: string;
}

export interface ThemeIndex {
  themes: ThemeIndexItem[];
  activeTheme: string;
  updatedAt: string;
}

export interface ThemeData {
  colors: Record<string, string>;
  darkColors: Record<string, string>;
  typography: Record<string, string>;
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
  shadows: Record<string, string>;
  animation: Record<string, string>;
  darkMode: 'light' | 'dark' | 'system';
}

// ============================================================
// 常量
// ============================================================

const INDEX_KEY = 'themes/themes-index.json';
const ACTIVE_THEME_KEY = 'themes/active-theme.json';

const CATEGORY_COLORS: Record<string, string> = {
  Blue: '#3b82f6',
  Red: '#ef4444',
  Green: '#22c55e',
  Purple: '#a855f7',
  Orange: '#f97316',
  Gray: '#6b7280',
  Pink: '#ec4899',
  Yellow: '#eab308',
  Cyan: '#06b6d4',
  Indigo: '#6366f1',
  Teal: '#14b8a6',
  Brown: '#92400e',
  自定义: '#8b5cf6',
};

// ============================================================
// ✅ 索引内存缓存（60 秒 TTL，避免返回陈旧数据）
// ============================================================
let cache: ThemeIndex | null = null;
let cacheTimestamp = 0;
const THEME_INDEX_CACHE_TTL = 60 * 1000; // 60 秒

// ============================================================
// ✅ 文件读取缓存（5 分钟）
// ============================================================

const fileCache: Map<string, { data: any; timestamp: number }> = new Map();
const FILE_CACHE_TTL = 5 * 60 * 1000;

export function clearFileCache(path?: string): void {
  if (path) {
    fileCache.delete(path);
  } else {
    fileCache.clear();
  }
}

export async function readThemeFile(path: string): Promise<any | null> {
  const cached = fileCache.get(path);
  if (cached && Date.now() - cached.timestamp < FILE_CACHE_TTL) {
    return cached.data;
  }

  const storage = getPrivateStorage();
  try {
    const content = await storage.read(path, 'utf8');
    const data = JSON.parse(content as string);
    fileCache.set(path, { data, timestamp: Date.now() });
    return data;
  } catch {
    return null;
  }
}

// ============================================================
// 索引操作
// ============================================================

export async function readThemeIndex(): Promise<ThemeIndex | null> {
  const storage = getPrivateStorage();
  try {
    const content = await storage.read(INDEX_KEY, 'utf8');
    return JSON.parse(content as string);
  } catch (error: any) {
    const code = error?.Code || error?.code || '';
    if (code === 'NoSuchKey' || code === 'NotFound' || error?.message?.includes('NoSuchKey')) {
      return null;
    }
    console.error(`[readThemeIndex] 读取索引文件失败:`, error);
    throw error;
  }
}

export async function writeThemeIndex(index: ThemeIndex): Promise<void> {
  // ✅ 清空内存缓存 + 时间戳
  cache = null;
  cacheTimestamp = 0;

  const storage = getPrivateStorage();
  await storage.write(INDEX_KEY, JSON.stringify(index, null, 2), {
    contentType: 'application/json',
  });
}

export async function getThemeIndex(forceRefresh = false): Promise<ThemeIndex> {
  // ✅ 带 TTL 的内存缓存检查
  if (
    !forceRefresh &&
    cache &&
    Date.now() - cacheTimestamp < THEME_INDEX_CACHE_TTL
  ) {
    return cache;
  }

  try {
    const cached = await readThemeIndex();
    if (cached) {
      cache = cached;
      cacheTimestamp = Date.now();
      return cache;
    }
  } catch (error) {
    console.error('[getThemeIndex] 读取索引失败，返回空索引:', error);
    const emptyIndex: ThemeIndex = {
      themes: [],
      activeTheme: '',
      updatedAt: new Date().toISOString(),
    };
    cache = emptyIndex;
    cacheTimestamp = Date.now();
    return emptyIndex;
  }

  const emptyIndex: ThemeIndex = {
    themes: [],
    activeTheme: '',
    updatedAt: new Date().toISOString(),
  };
  cache = emptyIndex;
  cacheTimestamp = Date.now();
  return emptyIndex;
}

// ============================================================
// 刷新索引
// ============================================================

export async function refreshThemeIndex(): Promise<void> {
  console.log('[refreshThemeIndex] 开始刷新索引...');

  let oldIndex: ThemeIndex | null = null;
  try {
    oldIndex = await readThemeIndex();
    console.log('[refreshThemeIndex] 旧索引主题数量:', oldIndex?.themes.length || 0);
  } catch (error) {
    console.error('[refreshThemeIndex] 读取旧索引失败，终止刷新操作:', error);
    throw new Error(`刷新索引失败：无法读取旧索引。原因：${(error as Error).message}`);
  }

  let newIndex: ThemeIndex;
  try {
    newIndex = await generateThemeIndex();
    console.log('[refreshThemeIndex] 新索引主题数量:', newIndex.themes.length);
  } catch (error) {
    console.error('[refreshThemeIndex] 生成新索引失败:', error);
    if (oldIndex) {
      cache = oldIndex;
      cacheTimestamp = Date.now();
      console.warn('[refreshThemeIndex] 生成新索引失败，保留旧索引。');
      throw new Error(`刷新索引失败：生成新索引失败。原因：${(error as Error).message}`);
    }
    throw error;
  }

  if (newIndex.themes.length === 0 && oldIndex && oldIndex.themes.length > 0) {
    console.error('[refreshThemeIndex] ⚠️ 新索引为空但旧索引有数据，拒绝覆盖！');
    cache = oldIndex;
    cacheTimestamp = Date.now();
    throw new Error('索引刷新失败：新生成的索引为空，但旧索引包含数据。已保留旧索引。');
  }

  await writeThemeIndex(newIndex);
  console.log('[refreshThemeIndex] ✅ 索引刷新完成');
}

// ============================================================
// 生成索引（扫描目录）
// ============================================================

export async function generateThemeIndex(): Promise<ThemeIndex> {
  const storage = getPrivateStorage();
  const presets: ThemeIndexItem[] = [];
  const custom: ThemeIndexItem[] = [];

  // ---------- 1. 扫描预设主题 ----------
  const presetPrefix = 'themes/presets';
  let allKeys: string[] = [];
  try {
    allKeys = await storage.list(presetPrefix);
  } catch (error) {
    console.error('[generateThemeIndex] 扫描预设主题失败:', error);
    allKeys = [];
  }

  const categories = new Set<string>();
  for (const key of allKeys) {
    const parts = key.split('/');
    if (parts.length >= 3) categories.add(parts[2]);
  }
  for (const category of categories) {
    const catPrefix = `${presetPrefix}/${category}`;
    let catKeys: string[] = [];
    try {
      catKeys = await storage.list(catPrefix);
    } catch {
      continue;
    }
    const subdirs = new Set<string>();
    for (const key of catKeys) {
      const parts = key.split('/');
      if (parts.length === 4) subdirs.add(parts[3]);
    }
    for (const subdir of subdirs) {
      const themeJsonPath = `${catPrefix}/${subdir}/theme.json`;
      try {
        const content = await storage.read(themeJsonPath, 'utf8');
        const themeData = JSON.parse(content as string);
        const colors = themeData.cssVars?.light || themeData.colors || {};
        const primaryColor = colors['--primary'] || colors['primary'] || '#3b82f6';
        const displayName = themeData.name || subdir;
        let previewImage: string | null = null;
        const imgExtensions = ['webp', 'png', 'jpg', 'jpeg', 'gif'];
        for (const ext of imgExtensions) {
          const imgKey = `${catPrefix}/${subdir}/${subdir}.${ext}`;
          try {
            await storage.read(imgKey, 'utf8');
            previewImage = imgKey;
            break;
          } catch {
            // continue
          }
        }
        presets.push({
          id: `${category}_${subdir}`,
          type: 'builtin',
          category,
          name: subdir,
          displayName,
          previewImage,
          primaryColor,
          globalThemePath: `${catPrefix}/${subdir}/theme.json`,
          pageThemePath: `${catPrefix}/${subdir}/page-theme.json`,
        });
      } catch (err) {
        console.error(`读取预设主题失败 ${themeJsonPath}:`, err);
      }
    }
  }

  // ---------- 2. 扫描自定义主题 ----------
  const customPrefix = 'themes/custom';
  try {
    const customKeys = await storage.list(customPrefix);
    const dirSet = new Set<string>();
    for (const key of customKeys) {
      const parts = key.split('/');
      if (parts.length >= 3) {
        const dir = parts.slice(0, 3).join('/');
        dirSet.add(dir);
      }
    }
    for (const dir of dirSet) {
      const name = dir.split('/').pop() || '';
      const themeJsonPath = `${dir}/theme.json`;
      try {
        const content = await storage.read(themeJsonPath, 'utf8');
        const themeData = JSON.parse(content as string);
        const displayName = themeData.displayName || name;
        let previewImage: string | null = null;
        const imgExtensions = ['webp', 'png', 'jpg', 'jpeg', 'gif'];
        for (const ext of imgExtensions) {
          const imgKey = `${dir}/preview.${ext}`;
          try {
            await storage.read(imgKey, 'utf8');
            previewImage = imgKey;
            break;
          } catch {
            // continue
          }
        }
        if (!previewImage) {
          for (const ext of imgExtensions) {
            const imgKey = `${dir}/${name}.${ext}`;
            try {
              await storage.read(imgKey, 'utf8');
              previewImage = imgKey;
              break;
            } catch {
              // ignore
            }
          }
        }
        custom.push({
          id: name,
          type: 'custom',
          category: '自定义',
          name,
          displayName,
          previewImage,
          primaryColor: CATEGORY_COLORS['自定义'],
          globalThemePath: `${dir}/theme.json`,
          pageThemePath: `${dir}/page-theme.json`,
        });
      } catch (err) {
        console.error(`解析自定义主题失败: ${dir}`, err);
      }
    }
  } catch (err) {
    console.error('扫描自定义主题失败:', err);
  }

  // ---------- 3. 读取 activeTheme ----------
  let activeTheme = '';
  try {
    const activeContent = await storage.read(ACTIVE_THEME_KEY, 'utf8');
    const activeData = JSON.parse(activeContent as string);
    if (activeData.id) {
      activeTheme = activeData.id;
    } else if (activeData.name) {
      activeTheme = activeData.name;
    }
  } catch {
    try {
      const existing = await readThemeIndex();
      if (existing) activeTheme = existing.activeTheme || '';
    } catch {
      // ignore
    }
  }

  return {
    themes: [...presets, ...custom],
    activeTheme,
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================
// readActiveTheme（5 分钟缓存）
// ============================================================

let activeThemeCache: { data: ThemeIndexItem | null; timestamp: number } | null = null;
const ACTIVE_THEME_CACHE_TTL = 5 * 60 * 1000;

export async function readActiveTheme(): Promise<ThemeIndexItem | null> {
  if (activeThemeCache && Date.now() - activeThemeCache.timestamp < ACTIVE_THEME_CACHE_TTL) {
    return activeThemeCache.data;
  }

  const storage = getPrivateStorage();
  try {
    const content = await storage.read(ACTIVE_THEME_KEY, 'utf8');
    const data = JSON.parse(content as string);

    if (data.globalThemePath && data.id) {
      const result = data as ThemeIndexItem;
      activeThemeCache = { data: result, timestamp: Date.now() };
      return result;
    }

    console.warn('[readActiveTheme] active-theme.json 格式无效，返回 null');
    activeThemeCache = { data: null, timestamp: Date.now() };
    return null;
  } catch {
    console.warn('[readActiveTheme] active-theme.json 不存在，返回 null');
    activeThemeCache = { data: null, timestamp: Date.now() };
    return null;
  }
}

// ============================================================
// 主题项查询
// ============================================================

export async function getThemeById(themeId: string): Promise<ThemeIndexItem | null> {
  const index = await getThemeIndex();
  return index.themes.find((t: ThemeIndexItem) => t.id === themeId) || null;
}

export async function getActiveThemeItem(): Promise<ThemeIndexItem | null> {
  const index = await getThemeIndex();
  if (!index.activeTheme) return null;
  return index.themes.find((t: ThemeIndexItem) => t.id === index.activeTheme) || null;
}

export async function setActiveThemeId(themeId: string): Promise<void> {
  const index = await getThemeIndex(true);
  index.activeTheme = themeId;
  index.updatedAt = new Date().toISOString();
  await writeThemeIndex(index);

  const themeItem = index.themes.find(t => t.id === themeId);
  if (themeItem) {
    await writeActiveTheme(themeItem);
  }

  await refreshActiveThemeCache();
}

export async function getBuiltinThemes(): Promise<ThemeIndexItem[]> {
  const index = await getThemeIndex();
  return index.themes.filter((t: ThemeIndexItem) => t.type === 'builtin');
}

// ============================================================
// 主题文件读写
// ============================================================

export async function writeThemeFile(path: string, data: any): Promise<void> {
  const storage = getPrivateStorage();
  await storage.write(path, JSON.stringify(data, null, 2), {
    contentType: 'application/json',
  });
  clearFileCache(path);
}

export async function readGlobalTheme(themeItem: ThemeIndexItem): Promise<any> {
  return readThemeFile(themeItem.globalThemePath);
}

export async function readPageTheme(themeItem: ThemeIndexItem): Promise<any> {
  const data = await readThemeFile(themeItem.pageThemePath);
  return data || { pages: [] };
}

export async function writeGlobalTheme(themeItem: ThemeIndexItem, data: any): Promise<void> {
  const storage = getPrivateStorage();
  await storage.write(themeItem.globalThemePath, JSON.stringify(data, null, 2), {
    contentType: 'application/json',
  });
  // ✅ 主动填充缓存（避免下次读取慢）
  fileCache.set(themeItem.globalThemePath, { data, timestamp: Date.now() });

  // ✅ 主题数据变了，清 CSS 缓存
  invalidateThemeCss(themeItem.id);
}

export async function writePageTheme(themeItem: ThemeIndexItem, data: any): Promise<void> {
  const storage = getPrivateStorage();
  await storage.write(themeItem.pageThemePath, JSON.stringify(data, null, 2), {
    contentType: 'application/json',
  });
  // ✅ 主动填充缓存（避免下次读取慢）
  fileCache.set(themeItem.pageThemePath, { data, timestamp: Date.now() });
}

// ============================================================
// active-theme.json 管理
// ============================================================

export async function writeActiveTheme(themeItem: ThemeIndexItem): Promise<void> {
  const storage = getPrivateStorage();
  const data = {
    id: themeItem.id,
    type: themeItem.type,
    category: themeItem.category,
    name: themeItem.name,
    displayName: themeItem.displayName,
    previewImage: themeItem.previewImage,
    primaryColor: themeItem.primaryColor,
    globalThemePath: themeItem.globalThemePath,
    pageThemePath: themeItem.pageThemePath,
  };
  await storage.write(ACTIVE_THEME_KEY, JSON.stringify(data, null, 2), {
    contentType: 'application/json',
  });
  await refreshActiveThemeCache();
}

export async function refreshActiveThemeCache(): Promise<void> {
  activeThemeCache = null;
  clearFileCache(ACTIVE_THEME_KEY);
}

// ============================================================
// 工具函数
// ============================================================

export function mergeThemes(global: any, page: any): any {
  if (!page || Object.keys(page).length === 0) {
    return JSON.parse(JSON.stringify(global || {}));
  }

  if (!global) {
    return JSON.parse(JSON.stringify(page));
  }

  const result = JSON.parse(JSON.stringify(global));

  for (const key of Object.keys(page)) {
    const pageValue = page[key];
    if (pageValue === undefined) continue;

    const globalValue = result[key];

    if (
      pageValue && typeof pageValue === 'object' && !Array.isArray(pageValue) &&
      globalValue && typeof globalValue === 'object' && !Array.isArray(globalValue)
    ) {
      result[key] = mergeThemes(globalValue, pageValue);
    } else {
      result[key] = JSON.parse(JSON.stringify(pageValue));
    }
  }

  return result;
}

export function computeDiff(base: any, target: any): any {
  if (!target || Object.keys(target).length === 0) return {};
  if (!base) return JSON.parse(JSON.stringify(target));

  const diff: any = {};

  for (const key of Object.keys(target)) {
    const baseValue = base[key];
    const targetValue = target[key];

    if (targetValue === null || targetValue === undefined) {
      continue;
    }

    if (
      baseValue && typeof baseValue === 'object' && !Array.isArray(baseValue) &&
      targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)
    ) {
      const nestedDiff = computeDiff(baseValue, targetValue);
      if (Object.keys(nestedDiff).length > 0) {
        diff[key] = nestedDiff;
      }
    } else {
      if (targetValue !== baseValue) {
        diff[key] = JSON.parse(JSON.stringify(targetValue));
      }
    }
  }

  return diff;
}

export function flattenThemeToCss({ colors }: { colors: Record<string, string> }): string {
  if (!colors || typeof colors !== 'object') return '';
  return Object.entries(colors)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `--${key}: ${value};`)
    .join('\n');
}

export async function readActiveThemeLegacy(): Promise<any> {
  const storage = getPrivateStorage();
  try {
    const content = await storage.read(ACTIVE_THEME_KEY, 'utf8');
    const data = JSON.parse(content as string);
    if (data.colors !== undefined) {
      return data;
    }
    const meta = await readActiveTheme();
    if (meta) {
      const globalTheme = await readGlobalTheme(meta);
      return {
        name: meta.id,
        colors: globalTheme.colors || {},
        darkColors: globalTheme.darkColors || {},
        darkMode: globalTheme.darkMode || 'system',
      };
    }
    return { name: 'default', colors: {}, darkColors: {}, darkMode: 'system' };
  } catch {
    return { name: 'default', colors: {}, darkColors: {}, darkMode: 'system' };
  }
}

export async function getPageThemeForPath(pathname: string) {
  const storage = getPrivateStorage();
  try {
    const content = await storage.read('themes/page-themes.json', 'utf8');
    const data = JSON.parse(content as string);
    const pages = data.pages || [];

    const exactMatch = pages.find((p: any) => p.pagePath === pathname);
    if (exactMatch) {
      return exactMatch.theme || null;
    }

    const wildcardPages = pages
      .filter((p: any) => p.pagePath.includes('*'))
      .sort((a: any, b: any) => b.pagePath.length - a.pagePath.length);

    for (const p of wildcardPages) {
      const pattern = p.pagePath.replace('*', '');
      if (pathname.startsWith(pattern)) {
        return p.theme || null;
      }
    }

    return null;
  } catch {
    return null;
  }
}