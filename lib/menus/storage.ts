// lib/menus/storage.ts
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data', 'menus');

/**
 * 确保目录存在
 */
async function ensureDir(dir: string) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

/**
 * 读取某个菜单 JSON 文件
 * @param locale 语言 zh/en
 * @param menuType navigation | footer | custom_menus
 */
export async function readMenuFile(locale: string, menuType: string): Promise<any> {
  const filePath = path.join(DATA_DIR, locale, `${menuType}.json`);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content);
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
    console.error(`[readMenuFile] 错误路径: ${filePath}`);
    console.error(`[readMenuFile] 错误码: ${error.code}`);
    console.error(`[readMenuFile] 错误消息: ${error.message}`);
    console.error(`[readMenuFile] 完整错误:`, error);
    if (error.code === 'ENOENT') {
      // 文件不存在，返回默认结构
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
  const dir = path.join(DATA_DIR, locale);
  await ensureDir(dir);
  const filePath = path.join(dir, `${menuType}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * 获取所有语言列表（基于 data/menus 下的子目录）
 */
export async function getAvailableLocales(): Promise<string[]> {
  try {
    const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
    return entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
  } catch {
    return ['zh', 'en'];
  }
}