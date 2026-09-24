// lib/products/utils/helpers.ts
import { getPrivateStorage } from '@/lib/storage/factory';
import sql from '@/lib/db/admin';
import { Series, Category, ProductLine, ProductData } from '../types';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

/** 存储路径 */
export function getStorageKey(locale: string): string {
  return `products/${locale}/categories.json`;
}

/** 规范化 Series */
export function normalizeSeries(raw: any): Series {
  return {
    id: String(raw.id || ''),
    name: String(raw.name || ''),
    slug: String(raw.slug || ''),
    order: typeof raw.order === 'number' ? raw.order : 0,
    image: String(raw.image || ''),
    description: String(raw.description || ''),
    seoTitle: String(raw.seoTitle || ''),
    seoDescription: String(raw.seoDescription || ''),
    seoKeywords: String(raw.seoKeywords || ''),
  };
}

/** 规范化 Category */
export function normalizeCategory(raw: any): Category {
  return {
    id: String(raw.id || ''),
    name: String(raw.name || ''),
    slug: String(raw.slug || ''),
    order: typeof raw.order === 'number' ? raw.order : 0,
    productLineId: String(raw.productLineId || ''),
    templateId: String(raw.templateId || ''),
    image: String(raw.image || ''),
    description: String(raw.description || ''),
    seoTitle: String(raw.seoTitle || ''),
    seoDescription: String(raw.seoDescription || ''),
    seoKeywords: String(raw.seoKeywords || ''),
    attributeTemplateId: String(raw.attributeTemplateId || ''),
    series: (raw.series || []).map(normalizeSeries),
  };
}

/** 规范化 ProductLine */
export function normalizeProductLine(raw: any): ProductLine {
  return {
    id: String(raw.id || ''),
    name: String(raw.name || ''),
    order: typeof raw.order === 'number' ? raw.order : 0,
    templateId: String(raw.templateId || ''),
    slug: String(raw.slug || ''),
    seoTitle: String(raw.seoTitle || ''),
    seoDescription: String(raw.seoDescription || ''),
    seoKeywords: String(raw.seoKeywords || ''),
  };
}

/** 将完整图片 URL 转为相对路径（storage_key） */
export function toRelativeImageUrl(imageUrl: string): string {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    try {
      const urlObj = new URL(imageUrl);
      return urlObj.pathname.slice(1);
    } catch {
      return imageUrl;
    }
  }
  return imageUrl;
}

// ==================== 排序工具函数 ====================

function sortProductLines(lines: ProductLine[]): ProductLine[] {
  return [...lines].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function sortSeries(series: Series[]): Series[] {
  return [...series].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function sortCategories(categories: Category[]): Category[] {
  return categories
    .map(cat => ({
      ...cat,
      series: sortSeries(cat.series || []),
    }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

// ==================== 读写函数 ====================

/** 读取完整的 JSON 数据 */
export async function readFullData(locale: string): Promise<ProductData> {
  const storage = getPrivateStorage();
  const key = getStorageKey(locale);
  try {
    const content = await storage.read(key, 'utf8');
    const parsed = JSON.parse(content as string);
    return {
      productLines: parsed.productLines || [],
      categories: parsed.categories || [],
    };
  } catch (error: any) {
    if (error?.code === 'NoSuchKey' || error?.Code === 'NoSuchKey' || error?.message?.includes('File not found')) {
      return { productLines: [], categories: [] };
    }
    throw error;
  }
}

/** 写入完整的 JSON 数据（写入前自动排序） */
export async function writeFullData(locale: string, data: ProductData): Promise<void> {
  const storage = getPrivateStorage();
  const key = getStorageKey(locale);

  const sortedData = {
    productLines: sortProductLines(data.productLines || []),
    categories: sortCategories(data.categories || []),
  };

  await storage.write(key, JSON.stringify(sortedData, null, 2), { contentType: 'application/json' });
}

// ==================== 其他辅助函数 — 已迁移 ====================

/** 批量更新分类图片引用（与路由逻辑完全一致） */
export async function syncCategoryImageReferences(categories: Category[]): Promise<void> {
  const categoryIds = categories.map(cat => cat.id);

  // 1. 删除旧引用
  if (categoryIds.length > 0) {
    try {
      await sql`
        DELETE FROM public.file_references
        WHERE reference_type = 'product_category'
          AND reference_id IN ${sql(categoryIds)}
      `;
    } catch (delError) {
      console.error('批量删除引用失败:', delError);
    }
  }

  // 2. 收集需要插入的引用
  const insertBatch: Array<{
    file_id: string;
    reference_type: string;
    reference_id: string;
    alt_text: string;
    sort_order: number;
  }> = [];

  const imagePaths = categories
    .map(cat => cat.image)
    .filter(path => path && path.trim() !== '');

  if (imagePaths.length > 0) {
    let mediaFiles: { id: string; storage_key: string }[] = [];
    try {
      mediaFiles = await sql<{ id: string; storage_key: string }[]>`
        SELECT id, storage_key FROM public.media_files
        WHERE storage_key IN ${sql(imagePaths)}
      `;
    } catch (mediaError) {
      console.error('批量查询 media_files 失败:', mediaError);
    }

    if (mediaFiles.length > 0) {
      const storageKeyToId = new Map(mediaFiles.map(mf => [mf.storage_key, mf.id]));
      for (const cat of categories) {
        if (cat.image) {
          const fileId = storageKeyToId.get(cat.image);
          if (fileId) {
            insertBatch.push({
              file_id: fileId,
              reference_type: 'product_category',
              reference_id: cat.id,
              alt_text: '',
              sort_order: 0,
            });
          } else {
            console.warn(`未找到图片记录: ${cat.image}`);
          }
        }
      }
    }
  }

  // 3. 批量插入（✅ 显式传入 site_id）
  if (insertBatch.length > 0) {
    try {
      for (const item of insertBatch) {
        await sql`
          INSERT INTO public.file_references (
            site_id, file_id, reference_type, reference_id, alt_text, sort_order
          )
          VALUES (
            ${DEFAULT_SITE_ID},
            ${item.file_id}, ${item.reference_type}, ${item.reference_id},
            ${item.alt_text}, ${item.sort_order}
          )
        `;
      }
    } catch (insertError) {
      console.error('批量插入引用失败:', insertError);
    }
  }
}