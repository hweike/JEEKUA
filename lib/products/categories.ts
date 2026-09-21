// lib/products/categories.ts
import { unstable_cache } from 'next/cache';
import { getPrivateStorage } from '@/lib/storage/factory';

// ===== 类型定义 =====
export interface ProductLine {
  id: string;
  name: string;
  slug: string;
  order: number;
  templateId: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  order?: number;
}

export interface CategoriesData {
  productLines: ProductLine[];
  categories: Category[];
}

// ============================================================
// 原始数据读取（无缓存）
// ============================================================

function normalizeProductLine(raw: any): ProductLine {
  let slug = raw.slug || '';
  if (!slug && raw.name) {
    slug = raw.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  return {
    id: String(raw.id || ''),
    name: String(raw.name || ''),
    slug: slug || `productline-${Date.now()}`,
    order: typeof raw.order === 'number' ? raw.order : 0,
    templateId: String(raw.templateId || ''),
  };
}

function normalizeCategory(raw: any): Category | null {
  const id = String(raw.id || '');
  const name = String(raw.name || '');
  const slug = raw.slug || '';

  if (!slug) {
    console.warn(`[categories] 分类 "${name}" (id: ${id}) 缺少 slug 字段，已跳过`);
    return null;
  }

  return {
    id,
    name,
    slug,
    description: raw.description || '',
    image: raw.image || '',
    seoTitle: raw.seoTitle || '',
    seoDescription: raw.seoDescription || '',
    seoKeywords: raw.seoKeywords || '',
    order: typeof raw.order === 'number' ? raw.order : 0,
  };
}

function getCategoriesKey(locale: string): string {
  return `products/${locale}/categories.json`;
}

async function readCategoriesFile(locale: string): Promise<any> {
  const storage = getPrivateStorage();
  const key = getCategoriesKey(locale);
  try {
    const content = await storage.read(key, 'utf8');
    return JSON.parse(content as string);
  } catch (error: any) {
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      return { productLines: [], categories: [] };
    }
    throw error;
  }
}

// ============================================================
// 核心数据获取函数（无缓存）
// ============================================================

async function fetchAllCategoriesRaw(locale: string): Promise<CategoriesData> {
  try {
    const data = await readCategoriesFile(locale);
    const productLines = (data.productLines || []).map(normalizeProductLine);
    productLines.sort((a: ProductLine, b: ProductLine) => a.order - b.order);

    const categories = (data.categories || [])
      .map(normalizeCategory)
      .filter((c: Category | null): c is Category => c !== null);
    categories.sort((a: Category, b: Category) => (a.order || 0) - (b.order || 0));

    return { productLines, categories };
  } catch (err) {
    console.warn(`[getAllCategories] Failed to load categories for locale ${locale}:`, (err as Error).message);
    return { productLines: [], categories: [] };
  }
}

// ============================================================
// 带缓存的版本（推荐使用）
// ============================================================

/**
 * 获取所有分类（带缓存）
 * 缓存时间：10 分钟（可调整）
 * 缓存键：包含 locale 和版本号，方便手动失效
 */
export const getCachedCategories = unstable_cache(
  async (locale: string) => {
    console.log(`[getCachedCategories] 缓存未命中，重新获取: ${locale}`);
    return fetchAllCategoriesRaw(locale);
  },
  // 缓存键 - 包含版本号，方便全局失效
  ['categories-v1'],
  {
    revalidate: 600, // 10 分钟
    tags: ['categories'], // 支持 revalidateTag 手动失效
  }
);

/**
 * 获取所有分类（兼容旧接口，内部使用缓存）
 */
export async function getAllCategories(locale: string): Promise<CategoriesData> {
  return getCachedCategories(locale);
}

// ============================================================
// 其他辅助函数（同样使用缓存）
// ============================================================

/**
 * 获取分类详情（根据 slug）
 */
export async function getCategoryBySlug(locale: string, slug: string): Promise<Category | null> {
  console.log('[getCategoryBySlug] locale:', locale, 'slug:', slug);
  
  if (!slug) return null;
  
  const { categories } = await getAllCategories(locale);
  const category = categories.find((c) => c.slug === slug);
  
  console.log('[getCategoryBySlug] found:', !!category);
  return category || null;
}

/**
 * 获取第一个分类（用于重定向）
 */
export async function getFirstCategory(locale: string): Promise<Category | null> {
  const { categories } = await getAllCategories(locale);
  return categories.length > 0 ? categories[0] : null;
}

/**
 * 获取所有产品线
 */
export async function getAllProductLines(locale: string): Promise<ProductLine[]> {
  const { productLines } = await getAllCategories(locale);
  return productLines;
}

/**
 * 根据产品线 slug 获取产品线
 */
export async function getProductLineBySlug(locale: string, slug: string): Promise<ProductLine | null> {
  const { productLines } = await getAllCategories(locale);
  return productLines.find((p) => p.slug === slug) || null;
}

/**
 * 获取所有分类的 slug 列表（用于 generateStaticParams）
 */
export async function getAllCategorySlugs(locale: string): Promise<string[]> {
  const { categories } = await getAllCategories(locale);
  return categories.map((c) => c.slug);
}

/**
 * 获取所有产品线的 slug 列表（用于 generateStaticParams）
 */
export async function getAllProductLineSlugs(locale: string): Promise<string[]> {
  const { productLines } = await getAllCategories(locale);
  return productLines.map((p) => p.slug);
}

// ============================================================
// 手动缓存失效工具（用于数据更新后调用）
// ============================================================

import { revalidateTag } from 'next/cache';

/**
 * 手动刷新分类缓存（在数据更新后调用）
 */
export async function revalidateCategories(): Promise<void> {
  revalidateTag('categories');
  console.log('[revalidateCategories] 分类缓存已失效');
}

/**
 * 获取缓存状态（用于调试）
 */
export async function getCacheStatus(locale: string): Promise<{
  cached: boolean;
  timestamp: number;
}> {
  // 这个函数主要用于调试，实际实现取决于 unstable_cache 的内部机制
  // 可以配合日志查看
  return {
    cached: false, // 无法直接检测，由 unstable_cache 内部管理
    timestamp: Date.now(),
  };
}