// lib/videosys/categories.ts
import { getPrivateStorage } from '@/lib/storage/factory';
import { CategoriesMap, Category } from './types';

/**
 * 获取分类 JSON 文件在私有桶中的存储 Key
 */
function getCategoriesKey(locale: string): string {
  return `data/videosys/${locale}/categories.json`;
}

/**
 * 获取所有分类（从私有桶读取）
 */
export async function getCategories(locale: string): Promise<CategoriesMap> {
  const storage = getPrivateStorage();
  const key = getCategoriesKey(locale);
  try {
    const content = await storage.read(key, 'utf8');
    return JSON.parse(content as string);
  } catch (error: any) {
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      return {};
    }
    throw error;
  }
}

/**
 * 保存所有分类到私有桶
 */
export async function saveCategories(locale: string, categories: CategoriesMap): Promise<void> {
  const storage = getPrivateStorage();
  const key = getCategoriesKey(locale);
  await storage.write(key, JSON.stringify(categories, null, 2), {
    contentType: 'application/json',
  });
}

/**
 * 根据 key 获取单个分类
 */
export async function getCategory(key: string, locale: string): Promise<Category | null> {
  const categories = await getCategories(locale);
  return categories[key] || null;
}