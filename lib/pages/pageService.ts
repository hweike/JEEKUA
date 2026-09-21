// lib/pages/pageService.ts
import { PageData, PageIndexEntry, PageType, Visibility } from '@/types/page';
import {
  readPage,
  readPageFresh,        // ✅ 新增导入
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

// ========== 内部辅助函数 ==========

/**
 * 获取模板数据并计算哈希
 */
async function fetchTemplateDataAndHash(templateId: string): Promise<{ data: any; hash: string } | null> {
  if (!templateId) return null;

  const template = await getTemplateById(templateId);
  if (!template || !template.data) return null;

  const data = template.data;
  const hash = computeTemplateHash(data);
  return { data, hash };
}

async function registerPageToDiscovery(locale: string, page: PageData): Promise<void> {
  try {
    const FORCED_TYPE_MAP: Record<string, string> = {
      '10000001': 'home',
    };

    let pageType: string;
    if (page.type === 'policy') {
      pageType = 'policy';
    } else {
      pageType = FORCED_TYPE_MAP[page.id] || 'page';
    }

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

    await registerEntity({
      type: 'page',
      id: page.id,
      locale,
      data: pageData,
      updatedAt: page.updatedAt,
    });
  } catch (err: any) {
    console.error(`[registerPageToDiscovery] 注册页面失败 (${page.id}):`, err?.message || err);
  }
}

async function savePageAndRegister(locale: string, page: PageData): Promise<void> {
  await writePage(locale, page);
  registerPageToDiscovery(locale, page).catch(err => {
    console.error(`[savePageAndRegister] Discovery 注册失败 (${page.id}):`, err?.message || err);
  });
}

// ========== 对外服务函数 ==========

/**
 * 创建页面
 */
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
    type?: PageType;
    preset?: boolean;
  },
  id?: string
): Promise<PageData> {
  const pageId = id || generatePageId();
  const pageType = data.type || 'custom';
  const preset = data.preset ?? false;

  const slug = data.slug && data.slug.trim()
    ? data.slug.trim()
    : generateSlugFromTitle(data.title);

  const now = new Date().toISOString();

  // 模板读取
  let templateData = null;
  let templateHash = null;
  if (data.template && data.template.trim() !== '') {
    const fetched = await fetchTemplateDataAndHash(data.template);
    if (fetched) {
      templateData = fetched.data;
      templateHash = fetched.hash;
    }
  }

  const page: PageData = {
    id: pageId,
    title: data.title,
    type: pageType,
    preset,
    visible: data.visible,
    template: data.template || '',
    templateHash,
    slug,
    seo_keywords: data.seo_keywords,
    seo_title: data.seo_title,
    seo_description: data.seo_description,
    content: data.content,
    templateData,
    createdAt: now,
    updatedAt: now,
    locale,
  };

  // ✅ 用无缓存版本检查是否已存在，保证拿最新数据
  const existing = await readPageFresh(locale, pageId);
  if (existing) {
    throw new Error(`页面 ID ${pageId} 在当前语言 ${locale} 已存在`);
  }

  await writePage(locale, page);

  registerPageToDiscovery(locale, page).catch(() => {});

  isSlugExists(locale, slug, pageId).then(exists => {
    if (exists) {
      console.warn(`[createPage] ⚠️ slug "${slug}" 已存在`);
    }
  }).catch(() => {});

  return page;
}

/**
 * 更新页面
 *
 * 模板处理逻辑：
 * - 情况 1：不关联模板（template = ''）→ 清空 templateData 和 templateHash
 * - 情况 2：模板 ID 变化 → 读取模板数据
 * - 情况 3a：模板 ID 未变，templateData 为空（null/undefined/空对象）→ 读取模板数据
 * - 情况 3b：模板 ID 未变，templateData 已存在 → 跳过读取
 */
