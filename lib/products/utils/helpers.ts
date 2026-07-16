// lib/products/utils/helpers.ts
import { getPrivateStorage } from '@/lib/storage/factory';
import { supabase } from '@/lib/supabase/client';
import { Series, Category, ProductLine, ProductData } from '../types';

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

/** 读取完整的 JSON 数据，若文件不存在则返回空结构 */
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
    // 文件不存在则返回空结构
    if (error?.code === 'NoSuchKey' || error?.Code === 'NoSuchKey' || error?.message?.includes('File not found')) {
      return { productLines: [], categories: [] };
    }
    throw error;
  }
}

/** 写入完整的 JSON 数据 */
export async function writeFullData(locale: string, data: ProductData): Promise<void> {
  const storage = getPrivateStorage();
  const key = getStorageKey(locale);
  await storage.write(key, JSON.stringify(data, null, 2), { contentType: 'application/json' });
}

/** 批量更新分类图片引用（与路由逻辑完全一致） */
export async function syncCategoryImageReferences(categories: Category[]): Promise<void> {
  const categoryIds = categories.map(cat => cat.id);
  if (categoryIds.length > 0) {
    // 删除旧引用
    const { error: delError } = await supabase
      .from('file_references')
      .delete()
      .eq('reference_type', 'product_category')
      .in('reference_id', categoryIds);
    if (delError) console.error('批量删除引用失败:', delError);
  }

  // 收集需要插入的引用
  const insertBatch: any[] = [];
  const imagePaths = categories
    .map(cat => cat.image)
    .filter(path => path && path.trim() !== '');

  if (imagePaths.length > 0) {
    const { data: mediaFiles, error: mediaError } = await supabase
      .from('media_files')
      .select('id, storage_key')
      .in('storage_key', imagePaths);
    if (mediaError) {
      console.error('批量查询 media_files 失败:', mediaError);
    } else {
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

  if (insertBatch.length > 0) {
    const { error: insertError } = await supabase
      .from('file_references')
      .insert(insertBatch);
    if (insertError) console.error('批量插入引用失败:', insertError);
  }
}