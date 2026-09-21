// lib/seo/utils/catalog-data.ts
import { readFullData } from '@/lib/products/utils/helpers';
import {
  getProductsByCategoryAndSeries,
  getProductBySlug,
} from '@/lib/products/indexDb';
import { readProduct } from '@/lib/products/mdParser';
import { supabase } from '@/lib/supabase/client';
import { unstable_cache } from 'next/cache';

// ---------- 本地类型定义 ----------
interface ProductLine {
  id: string;
  name: string;
  slug: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  templateId?: string;
  order?: number;
  [key: string]: any;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  productLineId?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  order?: number;
  series?: any[];
  [key: string]: any;
}

// ---------- 内存缓存 ----------
const cache = new Map<string, { data: { productLines: ProductLine[]; categories: Category[] }; timestamp: number }>();
const CACHE_TTL = 3600 * 1000;

// ============================================================================
// getFullCatalogData - 读取完整目录数据（已预排序，不再执行排序）
// ============================================================================
export async function getFullCatalogData(locale: string): Promise<{
  productLines: ProductLine[];
  categories: Category[];
}> {
  const cacheKey = `full_catalog_${locale}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // 直接读取已排序的数据（writeFullData 已预排序）
  const full = await readFullData(locale);

  const data = {
    productLines: full.productLines || [],
    categories: full.categories || [],
  };

  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}

// ============================================================================
// 产品线页面数据
// ============================================================================
export async function getProductLinePageData(
  locale: string,
  slug: string
): Promise<{
  productLine: ProductLine;
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    description?: string;
    image?: string;
    seoTitle?: string;
    seoDescription?: string;
  }>;
} | null> {
  const { productLines, categories } = await getFullCatalogData(locale);

  const productLine = productLines.find((pl) => pl.slug === slug);
  if (!productLine) return null;

  let categoryList: any[] = [];

  const topLevel = categories.filter((cat) => cat.productLineId === productLine.id);
  if (topLevel.length > 0) {
    categoryList = topLevel.sort((a, b) => (a.order || 0) - (b.order || 0));
  } else {
    const allSeries: any[] = [];
    for (const cat of categories) {
      if (cat.productLineId === productLine.id && cat.series && cat.series.length) {
        for (const series of cat.series) {
          allSeries.push({
            id: series.id,
            name: series.name,
            slug: series.slug,
            description: series.description,
            image: series.image,
            seoTitle: series.seoTitle,
            seoDescription: series.seoDescription,
            order: series.order ?? 0,
          });
        }
      }
    }
    allSeries.sort((a, b) => a.order - b.order);
    categoryList = allSeries;
  }

  const limitedCategories = categoryList.slice(0, 15).map((item) => ({
    id: item.id,
    name: item.name,
    slug: item.slug,
    description: item.description,
    image: item.image,
    seoTitle: item.seoTitle,
    seoDescription: item.seoDescription,
  }));

  return {
    productLine,
    categories: limitedCategories,
  };
}

// ============================================================================
// 分类查询
// ============================================================================
export async function findCategoryBySlug(
  locale: string,
  slug: string
): Promise<{
  category: Category;
  productLine: ProductLine;
} | null> {
  const { productLines, categories } = await getFullCatalogData(locale);
  const category = categories.find((cat) => cat.slug === slug);
  if (!category) return null;

  const productLine = productLines.find((pl) => pl.id === category.productLineId);
  if (!productLine) return null;

  return { category, productLine };
}

export async function getAllProductLineSlugs(locale: string): Promise<string[]> {
  const { productLines } = await getFullCatalogData(locale);
  return productLines.map((pl) => pl.slug);
}

// ============================================================================
// 分类页数据（含分页产品列表）
// ============================================================================
export async function getCategoryPageData(
  locale: string,
  slug: string,
  options?: { page?: number; pageSize?: number }
): Promise<{
  category: Category;
  productLine: ProductLine;
  products: any[];
  totalProducts: number;
} | null> {
  const { productLines, categories } = await getFullCatalogData(locale);

  let category = categories.find((cat) => cat.slug === slug);
  let productLine: ProductLine | null = null;
  let seriesId: string | null = null;

  if (category) {
    productLine = productLines.find((pl) => pl.id === category.productLineId) || null;
    if (!productLine) return null;
  } else {
    for (const cat of categories) {
      const foundSeries = cat.series?.find((s: any) => s.slug === slug);
      if (foundSeries) {
        category = {
          ...cat,
          id: cat.id,
          name: foundSeries.name,
          slug: foundSeries.slug,
          description: foundSeries.description || cat.description,
          image: foundSeries.image || cat.image,
          seoTitle: foundSeries.seoTitle || cat.seoTitle,
          seoDescription: foundSeries.seoDescription || cat.seoDescription,
          seoKeywords: foundSeries.seoKeywords || cat.seoKeywords,
        };
        productLine = productLines.find((pl) => pl.id === cat.productLineId) || null;
        seriesId = foundSeries.id;
        break;
      }
    }
    if (!category || !productLine) return null;
  }

  // 类型收窄：确保 category 和 productLine 存在
  if (!category || !productLine) return null;

  const page = options?.page || 1;
  const pageSize = options?.pageSize || 20;
  const result = await getProductsByCategoryAndSeries(
    locale,
    category.id,  // 此时安全
    seriesId,
    page,
    pageSize
  );

  return {
    category,
    productLine,
    products: result.items || [],
    totalProducts: result.total || 0,
  };
}

export async function getAllCategorySlugs(locale: string): Promise<string[]> {
  const { categories } = await getFullCatalogData(locale);
  return categories.map((cat) => cat.slug);
}

// ============================================================================
// 产品详情页数据（核心，并行优化）
// ============================================================================
export async function getProductPageData(
  locale: string,
  slug: string
): Promise<{
  product: any;
  productLine: ProductLine;
  category: Category;
  series?: any;
} | null> {
  const [productIndex, { productLines, categories }] = await Promise.all([
    getProductBySlug(locale, slug),
    getFullCatalogData(locale),
  ]);

  if (!productIndex) return null;

  const productLine = productLines.find(pl => pl.id === productIndex.productLineId);
  if (!productLine) return null;

  const category = categories.find(cat => cat.id === productIndex.categoryId);
  if (!category) return null;

  let series: any;
  if (productIndex.seriesId && category.series) {
    series = category.series.find((s: any) => s.id === productIndex.seriesId);
  }

  let mdData: any = {};
  try {
    mdData = await readProduct(locale, productIndex.productId);
  } catch {
    // 忽略读取失败，仅使用索引数据
  }

  const product: any = {
    ...productIndex,
    description: mdData.description || '',
    short_description: mdData.short_description || '',
    spec_text: mdData.spec_text || '',
    content: mdData.content || '',
    variants: mdData.variants || [],
    ...mdData,
  };

  return {
    product,
    productLine,
    category,
    series,
  };
}

// ============================================================================
// 清除目录缓存
// ============================================================================
export function clearCatalogCache(locale?: string): void {
  if (locale) {
    cache.delete(`full_catalog_${locale}`);
  } else {
    cache.clear();
  }
}

// ============================================================================
// 获取所有产品 slug（用于 generateStaticParams）
// ============================================================================
export async function getAllProductSlugs(locale: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('products')
    .select('slug')
    .eq('site_id', process.env.NEXT_PUBLIC_SITE_ID || '000001')
    .eq('locale', locale)
    .is('parent_product_id', null);
  if (error) {
    console.error(`[getAllProductSlugs] 查询失败: ${error.message}`);
    return [];
  }
  return data?.map((row: { slug: string }) => row.slug).filter(Boolean) || [];
}

// ============================================================================
// 缓存版本的产品详情页数据（unstable_cache 包装，用于 ISR/SSR）
// ============================================================================
export const getCachedProductPageData = unstable_cache(
  async (locale: string, slug: string) => {
    return getProductPageData(locale, slug);
  },
  ['product-page-data'],
  { revalidate: 3600, tags: ['product'] }
);