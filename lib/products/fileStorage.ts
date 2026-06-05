// lib/products/fileStorage.ts
import matter from 'gray-matter';
import { getPrivateStorage } from '@/lib/storage/factory';
import { ProductFrontMatter, ProductIndexItem } from './types';

// 私有桶中的基础前缀（对应原 data/products）
const STORAGE_PREFIX = 'data/products';

/**
 * 获取语言根目录在私有桶中的前缀
 */
function getLangPrefix(locale: string): string {
  return `${STORAGE_PREFIX}/${locale}`;
}

/**
 * 获取产品 MD 文件的存储 Key
 */
function getProductMdKey(locale: string, productId: string): string {
  return `${getLangPrefix(locale)}/products/${productId}.md`;
}

/**
 * 获取分类索引文件的存储 Key
 * @param isSeries 原函数参数保留但未使用，此处保持相同行为
 */
function getCategoryIndexKey(locale: string, categoryId: string, isSeries: boolean = false): string {
  return `${getLangPrefix(locale)}/categories/${categoryId}/products.json`;
}

/**
 * 读取单个产品 MD（直接使用 gray-matter）
 */
export async function readProduct(locale: string, productId: string): Promise<ProductFrontMatter | null> {
  const storage = getPrivateStorage();
  const key = getProductMdKey(locale, productId);
  try {
    const fileContent = await storage.read(key, 'utf8');
    const { data } = matter(fileContent as string);
    return data as ProductFrontMatter;
  } catch (error: any) {
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      return null;
    }
    throw error;
  }
}

/**
 * 写入产品 MD（同时更新索引）
 */
export async function writeProduct(
  locale: string,
  productId: string,
  frontMatter: ProductFrontMatter,
  content: string = ''
): Promise<void> {
  const storage = getPrivateStorage();
  const key = getProductMdKey(locale, productId);
  // 使用 gray-matter 生成带 frontmatter 的 Markdown 内容
  const fileContent = matter.stringify(content, frontMatter as any);
  await storage.write(key, fileContent, { contentType: 'text/markdown' });

  // 更新分类索引
  await updateCategoryIndex(locale, frontMatter.categoryId, productId, frontMatter, false);
  if (frontMatter.seriesId && frontMatter.seriesId !== frontMatter.categoryId) {
    await updateCategoryIndex(locale, frontMatter.seriesId, productId, frontMatter, true);
  }
}

/**
 * 删除产品
 */
export async function deleteProduct(locale: string, productId: string): Promise<void> {
  const product = await readProduct(locale, productId);
  if (!product) return;
  const storage = getPrivateStorage();
  const key = getProductMdKey(locale, productId);
  try {
    await storage.delete(key);
  } catch (error: any) {
    if (!(error?.message?.includes('NoSuchKey') || error?.code === 'NoSuchKey')) {
      throw error;
    }
  }
  // 从索引中移除
  await removeFromCategoryIndex(locale, product.categoryId, productId);
  if (product.seriesId && product.seriesId !== product.categoryId) {
    await removeFromCategoryIndex(locale, product.seriesId, productId);
  }
}

/**
 * 更新某个分类的 products.json（增量或全量重建）
 */
async function updateCategoryIndex(
  locale: string,
  categoryId: string,
  productId: string,
  frontMatter: ProductFrontMatter,
  isSeries: boolean
): Promise<void> {
  const storage = getPrivateStorage();
  const key = getCategoryIndexKey(locale, categoryId, isSeries);
  let index: ProductIndexItem[] = [];
  try {
    const content = await storage.read(key, 'utf8');
    const parsed = JSON.parse(content as string);
    index = parsed.items || [];
  } catch (error: any) {
    if (!(error?.message?.includes('File not found') || error?.code === 'NoSuchKey')) {
      throw error;
    }
    // 文件不存在，使用空数组
  }

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
  const indexContent = JSON.stringify({ updatedAt: new Date().toISOString(), items: index }, null, 2);
  await storage.write(key, indexContent, { contentType: 'application/json' });
}

/**
 * 从分类索引中移除产品
 */
async function removeFromCategoryIndex(locale: string, categoryId: string, productId: string): Promise<void> {
  const storage = getPrivateStorage();
  const key = getCategoryIndexKey(locale, categoryId, false);
  try {
    const content = await storage.read(key, 'utf8');
    const parsed = JSON.parse(content as string);
    parsed.items = parsed.items.filter((i: any) => i.productId !== productId);
    await storage.write(key, JSON.stringify(parsed, null, 2), { contentType: 'application/json' });
  } catch (error: any) {
    if (!(error?.message?.includes('File not found') || error?.code === 'NoSuchKey')) {
      throw error;
    }
    // 文件不存在，无需操作
  }
}

/**
 * 格式化价格区间
 */
function formatPriceRange(tiers: ProductFrontMatter['price_tiers'], currency: string): string {
  if (!tiers.length) return '-';
  const prices = tiers.map(t => t.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return `${min} ${currency}`;
  return `${min} - ${max} ${currency}`;
}

/**
 * 获取某个分类下的产品列表（从索引读取，支持分页）
 */
export async function listProductsByCategory(
  locale: string,
  categoryId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ items: ProductIndexItem[]; total: number }> {
  const storage = getPrivateStorage();
  const key = getCategoryIndexKey(locale, categoryId, false);
  try {
    const content = await storage.read(key, 'utf8');
    const { items } = JSON.parse(content as string);
    const sorted = [...items].sort((a, b) => a.order - b.order);
    const start = (page - 1) * pageSize;
    const paginated = sorted.slice(start, start + pageSize);
    return { items: paginated, total: items.length };
  } catch (error: any) {
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      return { items: [], total: 0 };
    }
    throw error;
  }
}