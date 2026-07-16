// lib/products/services/category.service.ts
import {
  readFullData,
  writeFullData,
  normalizeCategory,
  toRelativeImageUrl,
  syncCategoryImageReferences,
} from '../utils/helpers';
import { Category } from '@/lib/products/types'; // 使用绝对路径确保找到类型
import { deletePage } from '@/lib/discovery/register';
import { registerEntity } from '@/lib/discovery/services/business-register-pages.service';

// ---------- 内存缓存 ----------
const cache = new Map<string, { data: Category[]; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 60 秒

/**
 * 收集所有分类的 pageId（包括父级和子级）
 */
function collectCategoryPageIds(categories: Category[]): string[] {
  const ids: string[] = [];
  for (const cat of categories) {
    ids.push(`productCollection:${cat.id}`);
    if (cat.series) {
      for (const sub of cat.series) {
        ids.push(`productCollection:${cat.id}/${sub.id}`);
      }
    }
  }
  return ids;
}

/**
 * 获取指定语言的所有分类（含 series），已排序
 * 使用内存缓存加速重复请求
 */
export async function getCategories(locale: string): Promise<Category[]> {
  const cacheKey = `categories_${locale}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const full = await readFullData(locale);
  const categories: Category[] = full.categories.map((raw: any) => normalizeCategory(raw));
  categories.sort((a: Category, b: Category) => a.order - b.order);
  categories.forEach((cat: Category) => cat.series.sort((a: any, b: any) => a.order - b.order));

  cache.set(cacheKey, { data: categories, timestamp: Date.now() });
  return categories;
}

/**
 * 保存分类数据（覆盖原有 categories，保留 productLines 不变）
 * 自动处理：
 * - 删除被移除的分类（包括子级）对应的 pages 记录
 * - 图片 URL 转换为相对路径，并同步更新 file_references
 * - 异步注册新增/更新的分类（父级和子级）到 pages 表
 */
export async function saveCategories(locale: string, categories: Category[]): Promise<void> {
  const full = await readFullData(locale);

  // 获取旧分类列表
  const oldCategories: Category[] = full.categories.map((raw: any) => normalizeCategory(raw));
  const oldPageIds = collectCategoryPageIds(oldCategories);
  const newPageIds = collectCategoryPageIds(categories);

  // 删除被移除的分类对应的 pages 记录
  const deletedPageIds = oldPageIds.filter((id) => !newPageIds.includes(id));
  for (const pageId of deletedPageIds) {
    try {
      await deletePage(pageId, locale);
    } catch (err) {
      console.error(`删除分类 pages 失败 (pageId: ${pageId}):`, err);
    }
  }

  // 规范化并转换图片路径
  const cleanedCategories: Category[] = categories.map((cat: Category) => ({
    ...normalizeCategory(cat),
    image: toRelativeImageUrl(cat.image),
    series: cat.series.map((series: any) => ({
      ...series,
      image: toRelativeImageUrl(series.image),
    })),
  }));

  // 更新并写入
  full.categories = cleanedCategories;
  await writeFullData(locale, full);
  await syncCategoryImageReferences(cleanedCategories);

  // 清除缓存
  const cacheKey = `categories_${locale}`;
  cache.delete(cacheKey);

  // 异步注册所有分类到 pages 表
  const registerPromises: Promise<void>[] = [];
  const now = new Date().toISOString();

  for (const cat of cleanedCategories) {
    // 父级
    registerPromises.push(
      registerEntity({
        type: 'productCollection',
        id: cat.id,
        locale,
        data: cat,
        updatedAt: now,
      }).catch((err) => {
        console.error(`注册父分类到 pages 失败 (id: ${cat.id}):`, err);
      })
    );

    // 子级
    if (cat.series && cat.series.length > 0) {
      for (const sub of cat.series) {
        registerPromises.push(
          registerEntity({
            type: 'productCollection',
            id: sub.id,
            locale,
            data: sub,
            parentId: cat.id,
            parentSlug: cat.slug,
            updatedAt: now,
          }).catch((err) => {
            console.error(`注册子分类到 pages 失败 (id: ${sub.id}):`, err);
          })
        );
      }
    }
  }

  Promise.allSettled(registerPromises);
}