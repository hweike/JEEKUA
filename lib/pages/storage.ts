// lib/pages/storage.ts
import NodeCache from 'node-cache';
import { PageData, PageIndexEntry, PageType, Visibility } from '@/types/page';
import { supabaseAdmin as supabase } from '@/lib/supabase/admin-client';

const SITE_ID = '000001';

// ========== 缓存实例 ==========
// stdTTL 300 秒（5 分钟）：读多写少的场景下，5 分钟足够新内容传播
// checkperiod 60 秒：每 60 秒清理一次过期项
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// ========== 数据库健康状态 ==========
let dbHealthy = true;
let lastFailureTime = 0;
const DB_RECOVERY_WAIT = 60000;

// ========== 重试工具 ==========
function isRetryableError(error: any): boolean {
  const message = [
    error?.message || '',
    error?.details || '',
    error?.hint || '',
    error?.code || '',
  ].join(' ');

  const retryablePatterns = [
    'ETIMEDOUT',
    'ECONNRESET',
    'SocketError',
    'timeout',
    'connection',
    'fetch failed',
    'other side closed',
    '503',
    '502',
    '504',
    'network',
  ];
  return retryablePatterns.some(pattern => message.toLowerCase().includes(pattern.toLowerCase()));
}

/**
 * 通用重试
 * - 查询类操作：建议传 maxRetries=1, delay=200（避免放大延迟）
 * - 写入类操作：建议传 maxRetries=3, delay=800（保证写入可靠性）
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 800
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const retryable = isRetryableError(error);

      if (!retryable) {
        throw error;
      }

      if (i === maxRetries - 1) {
        dbHealthy = false;
        lastFailureTime = Date.now();
        console.error(`[DB] 重试 ${maxRetries} 次后仍失败，标记为不健康`);
        throw error;
      }

      // 指数退避 + 随机抖动
      const baseWait = delay * Math.pow(2, i);
      const jitter = Math.random() * 300;
      const waitTime = baseWait + jitter;

      console.warn(`[withRetry] 第 ${i + 1} 次尝试失败，${Math.round(waitTime)}ms 后重试...`, error?.message);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
}

function isDatabaseAvailable(): boolean {
  if (dbHealthy) return true;
  if (Date.now() - lastFailureTime > DB_RECOVERY_WAIT) {
    dbHealthy = true;
    console.log('[DB] 冷却期结束，恢复健康状态');
    return true;
  }
  return false;
}

async function withDbHealthCheck<T>(fn: () => Promise<T>): Promise<T> {
  if (!isDatabaseAvailable()) {
    throw new Error('Database temporarily unavailable (in cooldown period)');
  }
  return fn();
}

// ==========================================================
// 数据库行 ↔ PageData / PageIndexEntry 转换
// ==========================================================

function rowToPageIndexEntry(row: any): PageIndexEntry {
  return {
    id: row.id,
    title: row.title,
    type: row.type as PageType,
    preset: row.preset ?? false,
    visible: (row.visible as Visibility) ?? 'hidden',
    template: row.template || '',
    templateHash: row.template_hash || null,
    slug: row.slug,
    seo_keywords: row.seo_keywords || '',
    seo_title: row.seo_title || '',
    seo_description: row.seo_description || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    locale: row.locale,
  };
}

function rowToPageData(row: any): PageData {
  return {
    id: row.id,
    title: row.title,
    type: row.type as PageType,
    preset: row.preset ?? false,
    visible: (row.visible as Visibility) ?? 'hidden',
    template: row.template || '',
    templateHash: row.template_hash || null,
    slug: row.slug,
    seo_keywords: row.seo_keywords || '',
    seo_title: row.seo_title || '',
    seo_description: row.seo_description || '',
    content: row.content || '',
    templateData: row.template_data || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    locale: row.locale,
  };
}

function pageDataToRow(page: PageData, locale: string) {
  return {
    site_id: SITE_ID,
    id: page.id,
    locale: locale,
    title: page.title,
    type: page.type || 'custom',
    preset: page.preset ?? false,
    visible: page.visible || 'hidden',
    template: page.template || '',
    template_hash: page.templateHash || null,
    slug: page.slug,
    seo_keywords: page.seo_keywords || '',
    seo_title: page.seo_title || '',
    seo_description: page.seo_description || '',
    content: page.content || '',
    template_data: page.templateData || null,
    updated_at: new Date().toISOString(),
  };
}

// ==========================================================
// 内部：从数据库读取（无缓存）
// ==========================================================

/**
 * 从数据库读取页面（内部函数，无缓存）
 */
