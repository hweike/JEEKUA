// lib/products/indexDb.ts
import sql from '@/lib/db/admin';
import { LRUCache } from 'lru-cache';
import { getPrivateStorage } from '@/lib/storage/factory';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';
const categoryCache = new LRUCache<string, any>({ max: 10, ttl: 60_000 });

// 状态计数缓存（5分钟）
export const statusCountCache = new LRUCache<string, { published: number; draft: number; offline: number }>({
  max: 100,
  ttl: 1000 * 60 * 5,
});

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

// ========== SQL 列名片段 ==========
// camelCase 列名必须加双引号，否则 postgres 库会转小写
const FULL_COLUMNS = sql`
  site_id, "productId", locale, "productLineId", "categoryId", "seriesId",
  parent_product_id, sku, product_name, brand, price_tiers, currency,
  availability, min_order_quantity, main_image_url, attributes, slug, status,
  "templateId", "updatedAt", "createdAt"
`;

const LIST_COLUMNS = sql`
  "productId", locale, "productLineId", "categoryId", "seriesId", parent_product_id,
  sku, product_name, brand, currency, availability, min_order_quantity,
  main_image_url, slug, status, "templateId", "updatedAt", "createdAt"
`;

// ========== 辅助函数 ==========
function shouldUseFullText(keyword: string): boolean {
  return /[^a-zA-Z0-9\u4e00-\u9fa5\s]/.test(keyword);
}

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

// ========== 插入或更新 ==========
export async function upsertProductIndex(item: ProductIndexItem) {
  const record = {
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
  };

  await sql`
    INSERT INTO products ${sql(record)}
    ON CONFLICT (site_id, "productId", locale)
    DO UPDATE SET ${sql(record, 'productLineId', 'categoryId', 'seriesId',
      'parent_product_id', 'sku', 'product_name', 'brand', 'price_tiers',
      'currency', 'availability', 'min_order_quantity', 'main_image_url',
      'attributes', 'slug', 'status', 'templateId', 'updatedAt')}
  `;
}

// ========== 删除产品索引（带重试） ==========
export async function deleteProductIndex(productId: string, retries: number = 3): Promise<void> {
  let lastError: Error | null = null;
  for (let i = 0; i < retries; i++) {
    try {
      await sql`
        DELETE FROM products
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND "productId" = ${productId}
      `;
      return;
    } catch (err: any) {
      lastError = err;
      console.warn(`删除产品索引重试 ${i + 1}/${retries} for productId ${productId}: ${err.message}`);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, i)));
      }
    }
  }
  throw lastError || new Error(`deleteProductIndex failed after ${retries} retries`);
}

// ========== 获取单个产品索引 ==========
export async function getProductIndex(productId: string, locale: string): Promise<ProductIndexItem | null> {
  const rows = await sql<any[]>`
    SELECT ${FULL_COLUMNS}
    FROM products
    WHERE site_id = ${DEFAULT_SITE_ID}
      AND "productId" = ${productId}
      AND locale = ${locale}
    LIMIT 1
  `;
  if (!rows[0]) return null;
  return parseProductRow(rows[0]);
}

// ========== 状态计数 ==========
export async function getProductStatusCount(locale: string): Promise<{ published: number; draft: number; offline: number }> {
  const cacheKey = `statusCount_${locale}`;
  const cached = statusCountCache.get(cacheKey);
  if (cached) return cached;

  const rows = await sql<{ status: string; count: string }[]>`
    SELECT status, COUNT(*)::text AS count
    FROM products
    WHERE site_id = ${DEFAULT_SITE_ID}
      AND locale = ${locale}
      AND parent_product_id IS NULL
      AND status IN ('published', 'draft', 'offline')
    GROUP BY status
  `;

  const counts = { published: 0, draft: 0, offline: 0 };
  for (const row of rows) {
    if (row.status === 'published') counts.published = parseInt(row.count, 10);
    else if (row.status === 'draft') counts.draft = parseInt(row.count, 10);
    else if (row.status === 'offline') counts.offline = parseInt(row.count, 10);
  }

  statusCountCache.set(cacheKey, counts);
  return counts;
}

