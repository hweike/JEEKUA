// lib/webbuilder/collection-helpers.ts
import { getAllCategories } from '@/lib/products/categories';
import { getProductsByCategory, getProductsByCategoryAndSeries } from '@/lib/products/indexDb';
import { getProductUrlPattern } from '@/lib/products/productSettings';

export interface CollectionRuntimeData {
  entityType: 'collection';
  collection: any;
  products: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  collectionId: string;
  urlPattern: string;
  locale: string;
  seriesId: string | null;
}

/**
 * 获取分类运行时数据（产品列表、分类信息等）
 * 支持分页，每页 pageSize 个产品
 */
export async function fetchCollectionRuntime(
  locale: string,
  slug: string,
  page: number = 1,
  pageSize: number = 15
): Promise<CollectionRuntimeData | null> {
  const { categories } = await getAllCategories(locale);

  // 查找一级分类
  let category = categories.find((c: any) => c.slug === slug);
  let seriesId: string | null = null;
  let parentCategory = null;

  if (!category) {
    // 查找二级分类（系列）
    for (const cat of categories) {
      const foundSeries = cat.series?.find((s: any) => s.slug === slug);
      if (foundSeries) {
        seriesId = foundSeries.id;
        parentCategory = cat;
        break;
      }
    }
    if (!parentCategory) return null;
    category = parentCategory;
  }

  const urlPattern = await getProductUrlPattern(locale);

  // 根据是否有 seriesId 选择查询函数，并传入分页参数
  let productsResult;
  if (seriesId) {
    productsResult = await getProductsByCategoryAndSeries(
      locale,
      category.id,
      seriesId,
      page,
      pageSize
    );
  } else {
    productsResult = await getProductsByCategory(
      locale,
      category.id,
      page,
      pageSize
    );
  }

  // 安全序列化（确保可序列化）
  const safeCategory = JSON.parse(JSON.stringify(category));
  const safeProducts = JSON.parse(JSON.stringify(productsResult.items));

  const total = productsResult.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    entityType: 'collection',
    collection: safeCategory,
    products: safeProducts,
    total,
    page,
    pageSize,
    totalPages,
    collectionId: safeCategory.id,
    urlPattern,
    locale,
    seriesId,
  };
}