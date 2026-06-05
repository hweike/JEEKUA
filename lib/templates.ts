// lib/templates/index.ts
import { getPrivateStorage } from '@/lib/storage/factory';

// 私有桶中的基础前缀
const STORAGE_PREFIX = 'data/templates';

/**
 * 获取指定类型的模板（异步）
 * @param type 模板类型：'series' | 'product' | 'subproduct'
 * @param templateName 模板名称，默认为 'default'
 * @returns 模板配置对象
 */
export async function getPageTemplate(type: 'series' | 'product' | 'subproduct', templateName: string = 'default') {
  const storage = getPrivateStorage();
  const key = `${STORAGE_PREFIX}/${type}/${templateName}.json`;
  try {
    const content = await storage.read(key, 'utf8');
    return JSON.parse(content as string);
  } catch (error: any) {
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      console.warn(`Template not found: ${key}, using default`);
      return getDefaultTemplate(type);
    }
    console.error(`读取模板失败: ${key}`, error);
    return getDefaultTemplate(type);
  }
}

/**
 * 默认模板（当用户未配置时使用）
 */
function getDefaultTemplate(type: string) {
  if (type === 'series') {
    return [
      { type: 'seriesHero', content: { showName: true, showDescription: true, showFeatures: true } },
      { type: 'productTable', content: { folded: true, showSpecs: true } },
    ];
  }
  if (type === 'product') {
    return [
      { type: 'productHero', content: { showName: true, showDescription: true, showFeatures: true } },
      { type: 'productTable', content: { folded: true, showSpecs: true } },
    ];
  }
  return [];
}