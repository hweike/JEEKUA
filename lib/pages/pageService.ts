// lib/pages/pageService.ts
import { PageData, PageType, Visibility } from '@/types/page';
import {
  readPage,
  writePage,
  deletePageFile,
  listPages,
  getPageIdBySlug,
  isSlugExists,
  getAllLocales,
} from './storage';
import { toPinyin } from '@/lib/utils/pinyin';
import { getTemplateById } from '@/lib/webbuilder/template-manager';
import { createHash } from 'crypto';
import { registerEntity } from '@/lib/discovery/services/business-register-pages.service';
import { deletePage as deleteDiscoveryPage } from '@/lib/discovery/register';

// ========== 工具函数 ==========
function computeTemplateHash(data: any): string {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function generatePageId(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return (timestamp + random).slice(0, 8);
}

export function generateSlugFromTitle(title: string): string {
  let slug = toPinyin(title);
  slug = slug.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'page';
}

export async function ensureUniqueSlug(locale: string, baseSlug: string, excludePageId?: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  while (await isSlugExists(locale, slug, excludePageId)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
}

// ========== 内部辅助函数 ==========

/** 获取模板数据并计算哈希（缓存模板结果） */
async function fetchTemplateDataAndHash(templateId: string): Promise<{ data: any; hash: string } | null> {
  if (!templateId) return null;
  const template = await getTemplateById(templateId);
  if (!template) return null;
  const data = template.data;
  const hash = computeTemplateHash(data);
  return { data, hash };
}

/** 注册页面到 discovery pages 表（异步，错误仅记录日志） */
async function registerPageToDiscovery(locale: string, page: PageData): Promise<void> {
  // ===== 强制类型映射（与 register.ts 保持一致） =====
  const FORCED_TYPE_MAP: Record<string, string> = {
    '10000001': 'home',
    // 可添加更多：'10000002': 'inquiry', 等
  };
  let pageType: string;
  if (page.type === 'policy') {
    pageType = 'policy';
  } else {
    pageType = FORCED_TYPE_MAP[page.id] || 'page';
  }
  // =====================================================

  const pageData = {
    id: page.id,
    title: page.title,
    slug: page.slug,
    content: page.content || '',
    seo_title: page.seo_title,
    seo_description: page.seo_description,
    seo_keywords: page.seo_keywords,
    type: pageType,
  };
  registerEntity({
    type: 'page',
    id: page.id,
    locale,
    data: pageData,
    updatedAt: page.updatedAt,
  }).catch(err => console.error(`注册页面失败 (${page.id}):`, err));
}

/** 应用更新字段到页面对象，并处理模板数据变化 */
async function applyPageUpdates(
  page: PageData,
  updates: Partial<Omit<PageData, 'id' | 'createdAt' | 'preset' | 'type'>>,
  locale: string,
  excludeId?: string
): Promise<PageData> {
  const updated = { ...page, ...updates };

  // 如果模板发生变化，重新获取模板数据和哈希
  if (updates.template && updates.template !== page.template) {
    const fetched = await fetchTemplateDataAndHash(updates.template);
    if (fetched) {
      updated.templateData = fetched.data;
      updated.templateHash = fetched.hash;
    }
  }

  // 如果 slug 发生变化，确保唯一性
  if (updates.slug && updates.slug !== page.slug) {
    updated.slug = await ensureUniqueSlug(locale, updates.slug, excludeId || page.id);
  }

  updated.updatedAt = new Date().toISOString();
  return updated;
}

/** 写入页面文件并注册到 discovery（原子操作） */
async function savePageAndRegister(locale: string, page: PageData): Promise<void> {
  await writePage(locale, page);
  await registerPageToDiscovery(locale, page);
}

// ========== 对外服务函数 ==========

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
  },
  id?: string
): Promise<PageData> {
  const pageId = id || generatePageId();
  let slug = data.slug || generateSlugFromTitle(data.title);
  slug = await ensureUniqueSlug(locale, slug);

  const now = new Date().toISOString();
  let templateData = null;
  let templateHash = null;
  if (data.template) {
    const fetched = await fetchTemplateDataAndHash(data.template);
    if (fetched) {
      templateData = fetched.data;
      templateHash = fetched.hash;
    }
  }

  const page: PageData = {
    id: pageId,
    title: data.title,
    type: 'custom',
    preset: false,
    visible: data.visible,
    template: data.template,
    templateHash,
    slug,
    seo_keywords: data.seo_keywords,
    seo_title: data.seo_title,
    seo_description: data.seo_description,
    content: data.content,
    templateData,
    createdAt: now,
    updatedAt: now,
  };

  const existing = await readPage(locale, pageId);
  if (existing) {
    throw new Error(`页面 ID ${pageId} 在当前语言 ${locale} 已存在，请使用更新操作`);
  }

  await savePageAndRegister(locale, page);
  return page;
}