async function readPageFromDb(locale: string, pageId: string): Promise<PageData | null> {
  try {
    const { data, error } = await withDbHealthCheck(() =>
      withRetry(async () => {
        return await supabase
          .from('site_pages')
          .select('*')
          .eq('site_id', SITE_ID)
          .eq('locale', locale)
          .eq('id', pageId)
          .maybeSingle();
      }, 1, 200)
    );

    if (error || !data) return null;
    return rowToPageData(data);
  } catch (err: any) {
    console.error(`[readPageFromDb] error for ${locale}/${pageId}:`, err?.message || err);
    return null;
  }
}

/**
 * 从数据库按 slug 读取页面（内部函数，无缓存）
 */
async function getPageBySlugFromDb(locale: string, slug: string): Promise<PageData | null> {
  try {
    const { data, error } = await withDbHealthCheck(() =>
      withRetry(async () => {
        return await supabase
          .from('site_pages')
          .select('*')
          .eq('site_id', SITE_ID)
          .eq('locale', locale)
          .eq('slug', slug)
          .maybeSingle();
      }, 1, 200)
    );

    if (error || !data) return null;
    return rowToPageData(data);
  } catch (err: any) {
    console.error(`[getPageBySlugFromDb] error for ${locale}/${slug}:`, err?.message || err);
    return null;
  }
}

// ==========================================================
// 核心 API - 读取（前台用，带缓存）
// ==========================================================

/**
 * 按 id 读取页面（带内存缓存）— 前台渲染用
 * 缓存 5 分钟，读多写少的前台场景
 */
export async function readPage(locale: string, pageId: string): Promise<PageData | null> {
  const cacheKey = `page:${locale}:${pageId}`;

  // 1. 先查内存缓存
  const cached = cache.get<PageData>(cacheKey);
  if (cached) return cached;

  // 2. 查库
  const page = await readPageFromDb(locale, pageId);
  if (!page) return null;

  // 3. 写入缓存
  cache.set(cacheKey, page);
  return page;
}

/**
 * 按 id 读取页面（无缓存）— 后台编辑用
 *
 * 编辑器场景必须拿到最新数据，不能走缓存
 */
export async function readPageFresh(locale: string, pageId: string): Promise<PageData | null> {
  return readPageFromDb(locale, pageId);
}

/**
 * 按 slug 读取页面（带内存缓存）— 前台渲染用
 *
 * 一次查询拿到完整页面数据，同时缓存 id 索引
 */
export async function getPageBySlug(
  locale: string,
  slug: string
): Promise<PageData | null> {
  const cacheKey = `page-by-slug:${locale}:${slug}`;

  // 1. 先查内存缓存
  const cached = cache.get<PageData>(cacheKey);
  if (cached) return cached;

  // 2. 查库
  const page = await getPageBySlugFromDb(locale, slug);
  if (!page) return null;

  // 3. 写入缓存（同时缓存 id 索引）
  cache.set(cacheKey, page);
  cache.set(`page:${locale}:${page.id}`, page);
  cache.set(`page-id-by-slug:${locale}:${slug}`, page.id);

  return page;
}

/**
 * 按 slug 读取页面（无缓存）— 后台编辑用
 */
export async function getPageBySlugFresh(
  locale: string,
  slug: string
): Promise<PageData | null> {
  return getPageBySlugFromDb(locale, slug);
}

// ==========================================================
// 核心 API - 列表
// ==========================================================

/**
 * 列出某语言下所有页面（轻量，不含 content 和 template_data）
 * 无缓存，每次从数据库读取最新数据
 */