// ========== 搜索产品列表 ==========
export async function searchProducts(
  locale: string,
  status?: string,
  keyword?: string,
  categoryId?: string,
  seriesId?: string,
  page: number = 1,
  size: number = 20
): Promise<{ items: ProductIndexItem[]; total: number }> {
  const from = (page - 1) * size;

  const conditions: any[] = [
    sql`site_id = ${DEFAULT_SITE_ID}`,
    sql`locale = ${locale}`,
    sql`parent_product_id IS NULL`,
  ];

  if (status && status !== 'all') {
    conditions.push(sql`status = ${status}`);
  }

  if (keyword) {
    if (shouldUseFullText(keyword)) {
      const tsquery = keyword.trim().split(/\s+/).filter(Boolean).join(' & ');
      conditions.push(sql`search_vector @@ websearch_to_tsquery('simple', ${tsquery})`);
    } else {
      const pattern = `%${keyword}%`;
      conditions.push(sql`(product_name ILIKE ${pattern} OR sku ILIKE ${pattern})`);
    }
  }

  if (categoryId) {
    conditions.push(sql`"categoryId" = ${categoryId}`);
  }
  if (seriesId) {
    conditions.push(sql`"seriesId" = ${seriesId}`);
  }

  const whereClause = conditions.reduce(
    (acc, cond, i) => (i === 0 ? cond : sql`${acc} AND ${cond}`),
    sql``
  );

  const countRows = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count FROM products WHERE ${whereClause}
  `;
  const total = parseInt(countRows[0]?.count || '0', 10);

  const rows = await sql<any[]>`
    SELECT ${LIST_COLUMNS}
    FROM products
    WHERE ${whereClause}
    ORDER BY "updatedAt" DESC
    LIMIT ${size} OFFSET ${from}
  `;

  const items = rows.map(row => parseProductRow(row));
  return { items, total };
}

// ========== 获取子产品（变体）==========
export async function getChildrenProducts(parentId: string, locale: string): Promise<ProductIndexItem[]> {
  const rows = await sql<any[]>`
    SELECT ${LIST_COLUMNS}
    FROM products
    WHERE site_id = ${DEFAULT_SITE_ID}
      AND parent_product_id = ${parentId}
      AND locale = ${locale}
    ORDER BY "updatedAt" DESC
  `;
  return rows.map(row => parseProductRow(row));
}

// ========== 搜索所有产品（含变体）==========
export async function searchAllProducts(
  locale: string,
  keyword?: string,
  categoryId?: string,
  seriesId?: string,
  page: number = 1,
  size: number = 20
): Promise<{ items: ProductIndexItem[]; total: number }> {
  const from = (page - 1) * size;

  const conditions: any[] = [
    sql`site_id = ${DEFAULT_SITE_ID}`,
    sql`locale = ${locale}`,
  ];

  if (keyword) {
    if (shouldUseFullText(keyword)) {
      const tsquery = keyword.trim().split(/\s+/).filter(Boolean).join(' & ');
      conditions.push(sql`search_vector @@ websearch_to_tsquery('simple', ${tsquery})`);
    } else {
      const pattern = `%${keyword}%`;
      conditions.push(sql`(product_name ILIKE ${pattern} OR sku ILIKE ${pattern})`);
    }
  }

  if (categoryId) {
    conditions.push(sql`"categoryId" = ${categoryId}`);
  }
  if (seriesId) {
    conditions.push(sql`"seriesId" = ${seriesId}`);
  }

  const whereClause = conditions.reduce(
    (acc, cond, i) => (i === 0 ? cond : sql`${acc} AND ${cond}`),
    sql``
  );

  const countRows = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count FROM products WHERE ${whereClause}
  `;
  const total = parseInt(countRows[0]?.count || '0', 10);

  const rows = await sql<any[]>`
    SELECT ${LIST_COLUMNS}
    FROM products
    WHERE ${whereClause}
    ORDER BY "updatedAt" DESC
    LIMIT ${size} OFFSET ${from}
  `;

  const items = rows.map(row => parseProductRow(row));
  return { items, total };
}

// ========== 根据 slug 获取产品 ==========
export async function getProductBySlug(locale: string, slug: string): Promise<ProductIndexItem | null> {
  const rows = await sql<any[]>`
    SELECT ${FULL_COLUMNS}
    FROM products
    WHERE site_id = ${DEFAULT_SITE_ID}
      AND locale = ${locale}
      AND slug = ${slug}
    LIMIT 1
  `;
  if (!rows[0]) return null;
  return parseProductRow(rows[0]);
}

