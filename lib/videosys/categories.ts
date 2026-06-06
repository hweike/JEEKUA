// lib/videosys/categories.ts
import { getPrivateStorage } from '@/lib/storage/factory';
import { CategoriesMap, Category } from './types';

function getCategoriesKey(locale: string): string {
  // 确保 key 不带 data/ 前缀，与其他模块一致
  return `videosys/${locale}/categories.json`;
}

export async function getCategories(locale: string): Promise<CategoriesMap> {
  const storage = getPrivateStorage();
  const key = getCategoriesKey(locale);
  try {
    const content = await storage.read(key, 'utf8');
    return JSON.parse(content as string);
  } catch (error: any) {
    // 捕获 AWS S3 风格的 NoSuchKey 错误以及原生 ENOENT
    if (error?.code === 'NoSuchKey' || error?.Code === 'NoSuchKey' || error?.message?.includes('File not found')) {
      return {}; // 文件不存在，返回空对象
    }
    // 其他错误继续抛出
    throw error;
  }
}

// saveCategories 保持不变
export async function saveCategories(locale: string, categories: CategoriesMap): Promise<void> {
  const storage = getPrivateStorage();
  const key = getCategoriesKey(locale);
  await storage.write(key, JSON.stringify(categories, null, 2), {
    contentType: 'application/json',
  });
}

export async function getCategory(key: string, locale: string): Promise<Category | null> {
  const categories = await getCategories(locale);
  return categories[key] || null;
}