// lib/menus/storage.ts
import { getPrivateStorage } from '@/lib/storage/factory';

// 私有桶中的基础路径（对应原 data/menus）
const STORAGE_PREFIX = 'data/menus';

/**
 * 获取菜单文件的存储 Key
 */
function getMenuKey(locale: string, menuType: string): string {
  return `${STORAGE_PREFIX}/${locale}/${menuType}.json`;
}

/**
 * 读取某个菜单 JSON 文件
 * @param locale 语言 zh/en
 * @param menuType navigation | footer | custom_menus
 */
export async function readMenuFile(locale: string, menuType: string): Promise<any> {
  const storage = getPrivateStorage();
  const key = getMenuKey(locale, menuType);
  try {
    const content = await storage.read(key, 'utf8');
    const parsed = JSON.parse(content as string);
    // 对于 custom_menus，确保返回数组
    if (menuType === 'custom_menus') {
      return Array.isArray(parsed) ? parsed : [];
    }
    // 对于 navigation / footer，确保有 items 字段
    if (menuType === 'navigation' || menuType === 'footer') {
      if (!parsed.items) parsed.items = [];
      if (typeof parsed.isEditable !== 'boolean') parsed.isEditable = false;
      return parsed;
    }
    return parsed;
  } catch (error: any) {
    // 文件不存在或读取失败，返回默认结构（与原逻辑一致）
    console.error(`[readMenuFile] 错误 Key: ${key}`);
    console.error(`[readMenuFile] 错误消息: ${error.message}`);
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      if (menuType === 'custom_menus') return [];
      return {
        id: menuType,
        name: menuType === 'navigation' ? '主导航' : '底部菜单',
        isEditable: false,
        items: [],
      };
    }
    // JSON 解析错误等，返回安全的默认值
    if (menuType === 'custom_menus') return [];
    return {
      id: menuType,
      name: menuType === 'navigation' ? '主导航' : '底部菜单',
      isEditable: false,
      items: [],
    };
  }
}

/**
 * 写入菜单 JSON 文件
 */
export async function writeMenuFile(locale: string, menuType: string, data: any): Promise<void> {
  const storage = getPrivateStorage();
  const key = getMenuKey(locale, menuType);
  await storage.write(key, JSON.stringify(data, null, 2), {
    contentType: 'application/json',
  });
}

/**
 * 获取所有语言列表（基于 data/menus 下的子目录）
 * 原逻辑扫描本地 data/menus 下的目录名，升级后从私有桶列出所有前缀为 data/menus/ 的 key，提取二级目录名
 */
export async function getAvailableLocales(): Promise<string[]> {
  const storage = getPrivateStorage();
  try {
    // 列出 data/menus/ 下的所有文件/目录（前缀查找）
    const keys = await storage.list(STORAGE_PREFIX);
    // 提取 locale 名：例如 data/menus/zh/navigation.json → zh
    const locales = new Set<string>();
    for (const key of keys) {
      // key 格式: data/menus/{locale}/{menuType}.json
      const parts = key.split('/');
      if (parts.length >= 3) {
        locales.add(parts[2]); // 第三部分是 locale
      }
    }
    if (locales.size === 0) {
      // 如果没有找到任何文件，返回默认语言列表（与原逻辑一致）
      return ['zh', 'en'];
    }
    return Array.from(locales).sort();
  } catch (error) {
    console.error('[getAvailableLocales] 获取失败:', error);
    return ['zh', 'en'];
  }
}