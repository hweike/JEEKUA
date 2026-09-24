// lib/pages/storage.ts
import NodeCache from 'node-cache';
import { PageData, PageIndexEntry, PageType, Visibility } from '@/types/page';
import sql from '@/lib/db/admin';
import { getVersion, bumpVersion } from '@/lib/cache/cache-version';

const SITE_ID = '000001';
const VERSION_KEY = 'pages';

// ========== 缓存实例 ==========
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

async function readPageFromDb(locale: string, pageId: string): Promise<PageData | null> {
  try {
    return await withDbHealthCheck(() =>
      withRetry(async () => {
        const rows = await sql`
          SELECT * FROM site_pages
          WHERE site_id = ${SITE_ID}
            AND locale = ${locale}
            AND id = ${pageId}
          LIMIT 1
        `;
        return rows[0] ? rowToPageData(rows[0]) : null;
      }, 1, 200)
    );
  } catch (err: any) {
    console.error(`[readPageFromDb] error for ${locale}/${pageId}:`, err?.message || err);
    return null;
  }
}

async function getPageBySlugFromDb(locale: string, slug: string): Promise<PageData | null> {
  try {
    return await withDbHealthCheck(() =>
      withRetry(async () => {
        const rows = await sql`
          SELECT * FROM site_pages
          WHERE site_id = ${SITE_ID}
            AND locale = ${locale}
            AND slug = ${slug}
          LIMIT 1
        `;
        return rows[0] ? rowToPageData(rows[0]) : null;
      }, 1, 200)
    );
  } catch (err: any) {
    console.error(`[getPageBySlugFromDb] error for ${locale}/${slug}:`, err?.message || err);
    return null;
  }
}

// ==========================================================
// 核心 API - 读取（前台用，带缓存）
// ==========================================================

export async function readPage(locale: string, pageId: string): Promise<PageData | null> {
  const version = await getVersion(VERSION_KEY);
  const cacheKey = `v${version}:page:${locale}:${pageId}`;

  const cached = cache.get<PageData>(cacheKey);
  if (cached) return cached;

  const page = await readPageFromDb(locale, pageId);
  if (!page) return null;

  cache.set(cacheKey, page);
  return page;
}

export async function readPageFresh(locale: string, pageId: string): Promise<PageData | null> {
  return readPageFromDb(locale, pageId);
}

export async function getPageBySlug(
  locale: string,
  slug: string
): Promise<PageData | null> {
  const version = await getVersion(VERSION_KEY);
  const cacheKey = `v${version}:page-by-slug:${locale}:${slug}`;

  const cached = cache.get<PageData>(cacheKey);
  if (cached) return cached;

  const page = await getPageBySlugFromDb(locale, slug);
  if (!page) return null;

  cache.set(cacheKey, page);
  cache.set(`v${version}:page:${locale}:${page.id}`, page);
  cache.set(`v${version}:page-id-by-slug:${locale}:${slug}`, page.id);

  return page;
}

export async function getPageBySlugFresh(
  locale: string,
  slug: string
): Promise<PageData | null> {
  return getPageBySlugFromDb(locale, slug);
}

// ==========================================================
// 核心 API - 列表
// ==========================================================

export async function listPages(locale: string): Promise<PageIndexEntry[]> {
  try {
    return await withDbHealthCheck(() =>
      withRetry(async () => {
        const rows = await sql`
          SELECT id, title, type, preset, visible, template, template_hash,
                 slug, seo_keywords, seo_title, seo_description,
                 created_at, updated_at, locale
          FROM site_pages
          WHERE site_id = ${SITE_ID}
            AND locale = ${locale}
          ORDER BY created_at DESC
        `;
        return rows.map(rowToPageIndexEntry);
      }, 1, 200)
    );
  } catch (err: any) {
    console.error(`[listPages] error for ${locale}:`, err?.message || err);
    return [];
  }
}

// ==========================================================
// 核心 API - 写入
// ==========================================================

