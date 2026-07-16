// lib/videosys/services/category.service.ts
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

// ---------- 工具函数 ----------
function getCategoryKey(locale: string): string {
  return `videosys/${locale}/categories.json`;
}

// ---------- 数据访问层（内部） ----------
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
  await storage.write(key, JSON.stringify(categories, null, 2), {
    contentType: 'application/json',
  });
}

// ---------- 辅助函数：注册分类到 pages 表 ----------
/**
 * 将分类信息注册到 pages 表（异步，错误仅记录日志）
 */
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

// ---------- 服务函数 ----------

/**
 * 获取视频分类（返回对象映射）
 */
export async function getCategories(locale: string): Promise<VideoCategoriesMap> {
  return await readCategoriesRaw(locale);
}

/**
 * 获取视频分类列表（数组形式，按 order 排序）
 */
export async function getCategoriesList(locale: string): Promise<(VideoCategory & { key: string })[]> {
  const map = await readCategoriesRaw(locale);
  return Object.entries(map)
    .map(([key, cat]) => ({ key, ...cat }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * 获取单个分类
 */
export async function getCategory(locale: string, key: string): Promise<VideoCategory | null> {
  const map = await readCategoriesRaw(locale);
  return map[key] || null;
}

/**
 * 保存分类（覆盖整个 map）
 */
export async function saveCategories(locale: string, categories: VideoCategoriesMap): Promise<void> {
  await writeCategoriesRaw(locale, categories);
}

/**
 * 确保系统分类存在（产品视频）
 * 自动注册系统分类到 pages 表
 */
export async function ensureSystemCategory(locale: string): Promise<void> {
  const categories = await readCategoriesRaw(locale);
  const hasProductVideo = Object.values(categories).some(
    (cat) => cat.name === '产品视频' && cat.isSystem === true
  );
  if (!hasProductVideo) {
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
  }
}

/**
 * 更新分类（合并更新）
 * 更新后重新注册到 pages 表
 */
export async function updateCategory(
  locale: string,
  key: string,
  data: Partial<VideoCategory>
): Promise<void> {
  const categories = await readCategoriesRaw(locale);
  const existing = categories[key];
  if (!existing) {
    throw new Error('分类不存在');
  }
  // 系统分类保护
  if (existing.isSystem === true && data.isSystem === false) {
    data.isSystem = true; // 不允许取消系统标志
  }
  const updated = {
    ...existing,
    ...data,
  };
  categories[key] = updated;
  await writeCategoriesRaw(locale, categories);
  await registerCategoryToPages(locale, key, updated);
}

/**
 * 删除分类
 * 注意：调用前需先检查是否被视频使用（由路由层处理）
 * 删除对应的 pages 记录
 */
export async function deleteCategory(locale: string, key: string): Promise<void> {
  const categories = await readCategoriesRaw(locale);
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
 * 批量获取多个语言的分类（以 key 为键的对象）
 * 返回：{ [locale]: { [key]: VideoCategory } }
 */
export async function getCategoriesBatch(locales: string[]): Promise<Record<string, VideoCategoriesMap>> {
  const result: Record<string, VideoCategoriesMap> = {};
  await Promise.all(
    locales.map(async (loc) => {
      const data = await getCategories(loc);
      result[loc] = data;
    })
  );
  return result;
}

/**
 * 复制分类（从源语言复制到目标语言）
 * 若目标已有相同 key，则覆盖；否则新增
 * 复制后注册到目标语言的 pages 表
 */
export async function copyCategory(
  sourceLocale: string,
  targetLocale: string,
  key: string
): Promise<void> {
  if (sourceLocale === targetLocale) {
    throw new Error('源语言和目标语言不能相同');
  }

  // 获取源分类
  const sourceData = await getCategories(sourceLocale);
  const sourceCategory = sourceData[key];
  if (!sourceCategory) {
    throw new Error('源分类不存在');
  }

  // 获取目标分类
  let targetData = await getCategories(targetLocale);
  // 复制（保留所有字段，不改变 key）
  targetData[key] = { ...sourceCategory };

  // 保存
  await saveCategories(targetLocale, targetData);
  // 注册到目标语言 pages
  await registerCategoryToPages(targetLocale, key, targetData[key]);
}

/**
 * 创建分类（指定 key）
 * 适用于新增其他语言版本时，使用已有的 key
 * 创建后注册到 pages 表
 */
export async function createCategoryWithKey(
  locale: string,
  key: string,
  data: Partial<VideoCategory> & { name?: string; slug?: string }
): Promise<void> {
  const categories = await readCategoriesRaw(locale);
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
 * 批量更新视频分类翻译字段（若目标语言不存在则从源语言复制）
 * @param targetLocale 目标语言
 * @param translations 翻译数据数组，每个元素包含 key, name, seo_title, seo_description, seo_keywords
 * @param sourceLocale 源语言（可选，用于创建新产品时复制非翻译字段）
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
      // 检查目标语言是否存在该分类
      const targetCategories = await readCategoriesRaw(targetLocale);
      const existing = targetCategories[key];

      if (!existing) {
        // 目标不存在，尝试从源复制
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
        // 复制后重新读取目标分类并应用翻译字段
        const updatedTarget = await readCategoriesRaw(targetLocale);
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
        // 目标已存在，直接更新
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