export async function updatePage(
  locale: string,
  pageId: string,
  data: Partial<Omit<PageData, 'id' | 'createdAt' | 'preset' | 'type'>>
): Promise<PageData> {
  // ✅ 用无缓存版本读取最新数据，避免基于旧缓存判断
  const existing = await readPageFresh(locale, pageId);
  if (!existing) throw new Error('Page not found');

  const updated: PageData = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  // ========== 模板处理 ==========
  const newTemplate = data.template !== undefined
    ? (data.template || '').trim()
    : (existing.template || '').trim();

  // 判断 templateData 是否为空（null、undefined 或空对象）
  const isTemplateDataEmpty =
    !existing.templateData ||
    (typeof existing.templateData === 'object' &&
     !Array.isArray(existing.templateData) &&
     Object.keys(existing.templateData).length === 0);

  if (newTemplate === '') {
    // 情况 1：不关联模板 → 清空
    updated.template = '';
    updated.templateData = null;
    updated.templateHash = null;
  } else if (newTemplate !== existing.template) {
    // 情况 2：模板 ID 变化 → 读取模板数据
    const fetched = await fetchTemplateDataAndHash(newTemplate);
    if (fetched) {
      updated.template = newTemplate;
      updated.templateData = fetched.data;
      updated.templateHash = fetched.hash;
    } else {
      updated.template = newTemplate;
      updated.templateData = null;
      updated.templateHash = null;
    }
  } else if (isTemplateDataEmpty) {
    // 情况 3a：templateData 为空 → 读取模板数据
    const fetched = await fetchTemplateDataAndHash(newTemplate);
    if (fetched) {
      updated.templateData = fetched.data;
      updated.templateHash = fetched.hash;
    }
  }
  // 情况 3b：模板未变，templateData 已存在 → 无需处理

  // ========== content 处理 ==========
  if (data.content !== undefined) {
    updated.content = data.content;
  }

  await writePage(locale, updated);

  registerPageToDiscovery(locale, updated).catch(() => {});

  if (data.slug && data.slug !== existing.slug) {
    isSlugExists(locale, data.slug, pageId).then(exists => {
      if (exists) {
        console.warn(`[updatePage] ⚠️ slug "${data.slug}" 已存在`);
      }
    }).catch(() => {});
  }

  return updated;
}

/**
 * 删除页面
 */
export async function deletePage(locale: string, pageId: string): Promise<void> {
  // ✅ 用无缓存版本读取，保证拿最新数据
  const page = await readPageFresh(locale, pageId);
  if (!page) throw new Error('Page not found');
  if (page.preset) throw new Error('Cannot delete preset page');

  await deletePageFile(locale, pageId);

  const discoveryPageId = `page:${pageId}`;
  try {
    await deleteDiscoveryPage(discoveryPageId, locale);
  } catch (err) {
    console.error(`[deletePage] 删除 Discovery 记录失败 (${discoveryPageId}):`, err);
  }
}

/**
 * 获取页面列表
 */
export async function getPageList(
  locale: string
): Promise<
  Array<{
    id: string;
    title: string;
    slug: string;
    visible: Visibility;
    updatedAt: string;
    type: PageType;
    preset: boolean;
  }>
> {
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

/**
 * 同步页面到其他语言
 */
export async function syncPageToLocales(
  pageId: string,
  sourceLocale: string,
  targetLocales: string[]
): Promise<{ success: string[]; failed: { locale: string; error: string }[] }> {
  // ✅ 源页面用无缓存版本，保证拿最新
  const sourcePage = await readPageFresh(sourceLocale, pageId);
  if (!sourcePage) throw new Error('Source page not found');

  const success: string[] = [];
  const failed: { locale: string; error: string }[] = [];

  for (const targetLocale of targetLocales) {
    try {
      let targetSlug = sourcePage.slug;
      const existingPageId = await getPageIdBySlug(targetLocale, targetSlug);
      if (existingPageId && existingPageId !== pageId) {
        let counter = 1;
        while (await isSlugExists(targetLocale, targetSlug)) {
          targetSlug = `${sourcePage.slug}-${counter}`;
          counter++;
        }
      }
      const targetPage: PageData = {
        ...sourcePage,
        slug: targetSlug,
        updatedAt: new Date().toISOString(),
        locale: targetLocale,
      };
      await savePageAndRegister(targetLocale, targetPage);
      success.push(targetLocale);
    } catch (error) {
      failed.push({ locale: targetLocale, error: (error as Error).message });
    }
  }
  return { success, failed };
}

/**
 * 模板更新时，同步所有引用该模板的页面
 */
export async function syncTemplateToPages(templateId: string): Promise<{
  updated: number;
  failed: number;
  errors: string[];
}> {
  // 1. 从云存储读取最新模板数据
  const fetched = await fetchTemplateDataAndHash(templateId);
  if (!fetched) {
    return { updated: 0, failed: 0, errors: [`模板 ${templateId} 不存在`] };
  }

  // 2. 查询所有引用该模板的页面
  const { supabaseAdmin } = await import('@/lib/supabase/admin-client');
  const { data: pages, error } = await supabaseAdmin
    .from('site_pages')
    .select('id, locale, template_hash')
    .eq('site_id', '000001')
    .eq('template', templateId);

  if (error || !pages) {
    return { updated: 0, failed: 0, errors: [error?.message || '查询失败'] };
  }

  // 3. 遍历页面，对比哈希，更新变化的页面
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const page of pages) {
    if (page.template_hash === fetched.hash) continue;

    try {
      await supabaseAdmin
        .from('site_pages')
        .update({
          template_data: fetched.data,
          template_hash: fetched.hash,
          updated_at: new Date().toISOString(),
        })
        .eq('site_id', '000001')
        .eq('id', page.id)
        .eq('locale', page.locale);

      updated++;
    } catch (err: any) {
      failed++;
      errors.push(`${page.locale}/${page.id}: ${err?.message}`);
    }
  }

  return { updated, failed, errors };
}

