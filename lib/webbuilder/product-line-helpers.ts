// lib/webbuilder/product-line-helpers.ts

import {
  getProductsByProductLine,
  getProductsByCategoryAndSeries,
  getChildrenProductsFullBatch,   // 替换原有的 getChildrenProductsFull
} from '@/lib/products/indexDb';
import { getProductUrlPattern } from '@/lib/products/productSettings';
// ✅ 替换原有 getAllCategories 导入，使用 SEO 层的缓存数据源
import { getFullCatalogData } from '@/lib/seo/utils/catalog-data';

export interface ProductLineRuntimeData {
  productLine: any;
  categoryTree: any[];
  products: any[];          // 当 includeChildren 为 true 时，每个父产品包含 children 数组；否则为扁平父产品列表
  totalCount: number;
  currentPage: number;
  pageSize: number;
  urlPattern: string;
  locale: string;
  currentSlug?: string;
  currentSeriesId?: string;
}

const DEFAULT_PAGE_SIZE = 15;

/**
 * 获取产品线运行时数据
 * @param locale 语言
 * @param productLineSlug 产品线 slug
 * @param options 选项
 * @param options.categorySlug 分类 slug（可选）
 * @param options.page 页码
 * @param options.pageSize 每页数量
 * @param options.includeChildren 是否包含子产品（变体），默认 false
 */
export async function fetchProductLineRuntime(
  locale: string,
  productLineSlug: string,
  options?: {
    categorySlug?: string;
    page?: number;
    pageSize?: number;
    includeChildren?: boolean;
  }
): Promise<ProductLineRuntimeData | null> {
  const page = options?.page || 1;
  const pageSize = options?.pageSize || DEFAULT_PAGE_SIZE;
  const includeChildren = options?.includeChildren ?? false;

  // ✅ 使用 getFullCatalogData 替代 getAllCategories，共享 SEO 层缓存
  const { productLines, categories } = await getFullCatalogData(locale);

  const productLine = productLines.find((line: any) => {
    if (line.slug) {
      return line.slug.toLowerCase() === productLineSlug.toLowerCase();
    }
    return line.name?.toLowerCase() === productLineSlug.toLowerCase();
  });
  if (!productLine) return null;

  const urlPattern = await getProductUrlPattern(locale);
  const lineCategories = categories.filter((cat: any) => cat.productLineId === productLine.id);
  const categoryTree = lineCategories.map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description || '',
    children: (cat.series || []).map((series: any) => ({
      id: series.id,
      name: series.name,
      slug: series.slug,
      description: series.description || '',
    })),
  }));

  let parentProducts: any[] = [];
  let totalCount = 0;
  let currentSlug = options?.categorySlug;
  let currentSeriesId: string | undefined = undefined;

  // 获取父产品列表（分页）
  if (options?.categorySlug) {
    let targetCategory = null;
    let seriesId = null;
    for (const cat of lineCategories) {
      if (cat.slug === options.categorySlug) {
        targetCategory = cat;
        break;
      }
      const foundSeries = cat.series?.find((s: any) => s.slug === options.categorySlug);
      if (foundSeries) {
        targetCategory = cat;
        seriesId = foundSeries.id;
        break;
      }
    }
    if (targetCategory) {
      const result = await getProductsByCategoryAndSeries(
        locale,
        targetCategory.id,
        seriesId,
        page,
        pageSize
      );
      parentProducts = result.items || [];
      totalCount = result.total || 0;
      currentSeriesId = seriesId || undefined;
    } else {
      parentProducts = [];
      totalCount = 0;
    }
  } else {
    const result = await getProductsByProductLine(locale, productLine.id, page, pageSize);
    parentProducts = result.items || [];
    totalCount = result.total || 0;
  }

  // 如果不需要子产品，直接返回扁平父产品列表
  if (!includeChildren) {
    return {
      productLine,
      categoryTree,
      products: parentProducts,
      totalCount,
      currentPage: page,
      pageSize,
      urlPattern,
      locale,
      currentSlug,
      currentSeriesId,
    };
  }

  // ===== 优化：批量获取子产品（解决 N+1 查询问题） =====
  // 使用 getChildrenProductsFullBatch 一次性获取所有子产品
  if (parentProducts.length === 0) {
    return {
      productLine,
      categoryTree,
      products: parentProducts,
      totalCount,
      currentPage: page,
      pageSize,
      urlPattern,
      locale,
      currentSlug,
      currentSeriesId,
    };
  }

  try {
    const parentIds = parentProducts.map((p) => p.productId);
    const childrenMap = await getChildrenProductsFullBatch(parentIds, locale);

    // 为每个父产品附加其子产品列表
    const productsWithChildren = parentProducts.map((parent) => ({
      ...parent,
      children: childrenMap.get(parent.productId) || [],
    }));

    return {
      productLine,
      categoryTree,
      products: productsWithChildren,
      totalCount,
      currentPage: page,
      pageSize,
      urlPattern,
      locale,
      currentSlug,
      currentSeriesId,
    };
  } catch (error) {
    console.error('[fetchProductLineRuntime] 批量获取子产品失败:', error);
    // 降级：返回不含子产品的数据，避免页面崩溃
    return {
      productLine,
      categoryTree,
      products: parentProducts,
      totalCount,
      currentPage: page,
      pageSize,
      urlPattern,
      locale,
      currentSlug,
      currentSeriesId,
    };
  }
}