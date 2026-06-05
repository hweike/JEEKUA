// lib/pages/index.ts
import { PageData, PageType, Visibility } from '@/types/page';
import {
  readPage,
  writePage,
  deletePageFile,
  listPages,
  getPageIdBySlug,
  isSlugExists,
  updateHreflangEntry,
  removeHreflangEntry,
  getHreflangMap,
  getAllLocales,
} from './storage';
import { toPinyin } from '@/lib/utils/pinyin';
import { getPrivateStorage } from '@/lib/storage/factory';

// hreflang 索引在私有桶中的存储 key
const HREFLANG_INDEX_KEY = 'data/pages/hreflang.json';

// 读取 hreflang 索引（从私有桶）
async function readHreflangIndex(): Promise<Record<string, Record<string, string>>> {
  const storage = getPrivateStorage();
  try {
    const content = await storage.read(HREFLANG_INDEX_KEY, 'utf8');
    return JSON.parse(content as string);
  } catch (error: any) {
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      return {};
    }
    console.error('读取 hreflang 索引失败:', error);
    return {};
  }
}

// 写入 hreflang 索引（到私有桶）
async function writeHreflangIndex(index: Record<string, Record<string, string>>): Promise<void> {
  const storage = getPrivateStorage();
  await storage.write(HREFLANG_INDEX_KEY, JSON.stringify(index, null, 2), {
    contentType: 'application/json',
  });
}

// 生成8位数字ID（基于时间戳+随机数）
export function generatePageId(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return (timestamp + random).slice(0, 8);
}

// 从标题生成slug（中文转拼音，空格转-，转小写，去除特殊字符）
export function generateSlugFromTitle(title: string): string {
  let slug = toPinyin(title);
  slug = slug.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'page';
}

// 确保slug唯一性（如果冲突则添加数字后缀）
export async function ensureUniqueSlug(locale: string, baseSlug: string, excludePageId?: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  while (await isSlugExists(locale, slug, excludePageId)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
}

// 创建新页面
export async function createPage(
  locale: string,
  data: {
    title: string;
    content: string;
    visible: Visibility;
    template: string;
    slug?: string;
    seo_keywords: string;
    seo_title: string;
    seo_description: string;
  }
): Promise<PageData> {
  const id = generatePageId();
  let slug = data.slug || generateSlugFromTitle(data.title);
  slug = await ensureUniqueSlug(locale, slug);
  const now = new Date().toISOString();

  const page: PageData = {
    id,
    title: data.title,
    type: 'custom',
    preset: false,
    visible: data.visible,
    template: data.template,
    slug,
    seo_keywords: data.seo_keywords,
    seo_title: data.seo_title,
    seo_description: data.seo_description,
    content: data.content,
    createdAt: now,
    updatedAt: now,
  };

  await writePage(locale, page); // 内部会自动更新 pages.json 索引
  // 更新 hreflang 索引（当前语言）
  const urlPath = `/${locale}/${slug}`;
  await updateHreflangEntry(id, locale, urlPath);
  return page;
}

// 更新页面
export async function updatePage(
  locale: string,
  pageId: string,
  data: Partial<Omit<PageData, 'id' | 'createdAt' | 'preset' | 'type'>>
): Promise<PageData> {
  const existing = await readPage(locale, pageId);
  if (!existing) throw new Error('Page not found');

  // 不可修改预设页面（preset 页面不允许更新）
  if (existing.preset) {
    throw new Error('Cannot modify preset page');
  }

  const updated: PageData = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  // 如果 slug 有变化，需要检查唯一性并更新 hreflang URL
  if (data.slug && data.slug !== existing.slug) {
    const newSlug = await ensureUniqueSlug(locale, data.slug, pageId);
    updated.slug = newSlug;
    // 更新 hreflang 中的 URL
    const newUrl = `/${locale}/${newSlug}`;
    await updateHreflangEntry(pageId, locale, newUrl);
  }

  await writePage(locale, updated); // 内部自动更新 pages.json 索引
  return updated;
}

// 删除页面
export async function deletePage(locale: string, pageId: string): Promise<void> {
  const page = await readPage(locale, pageId);
  if (!page) throw new Error('Page not found');
  if (page.preset) throw new Error('Cannot delete preset page');

  await deletePageFile(locale, pageId); // 内部自动删除 pages.json 中的条目

  // 处理 hreflang 索引：若该页面只有当前语言条目，则整体移除；否则仅移除当前语言
  const hreflangMap = await getHreflangMap(pageId);
  if (Object.keys(hreflangMap).length <= 1) {
    await removeHreflangEntry(pageId);
  } else {
    await removeHreflangLocale(pageId, locale);
  }
}

// 移除某个页面的特定语言 hreflang 条目
async function removeHreflangLocale(pageId: string, locale: string): Promise<void> {
  const index = await readHreflangIndex();
  if (index[pageId]) {
    delete index[pageId][locale];
    if (Object.keys(index[pageId]).length === 0) {
      delete index[pageId];
    }
    await writeHreflangIndex(index);
  }
}

// 获取页面列表（带基本元数据，无 content 字段）
export async function getPageList(locale: string): Promise<Array<{ id: string; title: string; slug: string; visible: Visibility; updatedAt: string; type: PageType; preset: boolean }>> {
  const pages = await listPages(locale);
  return pages.map(p => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    visible: p.visible,
    updatedAt: p.updatedAt,
    type: p.type,
    preset: p.preset,
  }));
}

// 同步复制页面到其他站点
export async function syncPageToLocales(
  pageId: string,
  sourceLocale: string,
  targetLocales: string[]
): Promise<{ success: string[]; failed: { locale: string; error: string }[] }> {
  const sourcePage = await readPage(sourceLocale, pageId);
  if (!sourcePage) throw new Error('Source page not found');

  const success: string[] = [];
  const failed: { locale: string; error: string }[] = [];

  for (const targetLocale of targetLocales) {
    try {
      let targetSlug = sourcePage.slug;
      // 检查目标语言下 slug 是否冲突
      const existingPageId = await getPageIdBySlug(targetLocale, targetSlug);
      if (existingPageId && existingPageId !== pageId) {
        targetSlug = await ensureUniqueSlug(targetLocale, targetSlug);
      }
      const targetPage: PageData = {
        ...sourcePage,
        slug: targetSlug,
        updatedAt: new Date().toISOString(),
      };
      await writePage(targetLocale, targetPage); // 自动更新目标语言的索引
      const urlPath = `/${targetLocale}/${targetSlug}`;
      await updateHreflangEntry(pageId, targetLocale, urlPath);
      success.push(targetLocale);
    } catch (error) {
      failed.push({ locale: targetLocale, error: (error as Error).message });
    }
  }
  return { success, failed };
}