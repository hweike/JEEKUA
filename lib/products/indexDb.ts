// lib/products/products.db.ts
import { supabase } from '@/lib/supabase/client';
import { LRUCache } from 'lru-cache';
import { getPrivateStorage } from '@/lib/storage/factory';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';
const categoryCache = new LRUCache<string, any>({ max: 10, ttl: 60_000 });

export interface ProductIndexItem {
  productId: string;
  locale: string;
  productLineId: string;
  categoryId: string;
  seriesId: string | null;
  parent_product_id: string | null;
  sku: string;
  product_name: string;
  brand: string;
  price_tiers: any;
  currency: string;
  availability: string;
  min_order_quantity: number;
  main_image_url: string;
  attributes: any;
  slug: string;
  status: string;
  updatedAt: string;
  createdAt: string;
  templateId?: string;
}

// 解析数据库行
function parseProductRow(row: any): ProductIndexItem {
  return {
    productId: row.productId,
    locale: row.locale,
    productLineId: row.productLineId,
    categoryId: row.categoryId,
    seriesId: row.seriesId,
    parent_product_id: row.parent_product_id,
    sku: row.sku,
    product_name: row.product_name,
    brand: row.brand,
    price_tiers: JSON.parse(row.price_tiers || '[]'),
    currency: row.currency,
    availability: row.availability,
    min_order_quantity: row.min_order_quantity,
    main_image_url: row.main_image_url,
    attributes: JSON.parse(row.attributes || '{}'),
    slug: row.slug,
    status: row.status,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
    templateId: row.templateId || '',
  };
}

// 插入或更新产品索引
export async function upsertProductIndex(item: ProductIndexItem) {
  const { error } = await supabase
    .from('products')
    .upsert({
      site_id: DEFAULT_SITE_ID,
      productId: item.productId,
      locale: item.locale,
      productLineId: item.productLineId,
      categoryId: item.categoryId,
      seriesId: item.seriesId,
      parent_product_id: item.parent_product_id,
      sku: item.sku,
      product_name: item.product_name,
      brand: item.brand,
      price_tiers: JSON.stringify(item.price_tiers),
      currency: item.currency,
      availability: item.availability,
      min_order_quantity: item.min_order_quantity,
      main_image_url: item.main_image_url,
      attributes: JSON.stringify(item.attributes),
      slug: item.slug,
      status: item.status,
      templateId: item.templateId || '',
      updatedAt: item.updatedAt,
      createdAt: item.createdAt,
    });
  if (error) throw new Error(`upsertProductIndex failed: ${error.message}`);
}

// 删除产品索引
export async function deleteProductIndex(productId: string) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('productId', productId);
  if (error) throw new Error(`deleteProductIndex failed: ${error.message}`);
}

// 获取单个产品索引
export async function getProductIndex(productId: string): Promise<ProductIndexItem | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('productId', productId)
    .maybeSingle();
  if (error) throw new Error(`getProductIndex failed: ${error.message}`);
  if (!data) return null;
  return parseProductRow(data);
}

// 获取状态计数（仅父产品）
export async function getProductStatusCount(locale: string): Promise<{ published: number; draft: number; offline: number }> {
  const { data, error } = await supabase
    .from('products')
    .select('status')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('locale', locale)
    .or('parent_product_id.is.null,parent_product_id.eq.')
    .in('status', ['published', 'draft', 'offline']);
  if (error) throw new Error(`getProductStatusCount failed: ${error.message}`);

  const counts = { published: 0, draft: 0, offline: 0 };
  (data || []).forEach((row: any) => {
    if (row.status === 'published') counts.published++;
    else if (row.status === 'draft') counts.draft++;
    else if (row.status === 'offline') counts.offline++;
  });
  return counts;
}

