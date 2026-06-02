import fs from 'fs';
import path from 'path';

const BASE_DIR = path.join(process.cwd(), 'data', 'SiteHeadersFooters');
const HEADER_DIR = path.join(BASE_DIR, 'header');
const FOOTER_DIR = path.join(BASE_DIR, 'footer');
const SAMPLES_DIR = path.join(BASE_DIR, 'samples');

// 确保目录存在
[HEADER_DIR, FOOTER_DIR, SAMPLES_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

type ConfigType = 'header' | 'footer';

/**
 * 获取指定语言和类型的配置
 */
export async function getConfig(type: ConfigType, locale: string): Promise<any> {
  const dir = type === 'header' ? HEADER_DIR : FOOTER_DIR;
  const filePath = path.join(dir, `${locale}.json`);
  if (!fs.existsSync(filePath)) {
    return null; // ✅ 关键修改：没有文件时返回 null
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * 保存指定语言和类型的配置
 */
export async function saveConfig(type: ConfigType, locale: string, config: any): Promise<void> {
  const dir = type === 'header' ? HEADER_DIR : FOOTER_DIR;
  const filePath = path.join(dir, `${locale}.json`);
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * 初始化配置：从样本文件复制到目标语言文件
 */
export async function initConfig(type: ConfigType, locale: string): Promise<void> {
  const samplePath = path.join(SAMPLES_DIR, `${type}_sample.json`);
  if (!fs.existsSync(samplePath)) {
    throw new Error(`样本文件不存在: ${samplePath}`);
  }
  const sample = JSON.parse(fs.readFileSync(samplePath, 'utf-8'));
  await saveConfig(type, locale, sample);
}

/**
 * 获取可用菜单列表（调用现有 API 或直接读取菜单文件）
 * 注意：这里为了保持独立，我们通过 fetch 调用内部 API，但 Node.js 环境需要处理。
 * 更稳妥的方式是直接读取菜单数据文件，假设菜单存储在 data/menu/{locale}.json
 */
export async function getAvailableMenus(locale: string): Promise<{ id: string; name: string; level?: number; parentId?: string }[]> {
  const menuFilePath = path.join(process.cwd(), 'data', 'menu', `${locale}.json`);
  if (!fs.existsSync(menuFilePath)) return [];
  const data = JSON.parse(fs.readFileSync(menuFilePath, 'utf-8'));
  // 假设菜单结构为扁平列表或树形，这里返回所有菜单项（带层级）
  const flatMenus: any[] = [];
  function flatten(items: any[], parentId = '', level = 0) {
    for (const item of items) {
      flatMenus.push({
        id: item.id,
        name: '　'.repeat(level) + item.name,
        level,
        parentId,
      });
      if (item.children) flatten(item.children, item.id, level + 1);
    }
  }
  flatten(data);
  return flatMenus;
}