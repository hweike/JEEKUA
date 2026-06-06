// lib/SiteHeadersFooters/storage.ts
import { getPrivateStorage } from '@/lib/storage/factory';

type ConfigType = 'header' | 'footer';

// 私有桶中的基础路径（对应原 data/SiteHeadersFooters，去掉了 data/ 前缀）
const STORAGE_PREFIX = 'SiteHeadersFooters';

function getConfigKey(type: ConfigType, locale: string): string {
  return `${STORAGE_PREFIX}/${type}/${locale}.json`;
}

/**
 * 获取指定语言和类型的配置
 * @returns 配置对象，如果文件不存在则返回 null
 */
export async function getConfig(type: ConfigType, locale: string): Promise<any> {
  const storage = getPrivateStorage();
  const key = getConfigKey(type, locale);
  try {
    const content = await storage.read(key, 'utf8');
    return JSON.parse(content as string);
  } catch (error: any) {
    // 兼容各种错误表示：AWS SDK 的 Code（大写）、code（小写）、httpStatusCode 404
    const isNotFound =
      error?.Code === 'NoSuchKey' ||
      error?.code === 'NoSuchKey' ||
      error?.$metadata?.httpStatusCode === 404 ||
      error?.message?.includes('File not found') ||
      error?.message?.includes('NoSuchKey');
    if (isNotFound) {
      return null;
    }
    // 其他错误继续抛出，让上层处理
    throw error;
  }
}

/**
 * 保存指定语言和类型的配置
 */
export async function saveConfig(type: ConfigType, locale: string, config: any): Promise<void> {
  const storage = getPrivateStorage();
  const key = getConfigKey(type, locale);
  await storage.write(key, JSON.stringify(config, null, 2), {
    contentType: 'application/json',
  });
}

/**
 * 初始化配置：从样本文件复制到目标语言文件
 * 样本文件路径：SiteHeadersFooters/samples/{type}_sample.json
 */
export async function initConfig(type: ConfigType, locale: string): Promise<void> {
  const storage = getPrivateStorage();
  const sampleKey = `${STORAGE_PREFIX}/samples/${type}_sample.json`;
  const targetKey = getConfigKey(type, locale);
  try {
    const sampleContent = await storage.read(sampleKey, 'utf8');
    await storage.write(targetKey, sampleContent, { contentType: 'application/json' });
  } catch (error: any) {
    const isNotFound =
      error?.Code === 'NoSuchKey' ||
      error?.code === 'NoSuchKey' ||
      error?.$metadata?.httpStatusCode === 404;
    if (isNotFound) {
      throw new Error(`样本文件不存在: ${sampleKey}`);
    }
    throw error;
  }
}

/**
 * 获取可用菜单列表（读取 menu/{locale}.json）
 */
export async function getAvailableMenus(locale: string): Promise<{ id: string; name: string; level?: number; parentId?: string }[]> {
  const storage = getPrivateStorage();
  const key = `menu/${locale}.json`;
  let data: any[] = [];
  try {
    const content = await storage.read(key, 'utf8');
    data = JSON.parse(content as string);
  } catch (error: any) {
    const isNotFound =
      error?.Code === 'NoSuchKey' ||
      error?.code === 'NoSuchKey' ||
      error?.$metadata?.httpStatusCode === 404 ||
      error?.message?.includes('File not found');
    if (isNotFound) {
      return [];
    }
    throw error;
  }

  const flatMenus: any[] = [];
  function flatten(items: any[], parentId: string = '', level: number = 0) {
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