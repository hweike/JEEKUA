// lib/products/fileStorage.ts
import fs from 'fs/promises';
import path from 'path';
import { ProductFrontMatter, ProductIndexItem } from './types';
import { parseMdFile, writeMdFile } from './mdParser';

const DATA_ROOT = path.join(process.cwd(), 'data/products');

// 获取语言根目录
function getLangDir(locale: string): string {
  return path.join(DATA_ROOT, locale);
}

// 获取产品 MD 文件路径（按扁平存放）
function getProductMdPath(locale: string, productId: string): string {
  return path.join(getLangDir(locale), 'products', `${productId}.md`);
}

// 获取分类索引文件路径
function getCategoryIndexPath(locale: string, categoryId: string, isSeries: boolean = false): string {
  // 一级分类和二级分类的索引文件都放在 categories/{categoryId}/products.json
  return path.join(getLangDir(locale), 'categories', categoryId, 'products.json');
}

// 读取单个产品 MD
export async function readProduct(locale: string, productId: string): Promise<ProductFrontMatter | null> {
  const filePath = getProductMdPath(locale, productId);
  try {
    const { data } = await parseMdFile(filePath);
    return data;
  } catch {
    return null;
  }
}

// 写入产品 MD（同时更新索引）
export async function writeProduct(locale: string, productId: string, frontMatter: ProductFrontMatter, content: string = ''): Promise<void> {
  const filePath = getProductMdPath(locale, productId);
  // 确保目录存在
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await writeMdFile(filePath, frontMatter, content);
  // 更新分类索引
  await updateCategoryIndex(locale, frontMatter.categoryId, productId, frontMatter, false);
  if (frontMatter.seriesId && frontMatter.seriesId !== frontMatter.categoryId) {
    await updateCategoryIndex(locale, frontMatter.seriesId, productId, frontMatter, true);
  }
}

// 删除产品
export async function deleteProduct(locale: string, productId: string): Promise<void> {
  const product = await readProduct(locale, productId);
  if (!product) return;
  const filePath = getProductMdPath(locale, productId);
  await fs.unlink(filePath).catch(() => {});
  // 从索引中移除
  await removeFromCategoryIndex(locale, product.categoryId, productId);
  if (product.seriesId && product.seriesId !== product.categoryId) {
    await removeFromCategoryIndex(locale, product.seriesId, productId);
  }
}

// 更新某个分类的 products.json（增量或全量重建）
async function updateCategoryIndex(locale: string, categoryId: string, productId: string, frontMatter: ProductFrontMatter, isSeries: boolean): Promise<void> {
  const indexPath = getCategoryIndexPath(locale, categoryId, isSeries);
  let index: ProductIndexItem[] = [];
  try {
    const data = await fs.readFile(indexPath, 'utf-8');
    index = JSON.parse(data).items || [];
  } catch {}
  const existingIndex = index.find(i => i.productId === productId);
  if (existingIndex) {
    // 更新已有项
    existingIndex.name = frontMatter.product_name;
    existingIndex.sku = frontMatter.sku;
    existingIndex.mainImage = frontMatter.main_image_url;
    existingIndex.priceRange = formatPriceRange(frontMatter.price_tiers, frontMatter.currency);
    existingIndex.minOrderQuantity = frontMatter.min_order_quantity;
    existingIndex.order = frontMatter.order ?? 0;
    existingIndex.updatedAt = new Date().toISOString();
  } else {
    index.push({
      productId,
      name: frontMatter.product_name,
      sku: frontMatter.sku,
      mainImage: frontMatter.main_image_url,
      priceRange: formatPriceRange(frontMatter.price_tiers, frontMatter.currency),
      minOrderQuantity: frontMatter.min_order_quantity,
      order: frontMatter.order ?? 0,
      updatedAt: new Date().toISOString(),
    });
  }
  // 按 order 排序
  index.sort((a, b) => a.order - b.order);
  await fs.mkdir(path.dirname(indexPath), { recursive: true });
  await fs.writeFile(indexPath, JSON.stringify({ updatedAt: new Date().toISOString(), items: index }, null, 2));
}

async function removeFromCategoryIndex(locale: string, categoryId: string, productId: string): Promise<void> {
  const indexPath = getCategoryIndexPath(locale, categoryId, false);
  try {
    const data = await fs.readFile(indexPath, 'utf-8');
    const index = JSON.parse(data);
    index.items = index.items.filter((i: any) => i.productId !== productId);
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  } catch {}
}

function formatPriceRange(tiers: ProductFrontMatter['price_tiers'], currency: string): string {
  if (!tiers.length) return '-';
  const prices = tiers.map(t => t.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return `${min} ${currency}`;
  return `${min} - ${max} ${currency}`;
}

// 获取某个分类下的产品列表（从索引读取，支持分页）
export async function listProductsByCategory(locale: string, categoryId: string, page: number = 1, pageSize: number = 20): Promise<{ items: ProductIndexItem[]; total: number }> {
  const indexPath = getCategoryIndexPath(locale, categoryId, false);
  try {
    const data = await fs.readFile(indexPath, 'utf-8');
    const { items } = JSON.parse(data);
    const sorted = [...items].sort((a, b) => a.order - b.order);
    const start = (page - 1) * pageSize;
    const paginated = sorted.slice(start, start + pageSize);
    return { items: paginated, total: items.length };
  } catch {
    return { items: [], total: 0 };
  }
}