export async function writePage(locale: string, page: PageData): Promise<void> {
  await withDbHealthCheck(() =>
    withRetry(async () => {
      const row = pageDataToRow(page, locale);
      await sql`
        INSERT INTO site_pages ${sql(row)}
        ON CONFLICT (site_id, id, locale)
        DO UPDATE SET ${sql(row, 'title', 'type', 'preset', 'visible', 'template',
          'template_hash', 'slug', 'seo_keywords', 'seo_title', 'seo_description',
          'content', 'template_data', 'updated_at')}
      `;
    }, 3, 800)
  );

  await bumpVersion(VERSION_KEY);
}

export async function deletePageFile(locale: string, pageId: string): Promise<void> {
  await withDbHealthCheck(() =>
    withRetry(async () => {
      await sql`
        DELETE FROM site_pages
        WHERE site_id = ${SITE_ID}
          AND locale = ${locale}
          AND id = ${pageId}
      `;
    }, 3, 800)
  );

  await bumpVersion(VERSION_KEY);
}

// ==========================================================
// Slug 查询
// ==========================================================

export async function getPageIdBySlug(locale: string, slug: string): Promise<string | null> {
  const version = await getVersion(VERSION_KEY);
  const cacheKey = `v${version}:page-id-by-slug:${locale}:${slug}`;

  const cached = cache.get<string>(cacheKey);
  if (cached) return cached;

  try {
    return await withDbHealthCheck(() =>
      withRetry(async () => {
        const rows = await sql`
          SELECT id FROM site_pages
          WHERE site_id = ${SITE_ID}
            AND locale = ${locale}
            AND slug = ${slug}
          LIMIT 1
        `;
        if (!rows[0]) return null;
        cache.set(cacheKey, rows[0].id);
        return rows[0].id as string;
      }, 1, 200)
    );
  } catch (err: any) {
    console.error(`[getPageIdBySlug] error for ${locale}/${slug}:`, err?.message || err);
    return null;
  }
}

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

export async function batchUpsertPages(locale: string, pages: PageData[]): Promise<void> {
  if (pages.length === 0) return;

  await withDbHealthCheck(() =>
    withRetry(async () => {
      for (const page of pages) {
        const row = pageDataToRow(page, locale);
        await sql`
          INSERT INTO site_pages ${sql(row)}
          ON CONFLICT (site_id, id, locale)
          DO UPDATE SET ${sql(row, 'title', 'type', 'preset', 'visible', 'template',
            'template_hash', 'slug', 'seo_keywords', 'seo_title', 'seo_description',
            'content', 'template_data', 'updated_at')}
        `;
      }
    }, 3, 800)
  );

  await bumpVersion(VERSION_KEY);
}

// ==========================================================
// 获取所有语言
// ==========================================================

export async function getAllLocales(): Promise<string[]> {
  try {
    const rows = await sql`
      SELECT DISTINCT locale FROM site_pages
      WHERE site_id = ${SITE_ID}
      ORDER BY locale
    `;
    const locales = rows.map(r => r.locale).filter(Boolean) as string[];
    return locales.length > 0 ? locales : ['zh', 'en'];
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

  const version = await getVersion(VERSION_KEY);
  const cacheKey = `v${version}:layout-page:${locale}:${templateId}`;

  const cached = cache.get<any>(cacheKey);
  if (cached) return cached;

  try {
    return await withDbHealthCheck(() =>
      withRetry(async () => {
        const rows = await sql`
          SELECT id, template, template_data, template_hash, content, type
          FROM site_pages
          WHERE site_id = ${SITE_ID}
            AND locale = ${locale}
            AND template = ${templateId}
          LIMIT 1
        `;
        if (!rows[0]) return null;
        const data = rows[0];
        const result = {
          id: data.id as string,
          template: (data.template as string) || '',
          templateData: data.template_data || null,
          templateHash: (data.template_hash as string) || null,
          content: (data.content as string) || '',
          type: (data.type as string) || '',
        };
        cache.set(cacheKey, result);
        return result;
      }, 1, 200)
    );
  } catch (err: any) {
    console.error(`[getLayoutPageByTemplate] error for ${locale}/${templateId}:`, err?.message || err);
    return null;
  }
}