// 搜索产品列表（仅父产品，支持二级分类）
export async function searchProducts(
  locale: string,
  status?: string,
  keyword?: string,
  categoryId?: string,
  seriesId?: string,
  page: number = 1,
  size: number = 20
): Promise<{ items: ProductIndexItem[]; total: number }> {
  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('locale', locale)
    .or('parent_product_id.is.null,parent_product_id.eq.');

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }
  if (keyword) {
    query = query.or(`product_name.ilike.%${keyword}%,sku.ilike.%${keyword}%`);
  }
  if (categoryId) {
    query = query.eq('categoryId', categoryId);
  }
  if (seriesId) {
    query = query.eq('seriesId', seriesId);
  }

  const from = (page - 1) * size;
  const to = from + size - 1;
  const { data, error, count } = await query
    .order('updatedAt', { ascending: false })
    .range(from, to);
  if (error) throw new Error(`searchProducts failed: ${error.message}`);
  const items = (data || []).map(parseProductRow);
  return { items, total: count || 0 };
}

// 获取子产品（变体）
export async function getChildrenProducts(parentId: string): Promise<ProductIndexItem[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('parent_product_id', parentId)
    .order('updatedAt', { ascending: false });
  if (error) throw new Error(`getChildrenProducts failed: ${error.message}`);
  return (data || []).map(parseProductRow);
}

// 搜索所有产品（包括变体）
export async function searchAllProducts(
  locale: string,
  keyword?: string,
  categoryId?: string,
  seriesId?: string,
  page: number = 1,
  size: number = 20
): Promise<{ items: ProductIndexItem[]; total: number }> {
  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('locale', locale);

  if (keyword) {
    query = query.or(`product_name.ilike.%${keyword}%,sku.ilike.%${keyword}%`);
  }
  if (categoryId) {
    query = query.eq('categoryId', categoryId);
  }
  if (seriesId) {
    query = query.eq('seriesId', seriesId);
  }

  const from = (page - 1) * size;
  const to = from + size - 1;
  const { data, error, count } = await query
    .order('updatedAt', { ascending: false })
    .range(from, to);
  if (error) throw new Error(`searchAllProducts failed: ${error.message}`);
  const items = (data || []).map(parseProductRow);
  return { items, total: count || 0 };
}

// 根据 slug 获取产品
export async function getProductBySlug(locale: string, slug: string): Promise<ProductIndexItem | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('locale', locale)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(`getProductBySlug failed: ${error.message}`);
  if (!data) return null;
  return parseProductRow(data);
}

// 根据 productId 获取产品
export async function getProductById(locale: string, productId: string): Promise<ProductIndexItem | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('locale', locale)
    .eq('productId', productId)
    .maybeSingle();
  if (error) throw new Error(`getProductById failed: ${error.message}`);
  if (!data) return null;
  return parseProductRow(data);
}

// 根据分类ID获取产品（分页，仅父产品）
export async function getProductsByCategoryId(
  locale: string,
  categoryId: string,
  page: number = 1,
  pageSize: number = 12
): Promise<{ items: any[]; total: number }> {
  let query = supabase
    .from('products')
    .select('productId, product_name, sku, main_image_url, price_tiers, currency, min_order_quantity, slug', { count: 'exact' })
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('locale', locale)
    .eq('categoryId', categoryId)
    .or('parent_product_id.is.null,parent_product_id.eq.');

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query
    .order('updatedAt', { ascending: false })
    .range(from, to);
  if (error) throw new Error(`getProductsByCategoryId failed: ${error.message}`);
  const items = (data || []).map((row: any) => ({
    ...row,
    price_tiers: JSON.parse(row.price_tiers || '[]'),
  }));
  return { items, total: count || 0 };
}

