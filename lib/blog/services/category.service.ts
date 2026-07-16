// lib/blog/services/category.service.ts
import { getPrivateStorage } from '@/lib/storage/factory';
import { registerEntity } from '@/lib/discovery/services/business-register-pages.service';
import { deletePage } from '@/lib/discovery/register';
import type { PageData } from '@/lib/discovery/register';

// ---------- 类型定义 ----------
export interface BlogCategory {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  parentId?: string | null;
  order?: number;
  cover_image?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

// ---------- 工具函数 ----------
function generateId(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

function getCategoryKey(locale: string): string {
  return `blog/${locale}/categories.json`;
}

// ---------- 数据访问层（内部使用） ----------
async function readCategoriesRaw(locale: string): Promise<BlogCategory[]> {
  const storage = getPrivateStorage();
  const key = getCategoryKey(locale);
  try {
    const content = await storage.read(key, 'utf8');
    return JSON.parse(content as string);
  } catch (error: any) {
    if (error?.Code === 'NoSuchKey' || error?.code === 'NoSuchKey' || error?.message?.includes('NoSuchKey')) {
      return [];
    }
    console.error(`读取分类文件失败 [${locale}]:`, error);
    throw error;
  }
}

async function writeCategoriesRaw(locale: string, categories: BlogCategory[]): Promise<void> {
  const storage = getPrivateStorage();
  const key = getCategoryKey(locale);
  await storage.write(key, JSON.stringify(categories, null, 2), {
    contentType: 'application/json',
  });
}

// ---------- 内部辅助：注册分类到 pages ----------
async function registerCategoryToPages(
  category: BlogCategory,
  locale: string,
  updatedAt: string
): Promise<void> {
  registerEntity({
    type: 'blogCategory',
    id: category.id,
    locale,
    data: category,
    updatedAt,
  }).catch(err => console.error(`注册博客分类失败 (${category.id}):`, err));
}

// ---------- 导出服务函数 ----------

/**
 * 获取指定语言的分类列表
 */
export async function getCategories(locale: string): Promise<BlogCategory[]> {
  return await readCategoriesRaw(locale);
}

/**
 * 批量获取多个语言的分类列表
 */
export async function getCategoriesBatch(locales: string[]): Promise<Record<string, BlogCategory[]>> {
  const result: Record<string, BlogCategory[]> = {};
  await Promise.all(
    locales.map(async (loc) => {
      result[loc] = await readCategoriesRaw(loc);
    })
  );
  return result;
}

/**
 * 创建分类（可指定 ID，若不指定则自动生成）
 */
export async function createCategory(
  locale: string,
  data: Omit<BlogCategory, 'id' | 'created_at' | 'updated_at'>,
  id?: string
): Promise<BlogCategory> {
  const categories = await readCategoriesRaw(locale);
  const newId = id || generateId();
  const now = new Date().toISOString();
  const newCategory: BlogCategory = {
    id: newId,
    ...data,
    created_at: now,
    updated_at: now,
  };
  categories.push(newCategory);
  await writeCategoriesRaw(locale, categories);
  await registerCategoryToPages(newCategory, locale, now);
  return newCategory;
}

/**
 * 复制分类（从源语言复制到目标语言）
 * 若目标已有相同 ID，则覆盖；否则新增
 */
export async function copyCategory(
  sourceLocale: string,
  targetLocale: string,
  id: string
): Promise<BlogCategory> {
  if (sourceLocale === targetLocale) {
    throw new Error('源语言和目标语言不能相同');
  }

  const sourceCategories = await readCategoriesRaw(sourceLocale);
  const sourceCategory = sourceCategories.find((c) => c.id === id);
  if (!sourceCategory) {
    throw new Error('源分类不存在');
  }

  let targetCategories = await readCategoriesRaw(targetLocale);
  const existingIndex = targetCategories.findIndex((c) => c.id === id);
  const now = new Date().toISOString();
  const cloned: BlogCategory = {
    ...sourceCategory,
    updated_at: now,
    created_at: sourceCategory.created_at || now,
  };
  delete (cloned as any)._id;

  if (existingIndex !== -1) {
    targetCategories[existingIndex] = cloned;
  } else {
    targetCategories.push(cloned);
  }
  await writeCategoriesRaw(targetLocale, targetCategories);
  await registerCategoryToPages(cloned, targetLocale, now);
  return cloned;
}

/**
 * 更新分类
 */
export async function updateCategory(
  locale: string,
  id: string,
  data: Partial<Omit<BlogCategory, 'id' | 'created_at' | 'updated_at'>>
): Promise<BlogCategory> {
  const categories = await readCategoriesRaw(locale);
  const index = categories.findIndex((c) => c.id === id);
  if (index === -1) {
    throw new Error('分类不存在');
  }
  const now = new Date().toISOString();
  const updated: BlogCategory = {
    ...categories[index],
    ...data,
    updated_at: now,
  };
  categories[index] = updated;
  await writeCategoriesRaw(locale, categories);
  await registerCategoryToPages(updated, locale, now);
  return updated;
}

/**
 * 删除分类
 */
export async function deleteCategory(locale: string, id: string): Promise<void> {
  let categories = await readCategoriesRaw(locale);
  const filtered = categories.filter((c) => c.id !== id);
  if (filtered.length === categories.length) {
    throw new Error('分类不存在');
  }
  await writeCategoriesRaw(locale, filtered);

  const pageId = `blogCategory:${id}`;
  try {
    await deletePage(pageId, locale);
  } catch (err) {
    console.error(`删除博客分类 pages 失败 (${pageId}):`, err);
  }
}

/**
 * 判断分类是否存在
 */
export async function categoryExists(locale: string, id: string): Promise<boolean> {
  const categories = await readCategoriesRaw(locale);
  return categories.some((c) => c.id === id);
}

/**
 * 批量更新博客分类翻译字段（若目标语言不存在则从源语言复制）
 */
export async function updateCategoryTranslations(
  targetLocale: string,
  translations: Array<{
    id: string;
    name?: string;          // 这里的 name 参数对应分类标题
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
    const { id, name, seo_title, seo_description, seo_keywords } = trans;

    try {
      const targetCategories = await readCategoriesRaw(targetLocale);
      const existingIndex = targetCategories.findIndex((c) => c.id === id);

      if (existingIndex === -1) {
        if (!sourceLocale) {
          errors.push(`分类 ${id} 在目标语言中不存在且未提供源语言`);
          failed++;
          continue;
        }
        try {
          await copyCategory(sourceLocale, targetLocale, id);
        } catch (copyErr: any) {
          errors.push(`复制分类 ${id} 失败: ${copyErr.message}`);
          failed++;
          continue;
        }
        const updatedTarget = await readCategoriesRaw(targetLocale);
        const newIndex = updatedTarget.findIndex((c) => c.id === id);
        if (newIndex === -1) {
          errors.push(`复制后无法找到分类 ${id}`);
          failed++;
          continue;
        }
        const category = updatedTarget[newIndex];
        if (name !== undefined) category.title = name; // ← 修正：title
        if (seo_title !== undefined) category.seo_title = seo_title;
        if (seo_description !== undefined) category.seo_description = seo_description;
        if (seo_keywords !== undefined) category.seo_keywords = seo_keywords;
        const now = new Date().toISOString();
        category.updated_at = now;
        await writeCategoriesRaw(targetLocale, updatedTarget);
        await registerCategoryToPages(category, targetLocale, now);
        success++;
      } else {
        const category = targetCategories[existingIndex];
        if (name !== undefined) category.title = name; // ← 修正：title
        if (seo_title !== undefined) category.seo_title = seo_title;
        if (seo_description !== undefined) category.seo_description = seo_description;
        if (seo_keywords !== undefined) category.seo_keywords = seo_keywords;
        const now = new Date().toISOString();
        category.updated_at = now;
        await writeCategoriesRaw(targetLocale, targetCategories);
        await registerCategoryToPages(category, targetLocale, now);
        success++;
      }
    } catch (err: any) {
      errors.push(`处理分类 ${id} 失败: ${err.message}`);
      failed++;
    }
  }

  return { success, failed, errors };
}