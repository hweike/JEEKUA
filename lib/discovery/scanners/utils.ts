// lib/discovery/scanners/utils.ts
import { getPrivateStorage } from '@/lib/storage/factory';

const storage = getPrivateStorage();

export function getProductsStorageKey(locale: string): string {
  return `products/${locale}/categories.json`;
}

/**
 * 从 R2 读取 JSON 文件，若文件不存在则返回默认值
 */
export async function readR2Json<T>(key: string, defaultData: T): Promise<T> {
  try {
    const content = await storage.read(key, 'utf8');
    return JSON.parse(content as string);
  } catch (error: any) {
    if (error?.code === 'NoSuchKey' || error?.Code === 'NoSuchKey' || error?.message?.includes('File not found')) {
      return defaultData;
    }
    throw error;
  }
}