// 高级筛选（支持价格、可用性、排序）
export async function getFilteredProducts(
  locale: string,
  categoryId: string,
  seriesId?: string,
  availability?: 'in-stock' | 'out-of-stock' | null,
  minPrice?: number,
  maxPrice?: number,
  sortColumn: string = 'updatedAt',
  sortOrder: 'ASC' | 'DESC' = 'DESC'
): Promise<{ items: any[]; total: number }> {
  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('locale', locale)
    .eq('categoryId', categoryId)
    .or('parent_product_id.is.null,parent_product_id.eq.');

  if (seriesId) {
    query = query.eq('seriesId', seriesId);
  }
  if (availability === 'in-stock') {
    query = query.eq('availability', 'in_stock');
  } else if (availability === 'out-of-stock') {
    query = query.eq('availability', 'out_of_stock');
  }

  // 价格过滤（JSON 字段）
  if (minPrice !== undefined) {
    query = query.gte('price_tiers->0->>price', minPrice);
  }
  if (maxPrice !== undefined) {
    query = query.lte('price_tiers->0->>price', maxPrice);
  }

  // 排序
  let orderField = sortColumn;
  if (sortColumn === 'first_price') orderField = 'price_tiers->0->>price';
  else if (sortColumn === 'product_name') orderField = 'product_name';
  else if (sortColumn === 'createdAt') orderField = 'createdAt';
  else orderField = 'updatedAt';

  const { data, error, count } = await query
    .order(orderField, { ascending: sortOrder === 'ASC' });
  if (error) throw new Error(`getFilteredProducts failed: ${error.message}`);
  const items = (data || []).map(parseProductRow);
  return { items, total: count || 0 };
}

// 获取产品线下的所有产品（父产品）
export async function getProductsByProductLine(
  locale: string,
  productLineId: string,
  page: number,
  pageSize: number
): Promise<{ items: any[]; total: number }> {
  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('locale', locale)
    .eq('productLineId', productLineId)
    .or('parent_product_id.is.null,parent_product_id.eq.');

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query
    .order('updatedAt', { ascending: false })
    .range(from, to);
  if (error) throw new Error(`getProductsByProductLine failed: ${error.message}`);
  const items = (data || []).map(parseProductRow);
  return { items, total: count || 0 };
}

// 获取分类下的产品（支持二级分类）
export async function getProductsByCategoryAndSeries(
  locale: string,
  categoryId: string,
  seriesId: string | null,
  page: number,
  pageSize: number
): Promise<{ items: any[]; total: number }> {
  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('locale', locale)
    .eq('categoryId', categoryId)
    .or('parent_product_id.is.null,parent_product_id.eq.');

  if (seriesId) {
    query = query.eq('seriesId', seriesId);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query
    .order('updatedAt', { ascending: false })
    .range(from, to);
  if (error) throw new Error(`getProductsByCategoryAndSeries failed: ${error.message}`);
  const items = (data || []).map(parseProductRow);
  return { items, total: count || 0 };
}

// 简单获取分类下的产品（分页）
export async function getProductsByCategory(
  locale: string,
  categoryId: string,
  page: number,
  pageSize: number
): Promise<{ items: any[]; total: number }> {
  return getProductsByCategoryAndSeries(locale, categoryId, null, page, pageSize);
}

// ==================== 以下函数改为从私有桶读取分类缓存 ====================

/**
 * 从私有桶读取 categories.json（带内存缓存）
 */
async function getCachedCategories(locale: string) {
  const cacheKey = `categories_${locale}`;
  let data = categoryCache.get(cacheKey);
  if (!data) {
    const storage = getPrivateStorage();
    const key = `data/products/${locale}/categories.json`;
    try {
      const content = await storage.read(key, 'utf8');
      data = JSON.parse(content as string);
      categoryCache.set(cacheKey, data);
    } catch (error: any) {
      if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
        data = { categories: [] };
      } else {
        throw error;
      }
    }
  }
  return data;
}

/**
 * 根据分类ID获取产品线ID（原同步函数改为异步）
 */
export async function getProductLineIdFromCategory(locale: string, categoryId: string): Promise<string> {
  const data = await getCachedCategories(locale);
  const cat = data.categories?.find((c: any) => c.id === categoryId);
  return cat?.productLineId || '';
}

// 获取所有产品ID（用于生成唯一ID）
export async function getAllProductIds(locale: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('products')
    .select('productId')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('locale', locale);
  if (error) throw new Error(`getAllProductIds failed: ${error.message}`);
  return (data || []).map(row => row.productId);
}