export async function listPages(locale: string): Promise<PageIndexEntry[]> {
  try {
    const { data, error } = await withDbHealthCheck(() =>
      withRetry(async () => {
        return await supabase
          .from('site_pages')
          .select('id, title, type, preset, visible, template, template_hash, slug, seo_keywords, seo_title, seo_description, created_at, updated_at, locale')
          .eq('site_id', SITE_ID)
          .eq('locale', locale)
          .order('created_at', { ascending: false });
      }, 1, 200)
    );

    if (error || !data) return [];
    return data.map(rowToPageIndexEntry);
  } catch (err: any) {
    console.error(`[listPages] error for ${locale}:`, err?.message || err);
    return [];
  }
}

// ==========================================================
// 核心 API - 写入
// ==========================================================

/**
 * 写入页面（新增或更新）
 * 写入后清理所有相关缓存
 */
export async function writePage(locale: string, page: PageData): Promise<void> {
  // 失效相关缓存
  cache.del(`page:${locale}:${page.id}`);
  cache.del(`page-by-slug:${locale}:${page.slug}`);
  cache.del(`page-id-by-slug:${locale}:${page.slug}`);
  cache.del(`pages:${locale}`);
  // ✅ 新增：布局模板缓存失效
  if (page.template) {
    cache.del(`layout-page:${locale}:${page.template}`);
    cache.del(`layout-page:base:${page.template}`);
  }

  await withDbHealthCheck(() =>
    withRetry(async () => {
      const { error } = await supabase
        .from('site_pages')
        .upsert(pageDataToRow(page, locale), { onConflict: 'site_id,id,locale' });

      if (error) {
        console.error(`[writePage] 操作失败 (${locale}/${page.id}):`, error);
        throw error;
      }
    }, 3, 800)
  );

  // ✅ 写入后再次清缓存，防止并发写入旧数据
  cache.del(`page:${locale}:${page.id}`);
  cache.del(`page-by-slug:${locale}:${page.slug}`);
  cache.del(`page-id-by-slug:${locale}:${page.slug}`);
  cache.del(`pages:${locale}`);
  // ✅ 新增：布局模板缓存失效
  if (page.template) {
    cache.del(`layout-page:${locale}:${page.template}`);
    cache.del(`layout-page:base:${page.template}`);
  }
}

/**
 * 删除页面
 */
export async function deletePageFile(locale: string, pageId: string): Promise<void> {
  // 失效相关缓存（先读一次拿到 slug，用于清 slug 缓存）
  const existing = cache.get<PageData>(`page:${locale}:${pageId}`);
  if (existing) {
    cache.del(`page-by-slug:${locale}:${existing.slug}`);
    cache.del(`page-id-by-slug:${locale}:${existing.slug}`);
    // ✅ 新增：如果这个页面是布局模板，清 layout-page 缓存
    if (existing.template) {
      cache.del(`layout-page:${locale}:${existing.template}`);
      cache.del(`layout-page:base:${existing.template}`);
    }
  }
  cache.del(`page:${locale}:${pageId}`);
  cache.del(`pages:${locale}`);

  await withDbHealthCheck(() =>
    withRetry(async () => {
      const { error } = await supabase
        .from('site_pages')
        .delete()
        .eq('site_id', SITE_ID)
        .eq('locale', locale)
        .eq('id', pageId);

      if (error) {
        console.error(`[deletePageFile] 操作失败 (${locale}/${pageId}):`, error);
        throw error;
      }
    }, 3, 800)
  );
}

// ==========================================================
// Slug 查询
// ==========================================================

/**
 * 根据 slug 获取页面 ID（带缓存）
 */
export async function getPageIdBySlug(locale: string, slug: string): Promise<string | null> {
  const cacheKey = `page-id-by-slug:${locale}:${slug}`;

  // 1. 先查缓存
  const cached = cache.get<string>(cacheKey);
  if (cached) return cached;

  // 2. 查库
  try {
    const { data, error } = await withDbHealthCheck(() =>
      withRetry(async () => {
        return await supabase
          .from('site_pages')
          .select('id')
          .eq('site_id', SITE_ID)
          .eq('locale', locale)
          .eq('slug', slug)
          .maybeSingle();
      }, 1, 200)
    );

    if (error || !data) return null;

    cache.set(cacheKey, data.id);
    return data.id;
  } catch (err: any) {
    console.error(`[getPageIdBySlug] error for ${locale}/${slug}:`, err?.message || err);
    return null;
  }
}

