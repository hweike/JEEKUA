// lib/videosys/services/category.service.ts
import { revalidateTag } from 'next/cache';
import { getPrivateStorage } from '@/lib/storage/factory';
import { registerEntity } from '@/lib/discovery/services/business-register-pages.service';
import { deletePage } from '@/lib/discovery/register';

// ---------- 类型定义 ----------
export interface VideoCategory {
  name: string;
  slug: string;
  order: number;
  commentStatus?: 'disabled' | 'pending' | 'allowed';
  template?: string;
  seo_keywords?: string;
  seo_title?: string;
  seo_description?: string;
  isSystem?: boolean;
  [key: string]: any;
}

export interface VideoCategoriesMap {
  [key: string]: VideoCategory;
}

// ---------- 缓存层 ----------
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const categoriesCache: Record<string, CacheEntry<VideoCategoriesMap>> = {};
const systemCategoryChecked: Record<string, number> = {};

const CACHE_TTL = 60 * 1000;              // 分类数据缓存 60 秒
const SYSTEM_CHECK_TTL = 5 * 60 * 1000;   // 系统分类检查缓存 5 分钟

function invalidateCategoriesCache(locale: string): void {
  delete categoriesCache[locale];
}

function invalidateAllCache(): void {
  Object.keys(categoriesCache).forEach(k => delete categoriesCache[k]);
  Object.keys(systemCategoryChecked).forEach(k => delete systemCategoryChecked[k]);
}

/**
 * 深拷贝工具：避免缓存对象被调用方直接修改
 */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ---------- 工具函数 ----------
function getCategoryKey(locale: string): string {
  return `videosys/${locale}/categories.json`;
}

// ---------- 数据访问层（内部，无缓存） ----------
async function readCategoriesRaw(locale: string): Promise<VideoCategoriesMap> {
  const storage = getPrivateStorage();
  const key = getCategoryKey(locale);
  try {
    const content = await storage.read(key, 'utf8');
    return JSON.parse(content as string);
  } catch (error: any) {
    if (error?.Code === 'NoSuchKey' || error?.code === 'NoSuchKey' || error?.message?.includes('NoSuchKey')) {
      return {};
    }
    console.error(`读取视频分类文件失败 [${locale}]:`, error);
    throw error;
  }
}

async function writeCategoriesRaw(locale: string, categories: VideoCategoriesMap): Promise<void> {
  const storage = getPrivateStorage();
  const key = getCategoryKey(locale);

  console.log(`[writeCategoriesRaw] 开始写入 locale=${locale} key=${key}`);
  const before = Date.now();

  await storage.write(key, JSON.stringify(categories, null, 2), {
    contentType: 'application/json',
  });

  console.log(`[writeCategoriesRaw] 写入完成，耗时 ${Date.now() - before}ms`);

  // 写后校验：确认真的落盘
  try {
    const verify = await storage.read(key, 'utf8');
    const parsed = JSON.parse(verify as string);
    const expectedKeys = Object.keys(categories);
    const actualKeys = Object.keys(parsed);
    console.log(`[writeCategoriesRaw] 写入后校验`, {
      targetKey: key,
      expectedCount: expectedKeys.length,
      actualCount: actualKeys.length,
      match: expectedKeys.length === actualKeys.length,
    });
  } catch (verifyErr) {
    console.error(`[writeCategoriesRaw] 写入后校验失败:`, verifyErr);
  }

  // 清内存缓存
  invalidateCategoriesCache(locale);

  // 清 Next.js unstable_cache
  try {
    revalidateTag('video-categories', 'max');
    revalidateTag('video-config', 'max');
  } catch (err) {
    console.warn('[category.service] revalidateTag failed:', err);
  }
}

// ---------- 辅助函数：注册分类到 pages 表 ----------
async function registerCategoryToPages(locale: string, key: string, category: VideoCategory): Promise<void> {
  const now = new Date().toISOString();
  const categoryData = {
    id: key,
    name: category.name,
    slug: category.slug,
    seo_title: category.seo_title,
    seo_description: category.seo_description,
    seo_keywords: category.seo_keywords,
  };
  registerEntity({
    type: 'videoCategory',
    id: key,
    locale,
    data: categoryData,
    updatedAt: now,
  }).catch(err => console.error(`注册视频分类到 pages 失败 (${key}, ${locale}):`, err));
}

