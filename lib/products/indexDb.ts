import { getDb } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { LRUCache } from 'lru-cache';

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
  templateId?: string;  // ✅ 添加产品详情页模板ID（可选，因为旧数据可能没有）
}

export function upsertProductIndex(item: ProductIndexItem) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO products (
      productId, locale, productLineId, categoryId, seriesId, parent_product_id,
      sku, product_name, brand, price_tiers, currency, availability,
      min_order_quantity, main_image_url, attributes, slug, status,
      updatedAt, createdAt, templateId
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    item.productId,
    item.locale,
    item.productLineId,
    item.categoryId,
    item.seriesId,
    item.parent_product_id,
    item.sku,
    item.product_name,
    item.brand,
    JSON.stringify(item.price_tiers),
    item.currency,
    item.availability,
    item.min_order_quantity,
    item.main_image_url,
    JSON.stringify(item.attributes),
    item.slug,
    item.status,
    item.updatedAt,
    item.createdAt,
    item.templateId || ''   // 默认空字符串
  );
}

export function deleteProductIndex(productId: string) {
  const db = getDb();
  const stmt = db.prepare(`DELETE FROM products WHERE productId = ?`);
  stmt.run(productId);
}

export function getProductIndex(productId: string): ProductIndexItem | null {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM products WHERE productId = ?`);
  const row = stmt.get(productId) as any;
  if (!row) return null;
  return {
    ...row,
    price_tiers: JSON.parse(row.price_tiers || '[]'),
    attributes: JSON.parse(row.attributes || '{}'),
  };
}

export function getProductStatusCount(locale: string): { published: number; draft: number; offline: number } {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT status, COUNT(*) as count FROM products
    WHERE locale = ? AND (parent_product_id IS NULL OR parent_product_id = '')
    GROUP BY status
  `);
  const rows = stmt.all(locale) as any[];
  const counts = { published: 0, draft: 0, offline: 0 };
  rows.forEach(row => {
    if (row.status === 'published') counts.published = row.count;
    else if (row.status === 'draft') counts.draft = row.count;
    else if (row.status === 'offline') counts.offline = row.count;
  });
  return counts;
}

// ========== 搜索产品列表（仅父产品，支持二级分类） ==========
export function searchProducts(
  locale: string,
  status?: string,
  keyword?: string,
  categoryId?: string,
  seriesId?: string,        // ✅ 新增参数
  page: number = 1,
  size: number = 20
): { items: ProductIndexItem[]; total: number } {
  const db = getDb();
  let sql = `SELECT * FROM products WHERE locale = ? AND (parent_product_id IS NULL OR parent_product_id = '')`;
  const params: any[] = [locale];
  if (status && status !== 'all') {
    sql += ` AND status = ?`;
    params.push(status);
  }
  if (keyword) {
    sql += ` AND (product_name LIKE ? OR sku LIKE ?)`;
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (categoryId) {
    sql += ` AND categoryId = ?`;
    params.push(categoryId);
  }
  // ✅ 二级分类过滤
  if (seriesId) {
    sql += ` AND seriesId = ?`;
    params.push(seriesId);
  }

  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM (${sql})`);
  const total = countStmt.get(...params) as { total: number };
  const dataStmt = db.prepare(`${sql} ORDER BY updatedAt DESC LIMIT ? OFFSET ?`);
  const rows = dataStmt.all(...params, size, (page - 1) * size) as any[];
  const items = rows.map(parseProductRow);
  return { items, total: total.total };
}

export function getChildrenProducts(parentId: string): ProductIndexItem[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM products WHERE parent_product_id = ? ORDER BY updatedAt DESC
  `);
  const rows = stmt.all(parentId) as any[];
  return rows.map(parseProductRow);
}