// ========== 根据 productId 获取产品 ==========
export async function getProductById(locale: string, productId: string): Promise<ProductIndexItem | null> {
  const rows = await sql<any[]>`
    SELECT ${FULL_COLUMNS}
    FROM products
    WHERE site_id = ${DEFAULT_SITE_ID}
      AND locale = ${locale}
      AND "productId" = ${productId}
    LIMIT 1
  `;
  if (!rows[0]) return null;
  return parseProductRow(rows[0]);
}

// ========== 根据分类ID获取产品（分页）==========
export async function getProductsByCategoryId(
  locale: string,
  categoryId: string,
  page: number = 1,
  pageSize: number = 12
): Promise<{ items: any[]; total: number }> {
  const from = (page - 1) * pageSize;

  const countRows = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count FROM products
    WHERE site_id = ${DEFAULT_SITE_ID}
      AND locale = ${locale}
      AND "categoryId" = ${categoryId}
      AND parent_product_id IS NULL
  `;
  const total = parseInt(countRows[0]?.count || '0', 10);

  const rows = await sql<any[]>`
    SELECT "productId", product_name, sku, main_image_url, price_tiers,
           currency, min_order_quantity, slug
    FROM products
    WHERE site_id = ${DEFAULT_SITE_ID}
      AND locale = ${locale}
      AND "categoryId" = ${categoryId}
      AND parent_product_id IS NULL
    ORDER BY "updatedAt" DESC
    LIMIT ${pageSize} OFFSET ${from}
  `;

  const items = rows.map((row: any) => ({
    ...row,
    price_tiers: JSON.parse(row.price_tiers || '[]'),
  }));

  return { items, total };
}

// ========== 高级筛选 ==========
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
  const conditions: any[] = [
    sql`site_id = ${DEFAULT_SITE_ID}`,
    sql`locale = ${locale}`,
    sql`"categoryId" = ${categoryId}`,
    sql`parent_product_id IS NULL`,
  ];

  if (seriesId) {
    conditions.push(sql`"seriesId" = ${seriesId}`);
  }

  if (availability === 'in-stock') {
    conditions.push(sql`availability = 'in_stock'`);
  } else if (availability === 'out-of-stock') {
    conditions.push(sql`availability = 'out_of_stock'`);
  }

  if (minPrice !== undefined) {
    conditions.push(sql`(price_tiers::jsonb -> 0 ->> 'price')::numeric >= ${minPrice}`);
  }
  if (maxPrice !== undefined) {
    conditions.push(sql`(price_tiers::jsonb -> 0 ->> 'price')::numeric <= ${maxPrice}`);
  }

  const whereClause = conditions.reduce(
    (acc, cond, i) => (i === 0 ? cond : sql`${acc} AND ${cond}`),
    sql``
  );

  const countRows = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count FROM products WHERE ${whereClause}
  `;
  const total = parseInt(countRows[0]?.count || '0', 10);

  // 动态 ORDER BY（只允许白名单列）
  const orderColumnMap: Record<string, any> = {
    'first_price': sql`(price_tiers::jsonb -> 0 ->> 'price')::numeric`,
    'product_name': sql`product_name`,
    'createdAt': sql`"createdAt"`,
    'updatedAt': sql`"updatedAt"`,
  };
  const orderColumn = orderColumnMap[sortColumn] || sql`"updatedAt"`;
  const orderDir = sortOrder === 'ASC' ? sql`ASC` : sql`DESC`;

  const rows = await sql<any[]>`
    SELECT ${FULL_COLUMNS}
    FROM products
    WHERE ${whereClause}
    ORDER BY ${orderColumn} ${orderDir}
  `;

  const items = rows.map(parseProductRow);
  return { items, total };
}

