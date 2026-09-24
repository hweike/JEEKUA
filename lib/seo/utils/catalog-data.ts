// lib/seo/utils/catalog-data.ts
import { readFullData } from '@/lib/products/utils/helpers';
import {
  getProductsByCategoryAndSeries,
  getProductBySlug,
} from '@/lib/products/indexDb';
import { readProduct } from '@/lib/products/mdParser';
import sql from '@/lib/db/admin';
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

export async function getFullCatalogData(locale: string): Promise<{
  productLines: ProductLine[];
  categories: Category[];
}> {
  const cacheKey = `full_catalog_${locale}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const full = await readFullData(locale);

  const data = {
    productLines: full.productLines || [],
    categories: full.categories || [],
  };

  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}

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

  if (!category || !productLine) return null;

  const page = options?.page || 1;
  const pageSize = options?.pageSize || 20;
  const result = await getProductsByCategoryAndSeries(
    locale,
    category.id,
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
  } catch {}

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

export function clearCatalogCache(locale?: string): void {
  if (locale) {
    cache.delete(`full_catalog_${locale}`);
  } else {
    cache.clear();
  }
}

// ✅ 已迁移：getAllProductSlugs
export async function getAllProductSlugs(locale: string): Promise<string[]> {
  try {
    const rows = await sql<{ slug: string }[]>`
      SELECT slug FROM public.products
      WHERE site_id = ${process.env.NEXT_PUBLIC_SITE_ID || '000001'}
        AND locale = ${locale}
        AND parent_product_id IS NULL
    `;
    return rows.map((row) => row.slug).filter(Boolean);
  } catch (error: any) {
    console.error(`[getAllProductSlugs] 查询失败: ${error.message}`);
    return [];
  }
}

// ============================================================
// ✅ 新增：获取所有已发布产品的 {locale, slug}
// ============================================================
let cachedAllProducts: Array<{ locale: string; slug: string }> | null = null;
let cachedAllProductsAt = 0;
const ALL_PRODUCTS_TTL = 5 * 60 * 1000;

export async function getAllPublishedProducts(): Promise<Array<{ locale: string; slug: string }>> {
  const now = Date.now();

  if (cachedAllProducts && now - cachedAllProductsAt < ALL_PRODUCTS_TTL) {
    console.log(`[getAllPublishedProducts] ✅ 命中缓存（${cachedAllProducts.length} 条）`);
    return cachedAllProducts;
  }

  console.log(`[getAllPublishedProducts] ❌ 未命中，查库中...`);
  const start = Date.now();

  try {
    const rows = await sql<{ locale: string; slug: string }[]>`
      SELECT locale, slug FROM public.products
      WHERE site_id = ${process.env.NEXT_PUBLIC_SITE_ID || '000001'}
        AND parent_product_id IS NULL
    `;

    const result = rows.filter(r => r.locale && r.slug);
    const elapsed = Date.now() - start;
    console.log(`[getAllPublishedProducts] ✅ 查库完成，${result.length} 条，耗时 ${elapsed}ms`);

    cachedAllProducts = result;
    cachedAllProductsAt = now;
    return result;
  } catch (error: any) {
    console.error(`[getAllPublishedProducts] 查询失败: ${error.message}`);
    return cachedAllProducts ?? [];
  }
}

export function clearAllPublishedProductsCache(): void {
  cachedAllProducts = null;
  cachedAllProductsAt = 0;
  console.log('[getAllPublishedProducts] 缓存已清空');
}

export const getCachedProductPageData = unstable_cache(
  async (locale: string, slug: string) => {
    return getProductPageData(locale, slug);
  },
  ['product-page-data'],
  { revalidate: 3600, tags: ['product'] }
);