// ========== 搜索所有产品（包括变体，支持二级分类） ==========
export function searchAllProducts(
  locale: string,
  keyword?: string,
  categoryId?: string,
  seriesId?: string,        // ✅ 新增参数
  page: number = 1,
  size: number = 20
): { items: ProductIndexItem[]; total: number } {
  const db = getDb();
  let sql = `SELECT * FROM products WHERE locale = ?`;
  const params: any[] = [locale];
  if (keyword) {
    sql += ` AND (product_name LIKE ? OR sku LIKE ?)`;
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (categoryId) {
    sql += ` AND categoryId = ?`;
    params.push(categoryId);
  }
  // ✅ 二级分类过滤
  if (seriesId) {
    sql += ` AND seriesId = ?`;
    params.push(seriesId);
  }

  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM (${sql})`);
  const total = countStmt.get(...params) as { total: number };
  const dataStmt = db.prepare(`${sql} ORDER BY updatedAt DESC LIMIT ? OFFSET ?`);
  const rows = dataStmt.all(...params, size, (page - 1) * size) as any[];
  const items = rows.map(parseProductRow);
  return { items, total: total.total };
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
    templateId: row.templateId || ''
  };
}

function getCachedCategories(locale: string) {
  const cacheKey = `categories_${locale}`;
  let data = categoryCache.get(cacheKey);
  if (!data) {
    const filePath = path.join(process.cwd(), 'data', 'products', locale, 'categories.json');
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      data = JSON.parse(raw);
      categoryCache.set(cacheKey, data);
    } catch {
      data = { categories: [] };
    }
  }
  return data;
}

export function getProductLineIdFromCategory(locale: string, categoryId: string): string {
  const data = getCachedCategories(locale);
  const cat = data.categories?.find((c: any) => c.id === categoryId);
  return cat?.productLineId || '';
}

export function getProductBySlug(locale: string, slug: string): ProductIndexItem | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM products WHERE locale = ? AND slug = ?`).get(locale, slug) as any;
  if (!row) return null;
  return {
    ...row,
    price_tiers: JSON.parse(row.price_tiers || '[]'),
    attributes: JSON.parse(row.attributes || '{}'),
  };
}

