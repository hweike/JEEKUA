// lib/products/indexManager.ts
import fs from 'fs/promises';
import path from 'path';

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

function getIndexPath(locale: string, categoryId: string, seriesId?: string) {
  if (seriesId) {
    return path.join(process.cwd(), 'data', 'products', locale, 'categories', categoryId, seriesId, 'products.json');
  } else {
    return path.join(process.cwd(), 'data', 'products', locale, 'categories', categoryId, 'products.json');
  }
}

export async function readCategoryIndex(locale: string, categoryId: string, seriesId?: string): Promise<CategoryIndex> {
  const filePath = getIndexPath(locale, categoryId, seriesId);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { updatedAt: new Date().toISOString(), items: [] };
  }
}

export async function writeCategoryIndex(locale: string, categoryId: string, index: CategoryIndex, seriesId?: string) {
  const filePath = getIndexPath(locale, categoryId, seriesId);
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(index, null, 2), 'utf-8');
}

export async function upsertProductInIndex(
  locale: string,
  categoryId: string,
  seriesId: string | null,
  item: IndexItem
) {
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

export async function removeProductFromIndex(locale: string, categoryId: string, seriesId: string | null, productId: string) {
  const index = await readCategoryIndex(locale, categoryId, seriesId || undefined);
  const newItems = index.items.filter(i => i.productId !== productId);
  if (newItems.length === index.items.length) return;
  index.items = newItems;
  index.updatedAt = new Date().toISOString();
  await writeCategoryIndex(locale, categoryId, index, seriesId || undefined);
}