export { getPageIdBySlug } from './storage';

/**
 * 更新页面翻译
 */
export async function updatePageTranslations(
  targetLocale: string,
  translations: Array<{
    id: string;
    title?: string;
    content?: string;
    templateData?: any;
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
    const { id, title, content, templateData, seo_keywords, seo_title, seo_description } = trans;

    try {
      // ✅ 用无缓存版本读取，保证拿最新数据
      let targetPage = await readPageFresh(targetLocale, id);

      if (!targetPage && sourceLocale) {
        // ✅ 源页面也用无缓存版本
        const sourcePage = await readPageFresh(sourceLocale, id);
        if (!sourcePage) throw new Error(`源页面 ${id} 不存在`);

        let slug = sourcePage.slug;
        if (await isSlugExists(targetLocale, slug, id)) {
          let counter = 1;
          while (await isSlugExists(targetLocale, slug, id)) {
            slug = `${sourcePage.slug}-${counter}`;
            counter++;
          }
        }

        const now = new Date().toISOString();

        targetPage = {
          ...sourcePage,
          slug,
          updatedAt: now,
          createdAt: now,
          type: sourcePage.type || 'custom',
          preset: sourcePage.preset ?? false,
          locale: targetLocale,
        };

        await writePage(targetLocale, targetPage);

        // ✅ 复制后用无缓存版本重新读取，确认写入成功
        targetPage = await readPageFresh(targetLocale, id);
        if (!targetPage) throw new Error(`复制后无法读取页面 ${id}`);

        registerPageToDiscovery(targetLocale, targetPage).catch(err => {
          console.error(`[updatePageTranslations] Discovery 注册失败 (${id}):`, err?.message || err);
        });
      }

      if (!targetPage) {
        errors.push(`页面 ${id} 在目标语言中不存在且无法创建`);
        failed++;
        continue;
      }

      const updates: Partial<Omit<PageData, 'id' | 'createdAt' | 'preset' | 'type'>> = {};
      let hasUpdate = false;

      if (title !== undefined) { updates.title = title; hasUpdate = true; }
      if (seo_keywords !== undefined) { updates.seo_keywords = seo_keywords; hasUpdate = true; }
      if (seo_title !== undefined) { updates.seo_title = seo_title; hasUpdate = true; }
      if (seo_description !== undefined) { updates.seo_description = seo_description; hasUpdate = true; }
      if (content !== undefined) { updates.content = content; hasUpdate = true; }

      if (templateData !== undefined) {
        updates.templateData = templateData;
        updates.templateHash = computeTemplateHash(templateData);
        hasUpdate = true;
      }

      if (!hasUpdate) {
        errors.push(`页面 ${id} 无更新字段`);
        failed++;
        continue;
      }

      await updatePage(targetLocale, id, updates);
      success++;
    } catch (err: any) {
      errors.push(`处理页面 ${id} 失败: ${err.message}`);
      failed++;
    }
  }

  return { success, failed, errors };
}

// ✅ 底部导出新增 readPageFresh
export { readPage, readPageFresh } from './storage';

// ========== SEO 缓存版本（重新导出） ==========
export { getCachedPageBySlug } from './seo-cache';