export function getProductById(locale: string, productId: string): ProductIndexItem | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM products WHERE locale = ? AND productId = ?`).get(locale, productId) as any;
  if (!row) return null;
  return {
    ...row,
    price_tiers: JSON.parse(row.price_tiers || '[]'),
    attributes: JSON.parse(row.attributes || '{}'),
  };
}

export function getProductsByCategoryId(
  locale: string,
  categoryId: string,
  page: number = 1,
  pageSize: number = 12
): { items: any[]; total: number } {
  const db = getDb();
  const offset = (page - 1) * pageSize;
  const countSql = `
    SELECT COUNT(*) as total
    FROM products
    WHERE locale = ? AND categoryId = ? AND (parent_product_id IS NULL OR parent_product_id = '')
  `;
  const totalRow = db.prepare(countSql).get(locale, categoryId) as { total: number };
  const dataSql = `
    SELECT productId, product_name, sku, main_image_url, price_tiers, currency, min_order_quantity, slug
    FROM products
    WHERE locale = ? AND categoryId = ? AND (parent_product_id IS NULL OR parent_product_id = '')
    ORDER BY updatedAt DESC
    LIMIT ? OFFSET ?
  `;
  const rows = db.prepare(dataSql).all(locale, categoryId, pageSize, offset);
  const items = rows.map((row: any) => ({
    ...row,
    price_tiers: JSON.parse(row.price_tiers || '[]'),
  }));
  return { items, total: totalRow.total };
}


// lib/products/indexDb.ts 中的 getFilteredProducts 函数
export function getFilteredProducts(
  locale: string,
  categoryId: string,
  seriesId?: string,
  availability?: 'in-stock' | 'out-of-stock' | null,
  minPrice?: number,
  maxPrice?: number,
  sortColumn: string = 'updatedAt',
  sortOrder: 'ASC' | 'DESC' = 'DESC'
): { items: any[]; total: number } {
  const db = getDb();
  let sql = `
    SELECT * FROM products 
    WHERE locale = ? 
      AND categoryId = ? 
      AND (parent_product_id IS NULL OR parent_product_id = '')
  `;
  const params: any[] = [locale, categoryId];

  if (seriesId) {
    sql += ` AND seriesId = ?`;
    params.push(seriesId);
  }

  if (availability === 'in-stock') {
    sql += ` AND availability = 'in_stock'`;
  } else if (availability === 'out-of-stock') {
    sql += ` AND availability = 'out_of_stock'`;
  }

  // 提取 price_tiers 中第一个价格（ JSON 数组的第一个元素的 price 字段）
  if (minPrice !== undefined) {
    sql += ` AND json_extract(price_tiers, '$[0].price') >= ?`;
    params.push(minPrice);
  }
  if (maxPrice !== undefined) {
    sql += ` AND json_extract(price_tiers, '$[0].price') <= ?`;
    params.push(maxPrice);
  }

  // 排序
  let orderBy = '';
  switch (sortColumn) {
    case 'product_name':
      orderBy = `ORDER BY product_name ${sortOrder}`;
      break;
    case 'first_price':
      orderBy = `ORDER BY json_extract(price_tiers, '$[0].price') ${sortOrder}`;
      break;
    case 'createdAt':
      orderBy = `ORDER BY createdAt ${sortOrder}`;
      break;
    default:
      orderBy = `ORDER BY updatedAt DESC`;
  }

  const countSql = `SELECT COUNT(*) as total FROM (${sql})`;
  const totalRow = db.prepare(countSql).get(...params) as { total: number };
  const dataSql = `${sql} ${orderBy}`;
  const rows = db.prepare(dataSql).all(...params) as any[];
  const items = rows.map(parseProductRow);
  return { items, total: totalRow.total };
}

// 获取产品线下的所有产品（父产品）
export function getProductsByProductLine(
  locale: string,
  productLineId: string,
  page: number,
  pageSize: number
): { items: any[]; total: number } {
  const db = getDb();
  let sql = `SELECT * FROM products WHERE locale = ? AND productLineId = ? AND (parent_product_id IS NULL OR parent_product_id = '')`;
  const params: any[] = [locale, productLineId];

  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM (${sql})`);
  const totalRow = countStmt.get(...params) as { total: number };
  const dataStmt = db.prepare(`${sql} ORDER BY updatedAt DESC LIMIT ? OFFSET ?`);
  const rows = dataStmt.all(...params, pageSize, (page - 1) * pageSize);
  const items = rows.map(parseProductRow);
  return { items, total: totalRow.total };
}

// 获取分类（可能带二级分类）下的产品
export function getProductsByCategoryAndSeries(
  locale: string,
  categoryId: string,
  seriesId: string | null,
  page: number,
  pageSize: number
): { items: any[]; total: number } {
  const db = getDb();
  let sql = `SELECT * FROM products WHERE locale = ? AND categoryId = ? AND (parent_product_id IS NULL OR parent_product_id = '')`;
  const params: any[] = [locale, categoryId];
  if (seriesId) {
    sql += ` AND seriesId = ?`;
    params.push(seriesId);
  }

  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM (${sql})`);
  const totalRow = countStmt.get(...params) as { total: number };
  const dataStmt = db.prepare(`${sql} ORDER BY updatedAt DESC LIMIT ? OFFSET ?`);
  const rows = dataStmt.all(...params, pageSize, (page - 1) * pageSize);
  const items = rows.map(parseProductRow);
  return { items, total: totalRow.total };
}

// Collections获取分类（可能带二级分类）下的产品
export function getProductsByCategory(locale: string, categoryId: string, page: number, pageSize: number) {
  const db = getDb();
  const sql = `SELECT * FROM products WHERE locale = ? AND categoryId = ? AND (parent_product_id IS NULL OR parent_product_id = '') ORDER BY updatedAt DESC LIMIT ? OFFSET ?`;
  const countSql = `SELECT COUNT(*) as total FROM products WHERE locale = ? AND categoryId = ? AND (parent_product_id IS NULL OR parent_product_id = '')`;
  const totalRow = db.prepare(countSql).get(locale, categoryId) as { total: number };
  const rows = db.prepare(sql).all(locale, categoryId, pageSize, (page - 1) * pageSize);
  const items = rows.map(parseProductRow);
  return { items, total: totalRow.total };
}