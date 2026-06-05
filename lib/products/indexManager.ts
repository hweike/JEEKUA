// lib/products/indexManager.ts
import { getPrivateStorage } from '@/lib/storage/factory';

export interface IndexItem {
  productId: string;
  name: string;
  sku: string;
  mainImage: string;
  priceRange: string;
  minOrderQuantity: number;
  order: number;
  updatedAt: string;
}

export interface CategoryIndex {
  updatedAt: string;
  items: IndexItem[];
}

/**
 * 获取分类索引文件在私有桶中的存储 Key
 */
function getIndexKey(locale: string, categoryId: string, seriesId?: string): string {
  if (seriesId) {
    return `data/products/${locale}/categories/${categoryId}/${seriesId}/products.json`;
  } else {
    return `data/products/${locale}/categories/${categoryId}/products.json`;
  }
}

/**
 * 读取分类索引
 */
export async function readCategoryIndex(locale: string, categoryId: string, seriesId?: string): Promise<CategoryIndex> {
  const storage = getPrivateStorage();
  const key = getIndexKey(locale, categoryId, seriesId);
  try {
    const content = await storage.read(key, 'utf8');
    return JSON.parse(content as string);
  } catch (error: any) {
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      return { updatedAt: new Date().toISOString(), items: [] };
    }
    throw error;
  }
}

/**
 * 写入分类索引
 */
export async function writeCategoryIndex(locale: string, categoryId: string, index: CategoryIndex, seriesId?: string): Promise<void> {
  const storage = getPrivateStorage();
  const key = getIndexKey(locale, categoryId, seriesId);
  await storage.write(key, JSON.stringify(index, null, 2), {
    contentType: 'application/json',
  });
}

/**
 * 插入或更新产品到分类索引
 */
export async function upsertProductInIndex(
  locale: string,
  categoryId: string,
  seriesId: string | null,
  item: IndexItem
): Promise<void> {
  const index = await readCategoryIndex(locale, categoryId, seriesId || undefined);
  const existingIndex = index.items.findIndex(i => i.productId === item.productId);
  if (existingIndex >= 0) {
    index.items[existingIndex] = item;
  } else {
    index.items.push(item);
  }
  index.items.sort((a, b) => a.order - b.order);
  index.updatedAt = new Date().toISOString();
  await writeCategoryIndex(locale, categoryId, index, seriesId || undefined);
}

/**
 * 从分类索引中移除产品
 */
export async function removeProductFromIndex(locale: string, categoryId: string, seriesId: string | null, productId: string): Promise<void> {
  const index = await readCategoryIndex(locale, categoryId, seriesId || undefined);
  const newItems = index.items.filter(i => i.productId !== productId);
  if (newItems.length === index.items.length) return;
  index.items = newItems;
  index.updatedAt = new Date().toISOString();
  await writeCategoryIndex(locale, categoryId, index, seriesId || undefined);
}