// ========== 产品线下的产品 ==========
export async function getProductsByProductLine(
  locale: string,
  productLineId: string,
  page: number,
  pageSize: number
): Promise<{ items: any[]; total: number }> {
  const from = (page - 1) * pageSize;

  const countRows = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count FROM products
    WHERE site_id = ${DEFAULT_SITE_ID}
      AND locale = ${locale}
      AND "productLineId" = ${productLineId}
      AND parent_product_id IS NULL
  `;
  const total = parseInt(countRows[0]?.count || '0', 10);

  const rows = await sql<any[]>`
    SELECT ${FULL_COLUMNS}
    FROM products
    WHERE site_id = ${DEFAULT_SITE_ID}
      AND locale = ${locale}
      AND "productLineId" = ${productLineId}
      AND parent_product_id IS NULL
    ORDER BY "updatedAt" DESC
    LIMIT ${pageSize} OFFSET ${from}
  `;

  const items = rows.map(parseProductRow);
  return { items, total };
}

// ========== 分类+系列产品 ==========
export async function getProductsByCategoryAndSeries(
  locale: string,
  categoryId: string,
  seriesId: string | null,
  page: number,
  pageSize: number
): Promise<{ items: any[]; total: number }> {
  const from = (page - 1) * pageSize;

  const conditions: any[] = [
    sql`site_id = ${DEFAULT_SITE_ID}`,
    sql`locale = ${locale}`,
    sql`"categoryId" = ${categoryId}`,
    sql`parent_product_id IS NULL`,
  ];

  if (seriesId) {
    conditions.push(sql`"seriesId" = ${seriesId}`);
  }

  const whereClause = conditions.reduce(
    (acc, cond, i) => (i === 0 ? cond : sql`${acc} AND ${cond}`),
    sql``
  );

  const countRows = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count FROM products WHERE ${whereClause}
  `;
  const total = parseInt(countRows[0]?.count || '0', 10);

  const rows = await sql<any[]>`
    SELECT ${FULL_COLUMNS}
    FROM products
    WHERE ${whereClause}
    ORDER BY "updatedAt" DESC
    LIMIT ${pageSize} OFFSET ${from}
  `;

  const items = rows.map(parseProductRow);
  return { items, total };
}

// ========== 简化版 ==========
export async function getProductsByCategory(
  locale: string,
  categoryId: string,
  page: number,
  pageSize: number
): Promise<{ items: any[]; total: number }> {
  return getProductsByCategoryAndSeries(locale, categoryId, null, page, pageSize);
}

// ========== 私有桶读取分类缓存（保留原逻辑）==========
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

export async function getProductLineIdFromCategory(locale: string, categoryId: string): Promise<string> {
  const data = await getCachedCategories(locale);
  const cat = data.categories?.find((c: any) => c.id === categoryId);
  return cat?.productLineId || '';
}

// ========== 获取所有产品ID ==========
export async function getAllProductIds(locale: string): Promise<string[]> {
  const rows = await sql<{ productId: string }[]>`
    SELECT "productId" FROM products
    WHERE site_id = ${DEFAULT_SITE_ID}
      AND locale = ${locale}
  `;
  return rows.map(row => row.productId);
}

// ========== 完整字段子产品 ==========
export async function getChildrenProductsFull(parentId: string, locale: string): Promise<ProductIndexItem[]> {
  const rows = await sql<any[]>`
    SELECT ${FULL_COLUMNS}
    FROM products
    WHERE site_id = ${DEFAULT_SITE_ID}
      AND parent_product_id = ${parentId}
      AND locale = ${locale}
    ORDER BY "updatedAt" DESC
  `;
  return rows.map(row => parseProductRow(row));
}

// ========== 批量获取子产品 ==========
export async function getChildrenProductsFullBatch(
  parentIds: string[],
  locale: string
): Promise<Map<string, ProductIndexItem[]>> {
  if (!parentIds || parentIds.length === 0) {
    return new Map();
  }

  try {
    const rows = await sql<any[]>`
      SELECT ${FULL_COLUMNS}
      FROM products
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND locale = ${locale}
        AND parent_product_id IN ${sql(parentIds)}
      ORDER BY "updatedAt" DESC
    `;

    const grouped = new Map<string, ProductIndexItem[]>();
    for (const row of rows) {
      const parentId = row.parent_product_id;
      if (!grouped.has(parentId)) {
        grouped.set(parentId, []);
      }
      grouped.get(parentId)!.push(parseProductRow(row));
    }

    return grouped;
  } catch (error) {
    console.error('[getChildrenProductsFullBatch] 查询失败:', error);
    return new Map();
  }
}

// ========== 批量查询产品索引 ==========
export async function getProductIndexesBatch(
  productIds: string[],
  locale: string
): Promise<any[]> {
  if (!productIds || productIds.length === 0) return [];

  try {
    const rows = await sql<any[]>`
      SELECT ${FULL_COLUMNS}
      FROM products
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND locale = ${locale}
        AND "productId" IN ${sql(productIds)}
    `;
    return rows;
  } catch (error) {
    console.error('[getProductIndexesBatch] 查询失败:', error);
    return [];
  }
}