export async function updatePage(
  locale: string,
  pageId: string,
  data: Partial<Omit<PageData, 'id' | 'createdAt' | 'preset' | 'type'>>
): Promise<PageData> {
  const existing = await readPage(locale, pageId);
  if (!existing) throw new Error('Page not found');

  const updated = await applyPageUpdates(existing, data, locale, pageId);
  await savePageAndRegister(locale, updated);
  return updated;
}

export async function deletePage(locale: string, pageId: string): Promise<void> {
  const page = await readPage(locale, pageId);
  if (!page) throw new Error('Page not found');
  if (page.preset) throw new Error('Cannot delete preset page');

  await deletePageFile(locale, pageId);

  const discoveryPageId = `page:${pageId}`;
  try {
    await deleteDiscoveryPage(discoveryPageId, locale);
  } catch (err) {
    console.error(`删除页面 discovery 记录失败 (${discoveryPageId}):`, err);
  }
}

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
      const existingPageId = await getPageIdBySlug(targetLocale, targetSlug);
      if (existingPageId && existingPageId !== pageId) {
        targetSlug = await ensureUniqueSlug(targetLocale, targetSlug);
      }
      const targetPage: PageData = {
        ...sourcePage,
        slug: targetSlug,
        updatedAt: new Date().toISOString(),
      };
      await savePageAndRegister(targetLocale, targetPage);
      success.push(targetLocale);
    } catch (error) {
      failed.push({ locale: targetLocale, error: (error as Error).message });
    }
  }
  return { success, failed };
}

export { getPageIdBySlug } from './storage';

export async function updatePageTranslations(
  targetLocale: string,
  translations: Array<{
    id: string;
    title?: string;
    content?: any;
    seo_keywords?: string;
    seo_title?: string;
    seo_description?: string;
  }>,
  sourceLocale?: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const trans of translations) {
    const { id, title, content, seo_keywords, seo_title, seo_description } = trans;

    try {
      let targetPage = await readPage(targetLocale, id);

      // 若目标不存在且提供了源语言，则复制源页面
      if (!targetPage && sourceLocale) {
        const sourcePage = await readPage(sourceLocale, id);
        if (!sourcePage) throw new Error(`源页面 ${id} 不存在`);

        const slug = await ensureUniqueSlug(targetLocale, sourcePage.slug, id);
        const now = new Date().toISOString();
        targetPage = {
          ...sourcePage,
          slug,
          updatedAt: now,
          createdAt: now,
        };
        // 直接写入（尚未应用翻译字段）
        await writePage(targetLocale, targetPage);
        // 重新读取确保对象引用最新
        targetPage = await readPage(targetLocale, id);
        if (!targetPage) throw new Error(`复制后无法读取页面 ${id}`);
      }

      if (!targetPage) {
        errors.push(`页面 ${id} 在目标语言中不存在且无法创建`);
        failed++;
        continue;
      }

      // 构建更新对象
      const updates: Partial<Omit<PageData, 'id' | 'createdAt' | 'preset' | 'type'>> = {};
      let hasUpdate = false;
      if (title !== undefined) { updates.title = title; hasUpdate = true; }
      if (seo_keywords !== undefined) { updates.seo_keywords = seo_keywords; hasUpdate = true; }
      if (seo_title !== undefined) { updates.seo_title = seo_title; hasUpdate = true; }
      if (seo_description !== undefined) { updates.seo_description = seo_description; hasUpdate = true; }
      if (content !== undefined) {
        updates.templateData = content;
        // 重新计算 templateHash（若 template 存在）
        if (targetPage.template) {
          const fetched = await fetchTemplateDataAndHash(targetPage.template);
          if (fetched) {
            updates.templateHash = fetched.hash;
          }
        }
        hasUpdate = true;
      }

      if (!hasUpdate) {
        errors.push(`页面 ${id} 无更新字段`);
        failed++;
        continue;
      }

      // 应用更新（处理 slug 唯一性）
      const updated = await applyPageUpdates(targetPage, updates, targetLocale, id);
      await savePageAndRegister(targetLocale, updated);
      success++;
    } catch (err: any) {
      errors.push(`处理页面 ${id} 失败: ${err.message}`);
      failed++;
    }
  }

  return { success, failed, errors };
}
// ========== 新增：重新导出 readPage 供外部使用 ==========
export { readPage } from './storage';