// ---------- 服务函数（带缓存） ----------

/**
 * 获取视频分类（返回对象映射，带缓存）
 * ⚠️ 返回深拷贝，避免调用方修改缓存对象导致持久化失败
 */
export async function getCategories(locale: string): Promise<VideoCategoriesMap> {
  const now = Date.now();
  const cached = categoriesCache[locale];
  if (cached && now - cached.timestamp < CACHE_TTL) {
    // 返回深拷贝，避免调用方污染缓存
    return deepClone(cached.data);
  }
  const data = await readCategoriesRaw(locale);
  categoriesCache[locale] = { data, timestamp: now };
  // 返回深拷贝
  return deepClone(data);
}

/**
 * 获取视频分类列表（数组形式，按 order 排序）
 */
export async function getCategoriesList(locale: string): Promise<(VideoCategory & { key: string })[]> {
  const map = await getCategories(locale);
  return Object.entries(map)
    .map(([key, cat]) => ({ key, ...cat }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * 获取单个分类（走缓存）
 */
export async function getCategory(locale: string, key: string): Promise<VideoCategory | null> {
  const map = await getCategories(locale);
  return map[key] ? deepClone(map[key]) : null;
}

/**
 * 保存分类（覆盖整个 map）
 */
export async function saveCategories(locale: string, categories: VideoCategoriesMap): Promise<void> {
  await writeCategoriesRaw(locale, categories);
}

/**
 * 确保系统分类存在（产品视频）
 * 只在 key 不存在时创建，不依赖 name 或 isSystem 判断
 * 已存在时不做任何修改，允许用户自由修改名称、SEO 等信息
 */
export async function ensureSystemCategory(locale: string): Promise<void> {
  const now = Date.now();
  if (systemCategoryChecked[locale] && now - systemCategoryChecked[locale] < SYSTEM_CHECK_TTL) {
    return;
  }

  const categories = await getCategories(locale);

  // ✅ 只判断 key 是否存在，存在就跳过，不覆盖任何字段
  if (categories['product-video']) {
    systemCategoryChecked[locale] = now;
    return;
  }

  // key 不存在时才创建
  const systemKey = 'product-video';
  categories[systemKey] = {
    name: '产品视频',
    slug: 'product-video',
    order: 0,
    commentStatus: 'allowed',
    isSystem: true,
    template: '',
    seo_keywords: '',
    seo_title: '',
    seo_description: '',
  };

  await writeCategoriesRaw(locale, categories);
  await registerCategoryToPages(locale, systemKey, categories[systemKey]);

  systemCategoryChecked[locale] = now;
}

/**
 * 更新分类（合并更新）
 * 更新后重新注册到 pages 表，并清缓存
 */
export async function updateCategory(
  locale: string,
  key: string,
  data: Partial<VideoCategory>
): Promise<void> {
  const categories = await getCategories(locale); // 已经是深拷贝
  const existing = categories[key];
  if (!existing) {
    throw new Error('分类不存在');
  }
  if (existing.isSystem === true && data.isSystem === false) {
    data.isSystem = true;
  }
  const updated = { ...existing, ...data };
  categories[key] = updated;
  await writeCategoriesRaw(locale, categories);
  await registerCategoryToPages(locale, key, updated);
}

/**
 * 删除分类
 * 删除后清缓存和 pages 记录
 */
export async function deleteCategory(locale: string, key: string): Promise<void> {
  const categories = await getCategories(locale); // 已经是深拷贝
  const target = categories[key];
  if (!target) {
    throw new Error('分类不存在');
  }
  if (target.isSystem === true) {
    throw new Error('系统分类不可删除');
  }
  delete categories[key];
  await writeCategoriesRaw(locale, categories);
  const pageId = `videoCategory:${key}`;
  try {
    await deletePage(pageId, locale);
  } catch (err) {
    console.error(`删除视频分类 pages 失败 (${pageId}):`, err);
  }
}

// ---------- 批量操作 ----------

/**
 * 批量获取多个语言的分类（走缓存，并发生效）
 */
export async function getCategoriesBatch(locales: string[]): Promise<Record<string, VideoCategoriesMap>> {
  const result: Record<string, VideoCategoriesMap> = {};
  await Promise.all(
    locales.map(async (loc) => {
      result[loc] = await getCategories(loc);
    })
  );
  return result;
}

/**
 * 复制分类（从源语言复制到目标语言）
 */
export async function copyCategory(
  sourceLocale: string,
  targetLocale: string,
  key: string
): Promise<void> {
  if (sourceLocale === targetLocale) {
    throw new Error('源语言和目标语言不能相同');
  }
  const sourceData = await getCategories(sourceLocale);
  const sourceCategory = sourceData[key];
  if (!sourceCategory) {
    throw new Error('源分类不存在');
  }
  const targetData = await getCategories(targetLocale);
  targetData[key] = { ...sourceCategory };
  await saveCategories(targetLocale, targetData);
  await registerCategoryToPages(targetLocale, key, targetData[key]);
}

/**
 * 创建分类（指定 key）
 */
export async function createCategoryWithKey(
  locale: string,
  key: string,
  data: Partial<VideoCategory> & { name?: string; slug?: string }
): Promise<void> {
  const categories = await getCategories(locale);
  if (categories[key]) {
    throw new Error('该分类 key 已存在，请使用更新操作');
  }
  const newCategory: VideoCategory = {
    name: data.name || '',
    slug: data.slug || key,
    order: data.order ?? 0,
    commentStatus: data.commentStatus || 'allowed',
    template: data.template || '',
    seo_keywords: data.seo_keywords || '',
    seo_title: data.seo_title || '',
    seo_description: data.seo_description || '',
    isSystem: data.isSystem || false,
  };
  categories[key] = newCategory;
  await writeCategoriesRaw(locale, categories);
  await registerCategoryToPages(locale, key, newCategory);
}

/**
 * 批量更新视频分类翻译字段
 */
export async function updateCategoryTranslations(
  targetLocale: string,
  translations: Array<{
    key: string;
    name?: string;
    seo_title?: string;
    seo_description?: string;
    seo_keywords?: string;
  }>,
  sourceLocale?: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const trans of translations) {
    const { key, name, seo_title, seo_description, seo_keywords } = trans;
    try {
      const targetCategories = await getCategories(targetLocale);
      const existing = targetCategories[key];

      if (!existing) {
        if (!sourceLocale) {
          errors.push(`分类 ${key} 在目标语言中不存在且未提供源语言`);
          failed++;
          continue;
        }
        try {
          await copyCategory(sourceLocale, targetLocale, key);
        } catch (copyErr: any) {
          errors.push(`复制分类 ${key} 失败: ${copyErr.message}`);
          failed++;
          continue;
        }
        const updatedTarget = await getCategories(targetLocale);
        const updated = updatedTarget[key];
        if (!updated) {
          errors.push(`复制后无法找到分类 ${key}`);
          failed++;
          continue;
        }
        if (name !== undefined) updated.name = name;
        if (seo_title !== undefined) updated.seo_title = seo_title;
        if (seo_description !== undefined) updated.seo_description = seo_description;
        if (seo_keywords !== undefined) updated.seo_keywords = seo_keywords;
        await writeCategoriesRaw(targetLocale, updatedTarget);
        await registerCategoryToPages(targetLocale, key, updated);
        success++;
      } else {
        if (name !== undefined) existing.name = name;
        if (seo_title !== undefined) existing.seo_title = seo_title;
        if (seo_description !== undefined) existing.seo_description = seo_description;
        if (seo_keywords !== undefined) existing.seo_keywords = seo_keywords;
        await writeCategoriesRaw(targetLocale, targetCategories);
        await registerCategoryToPages(targetLocale, key, existing);
        success++;
      }
    } catch (err: any) {
      errors.push(`处理分类 ${key} 失败: ${err.message}`);
      failed++;
    }
  }

  return { success, failed, errors };
}

// ---------- 导出缓存清理接口（供其他模块调用） ----------
export { invalidateCategoriesCache, invalidateAllCache };