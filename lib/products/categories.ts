// lib/products/categories.ts
import { getPrivateStorage } from '@/lib/storage/factory';

// 规范化产品线对象，确保包含 templateId
function normalizeProductLine(raw: any) {
  return {
    id: String(raw.id || ''),
    name: String(raw.name || ''),
    order: typeof raw.order === 'number' ? raw.order : 0,
    templateId: String(raw.templateId || ''),   // 关键：关联的 WebBuilder 模板 ID
  };
}

/**
 * 获取分类 JSON 文件在私有桶中的 Key
 */
function getCategoriesKey(locale: string): string {
  return `data/products/${locale}/categories.json`;
}

/**
 * 读取分类 JSON 文件（从私有桶）
 */
async function readCategoriesFile(locale: string): Promise<any> {
  const storage = getPrivateStorage();
  const key = getCategoriesKey(locale);
  try {
    const content = await storage.read(key, 'utf8');
    return JSON.parse(content as string);
  } catch (error: any) {
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      // 文件不存在时返回空数据结构
      return { productLines: [], categories: [] };
    }
    throw error;
  }
}

/** 获取分类详情（根据 slug） */
export async function getCategoryBySlug(locale: string, slug: string) {
  console.log('[getCategoryBySlug] locale:', locale, 'slug:', slug);
  try {
    const data = await readCategoriesFile(locale);
    const categories = data.categories || [];
    const category = categories.find((c: any) => c.slug === slug);
    console.log('[getCategoryBySlug] found:', category);
    if (!category) return null;
    // 确保返回的对象始终包含 id
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      image: category.image || '',
      seoTitle: category.seoTitle || '',
      seoDescription: category.seoDescription || '',
      seoKeywords: category.seoKeywords || '',
    };
  } catch (err) {
    console.error('[getCategoryBySlug] error:', err);
    return null;
  }
}

/** 获取所有分类（用于分类树），并规范化产品线数据 */
export async function getAllCategories(locale: string) {
  try {
    const data = await readCategoriesFile(locale);
    const productLines = (data.productLines || []).map(normalizeProductLine);
    // 按 order 排序
    productLines.sort((a, b) => a.order - b.order);
    return {
      productLines,
      categories: data.categories || [],
    };
  } catch (err) {
    // 文件不存在或读取失败时降级处理，返回空数据，避免页面崩溃
    console.warn(`[getAllCategories] Failed to load categories for locale ${locale}:`, (err as Error).message);
    return { productLines: [], categories: [] };
  }
}

/** 获取第一个分类（用于重定向） */
export async function getFirstCategory(locale: string) {
  const { categories } = await getAllCategories(locale);
  if (categories.length === 0) return null;
  return categories.sort((a: any, b: any) => a.order - b.order)[0];
}