/**
 * 检查 slug 是否存在
 */
export async function isSlugExists(locale: string, slug: string, excludePageId?: string): Promise<boolean> {
  const id = await getPageIdBySlug(locale, slug);
  if (!id) return false;
  if (excludePageId && id === excludePageId) return false;
  return true;
}

// ==========================================================
// 兼容旧代码
// ==========================================================

export async function updatePagesIndexEntry(locale: string, page: PageData): Promise<void> {
  await writePage(locale, page);
}

export async function deletePagesIndexEntry(locale: string, pageId: string): Promise<void> {
  await deletePageFile(locale, pageId);
}

// ==========================================================
// 批量操作
// ==========================================================

/**
 * 批量写入页面（一次性 upsert）
 */
export async function batchUpsertPages(locale: string, pages: PageData[]): Promise<void> {
  if (pages.length === 0) return;

  const rows = pages.map(page => pageDataToRow(page, locale));

  await withDbHealthCheck(() =>
    withRetry(async () => {
      const { error } = await supabase
        .from('site_pages')
        .upsert(rows, { onConflict: 'site_id,id,locale' });

      if (error) throw error;
    }, 3, 800)
  );

  // 失效缓存
  cache.del(`pages:${locale}`);
  for (const page of pages) {
    cache.del(`page:${locale}:${page.id}`);
    cache.del(`page-by-slug:${locale}:${page.slug}`);
    cache.del(`page-id-by-slug:${locale}:${page.slug}`);
    // ✅ 新增：布局模板缓存失效
    if (page.template) {
      cache.del(`layout-page:${locale}:${page.template}`);
      cache.del(`layout-page:base:${page.template}`);
    }
  }
}

// ==========================================================
// 获取所有语言
// ==========================================================

export async function getAllLocales(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('site_pages')
      .select('locale')
      .eq('site_id', SITE_ID)
      .order('locale');

    if (error || !data) return ['zh', 'en'];
    return Array.from(new Set(data.map(row => row.locale).filter(Boolean))).sort();
  } catch {
    return ['zh', 'en'];
  }
}

// ==========================================================
// 首页 ID
// ==========================================================

export async function getHomePageId(locale: string): Promise<string | null> {
  const homeId = '10000001';
  const page = await readPage(locale, homeId);
  return page ? homeId : null;
}

// ==========================================================
// 布局模板查询（用于文档库等场景）
// ==========================================================

/**
 * 按 template + locale 获取布局页面（带 NodeCache 缓存）
 *
 * 用于文档库首页等需要从 site_pages 里取"布局模板"的场景。
 * 一次查询拿到 id、template、template_data、template_hash、content、type。
 */
export async function getLayoutPageByTemplate(
  locale: string,
  templateId: string
): Promise<{
  id: string;
  template: string;
  templateData: any;
  templateHash: string | null;
  content: string;
  type: string;
} | null> {
  if (!templateId) return null;

  const cacheKey = `layout-page:${locale}:${templateId}`;

  // 1. 先查内存缓存
  const cached = cache.get<any>(cacheKey);
  if (cached) return cached;

  // 2. 查库
  try {
    const { data, error } = await withDbHealthCheck(() =>
      withRetry(async () => {
        return await supabase
          .from('site_pages')
          .select('id, template, template_data, template_hash, content, type')
          .eq('site_id', SITE_ID)
          .eq('locale', locale)
          .eq('template', templateId)
          .maybeSingle();
      }, 1, 200)
    );

    if (error || !data) return null;

    const result = {
      id: data.id,
      template: data.template || '',
      templateData: data.template_data || null,
      templateHash: data.template_hash || null,
      content: data.content || '',
      type: data.type || '',
    };

    // 3. 写入缓存
    cache.set(cacheKey, result);
    return result;
  } catch (err: any) {
    console.error(`[getLayoutPageByTemplate] error for ${locale}/${templateId}:`, err?.message || err);
    return null;
  }
}