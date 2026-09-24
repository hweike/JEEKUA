// lib/discovery/services/sync-batch.service.ts
import sql from '@/lib/db/admin';
import { upsertPage, SITE_ID } from '@/lib/discovery/register';
import { PageData } from '@/lib/discovery/register';
import { syncBusinessData, SyncContext } from '@/lib/discovery/sync';

// 辅助：插入同步日志
async function insertSyncLog(
  siteId: string,
  sourceId: string,
  sourceLocale: string,
  targetLocale: string,
  sourceHash: string,
  status: string,
  errorMessage?: string,
  operator?: string
) {
  try {
    await sql`
      INSERT INTO public.sync_logs (
        site_id, sync_type, source_id, source_locale, target_locale,
        target_id, source_hash, status, error_message, operator
      ) VALUES (
        ${siteId}, 'page', ${sourceId}, ${sourceLocale}, ${targetLocale},
        ${sourceId}, ${sourceHash}, ${status}, ${errorMessage ?? null}, ${operator || 'admin'}
      )
    `;
  } catch (error) {
    console.error('[insertSyncLog] 插入失败:', error);
  }
}

export interface BatchSyncParams {
  sourceLocale: string;
  targetLocales: string[];
  pageIds: string[];
  mode: 'repair' | 'copy' | 'copy_translate';
  operator?: string;
}

export interface BatchSyncResultItem {
  pageId: string;
  targetLocale?: string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
  reason?: string;
}

export interface BatchSyncResult {
  total: number;
  successCount: number;
  failedCount: number;
  results: BatchSyncResultItem[];
}

function buildPageData(
  sourcePage: any,
  translatedData: any,
  sourceHash: string,
  sourceLocale: string,
  operator: string
): PageData {
  // ... 完全不变 ...
  let title: string;
  let seo_title: string | null;
  let seo_description: string | null;
  let seo_keywords: string | null;
  let content_summary: string | null;
  let content_full: string | null;

  const type = sourcePage.type;

  if (type === 'productLine') {
    title = sourcePage.title;
    seo_title = translatedData?.seoTitle ?? sourcePage.seo_title;
    seo_description = translatedData?.seoDescription ?? sourcePage.seo_description;
    seo_keywords = translatedData?.seoKeywords ?? sourcePage.seo_keywords;
    content_summary = sourcePage.content_summary;
    content_full = sourcePage.content_full;
  } else if (type === 'productCollection') {
    title = translatedData?.name ?? sourcePage.title;
    seo_title = translatedData?.seoTitle ?? sourcePage.seo_title;
    seo_description = translatedData?.seoDescription ?? sourcePage.seo_description;
    seo_keywords = translatedData?.seoKeywords ?? sourcePage.seo_keywords;
    content_summary = translatedData?.description ?? sourcePage.content_summary;
    content_full = translatedData?.description ?? sourcePage.content_full;
  } else if (type === 'product') {
    title = translatedData?.product_name ?? sourcePage.title;
    seo_title = translatedData?.seo_title ?? sourcePage.seo_title;
    seo_description = translatedData?.seo_description ?? sourcePage.seo_description;
    seo_keywords = translatedData?.seo_keywords ?? sourcePage.seo_keywords;
    content_summary = translatedData?.short_description ?? sourcePage.content_summary;
    content_full = translatedData?.description ?? sourcePage.content_full;
  } else {
    title = translatedData?.title ?? sourcePage.title;
    seo_title = translatedData?.seo_title ?? sourcePage.seo_title;
    seo_description = translatedData?.seo_description ?? sourcePage.seo_description;
    seo_keywords = translatedData?.seo_keywords ?? sourcePage.seo_keywords;
    content_summary = translatedData?.summary ?? sourcePage.content_summary;
    content_full = translatedData?.content ?? sourcePage.content_full;
  }

  return {
    id: sourcePage.id,
    type: sourcePage.type,
    title,
    slug: sourcePage.slug,
    url: sourcePage.url,
    cover_image: sourcePage.cover_image,
    seo_title,
    seo_description,
    seo_keywords,
    canonical: sourcePage.canonical,
    noindex: sourcePage.noindex === 1,
    nofollow: sourcePage.nofollow === 1,
    priority: sourcePage.priority,
    changefreq: sourcePage.changefreq,
    content_summary,
    content_full,
    translated_by_ai: 1,
    updatedAt: new Date().toISOString(),
    source_content_hash: sourceHash,
    source_locale: sourceLocale,
    last_sync_time: new Date().toISOString(),
    last_sync_operator: operator,
  };
}

export async function executeBatchSync(params: BatchSyncParams): Promise<BatchSyncResult> {
  const { sourceLocale, targetLocales, pageIds, mode, operator = 'admin' } = params;

  const ALLOWED_SOURCE_LOCALES = ['en', 'zh'];
  if (!ALLOWED_SOURCE_LOCALES.includes(sourceLocale)) {
    throw new Error('Source locale must be "en" or "zh"');
  }

  const parentPageIds = pageIds.filter(id => !id.includes('/'));
  if (parentPageIds.length === 0) {
    return { total: 0, successCount: 0, failedCount: 0, results: [] };
  }

  const repairOnly = mode === 'repair';
  const translate = mode === 'copy_translate';

  const results: BatchSyncResultItem[] = [];

  for (const pageId of parentPageIds) {
    // 1. 查询源页面
    const sourceRows = await sql<any[]>`
      SELECT * FROM public.pages
      WHERE id = ${pageId}
        AND locale = ${sourceLocale}
        AND site_id = ${SITE_ID}
      LIMIT 1
    `;
    const sourcePage = sourceRows[0];

    if (!sourcePage) {
      results.push({ pageId, status: 'failed', error: 'Source page not found' });
      continue;
    }

    const sourceHash = sourcePage.content_hash;

    // 2. productCollection 预取子页面哈希
    let childHashMap: Map<string, string> = new Map();
    if (sourcePage.type === 'productCollection') {
      const parentId = sourcePage.id;
      try {
        const childPages = await sql<{ id: string; content_hash: string }[]>`
          SELECT id, content_hash FROM public.pages
          WHERE site_id = ${SITE_ID}
            AND locale = ${sourceLocale}
            AND id LIKE ${parentId + '/%'}
        `;
        childPages.forEach(p => {
          childHashMap.set(p.id, p.content_hash);
        });
      } catch (err) {
        console.warn(`[executeBatchSync] 查询子页面失败:`, err);
      }
    }

    for (const targetLocale of targetLocales) {
      try {
        const syncCtx: SyncContext = {
          sourcePage,
          targetLocale,
          repairOnly,
          translate,
          operator,
        };
        const bizResult = await syncBusinessData(syncCtx);

        if (!bizResult.success) {
          await insertSyncLog(SITE_ID, pageId, sourceLocale, targetLocale, sourceHash, 'failed', bizResult.error, operator);
          results.push({ pageId, targetLocale, status: 'failed', error: bizResult.error });
          continue;
        }

        if (repairOnly) {
          // 修复模式：仅更新同步字段
          const targetRows = await sql<{ id: string }[]>`
            SELECT id FROM public.pages
            WHERE id = ${pageId}
              AND locale = ${targetLocale}
              AND site_id = ${SITE_ID}
            LIMIT 1
          `;

          if (!targetRows[0]) {
            await insertSyncLog(SITE_ID, pageId, sourceLocale, targetLocale, sourceHash, 'skipped', 'Target page not found for repair', operator);
            results.push({ pageId, targetLocale, status: 'skipped', reason: 'Target page not found' });
            continue;
          }

          await sql`
            UPDATE public.pages
            SET source_content_hash = ${sourceHash},
                source_locale = ${sourceLocale},
                last_sync_time = ${new Date().toISOString()},
                last_sync_operator = ${operator}
            WHERE id = ${pageId}
              AND locale = ${targetLocale}
              AND site_id = ${SITE_ID}
          `;
        } else {
          const translatedData = bizResult.data || sourcePage;
          const pageData = buildPageData(sourcePage, translatedData, sourceHash, sourceLocale, operator);
          await upsertPage(pageData, targetLocale);

          // 处理 productCollection 的子级（series）
          if (sourcePage.type === 'productCollection' && translatedData?.series?.length > 0) {
            const parentId = sourcePage.id.replace('productCollection:', '');
            for (const seriesItem of translatedData.series) {
              const childPageId = `productCollection:${parentId}/${seriesItem.id}`;
              const childSourceHash = childHashMap.get(childPageId) || sourceHash;

              const childPageData: PageData = {
                id: childPageId,
                type: 'productCollection',
                title: seriesItem.name || '未命名',
                slug: seriesItem.slug || '',
                url: `/collections/${translatedData.slug || parentId}/${seriesItem.slug || ''}`,
                cover_image: seriesItem.image || null,
                seo_title: seriesItem.seoTitle || null,
                seo_description: seriesItem.seoDescription || null,
                seo_keywords: seriesItem.seoKeywords || null,
                canonical: null,
                noindex: false,
                nofollow: false,
                priority: 0.5,
                changefreq: 'weekly',
                content_summary: seriesItem.description || '',
                content_full: null,
                translated_by_ai: 1,
                updatedAt: new Date().toISOString(),
                source_content_hash: childSourceHash,
                source_locale: sourceLocale,
                last_sync_time: new Date().toISOString(),
                last_sync_operator: operator,
              };
              await upsertPage(childPageData, targetLocale);
            }
          }
        }

        await insertSyncLog(SITE_ID, pageId, sourceLocale, targetLocale, sourceHash, 'success', undefined, operator);
        results.push({ pageId, targetLocale, status: 'success' });

      } catch (err: any) {
        await insertSyncLog(SITE_ID, pageId, sourceLocale, targetLocale, sourceHash, 'failed', err.message, operator);
        results.push({ pageId, targetLocale, status: 'failed', error: err.message });
      }
    }
  }

  const successCount = results.filter(r => r.status === 'success').length;
  const failedCount = results.filter(r => r.status === 'failed').length;
  return {
    total: results.length,
    successCount,
    failedCount,
    results,
  };
}

export async function executeBatchSyncWithProgress(
  params: BatchSyncParams & { onProgress: (log: { pageId: string; status: 'processing' | 'success' | 'failed'; message?: string; successCount: number; failedCount: number }) => void }
): Promise<BatchSyncResult> {
  const { sourceLocale, targetLocales, pageIds, mode, operator = 'admin', onProgress } = params;

  const ALLOWED_SOURCE_LOCALES = ['en', 'zh'];
  if (!ALLOWED_SOURCE_LOCALES.includes(sourceLocale)) {
    throw new Error('Source locale must be "en" or "zh"');
  }

  const parentPageIds = pageIds.filter(id => !id.includes('/'));
  if (parentPageIds.length === 0) {
    return { total: 0, successCount: 0, failedCount: 0, results: [] };
  }

  const repairOnly = mode === 'repair';
  const translate = mode === 'copy_translate';
  const results: BatchSyncResultItem[] = [];

  let successCount = 0;
  let failedCount = 0;

  for (const pageId of parentPageIds) {
    onProgress({ pageId, status: 'processing', message: `正在同步 ${pageId}`, successCount, failedCount });

    const sourceRows = await sql<any[]>`
      SELECT * FROM public.pages
      WHERE id = ${pageId}
        AND locale = ${sourceLocale}
        AND site_id = ${SITE_ID}
      LIMIT 1
    `;
    const sourcePage = sourceRows[0];

    if (!sourcePage) {
      results.push({ pageId, status: 'failed', error: 'Source page not found' });
      failedCount++;
      onProgress({ pageId, status: 'failed', message: `源页面不存在: ${pageId}`, successCount, failedCount });
      continue;
    }

    const sourceHash = sourcePage.content_hash;

    let childHashMap: Map<string, string> = new Map();
    if (sourcePage.type === 'productCollection') {
      const parentId = sourcePage.id;
      try {
        const childPages = await sql<{ id: string; content_hash: string }[]>`
          SELECT id, content_hash FROM public.pages
          WHERE site_id = ${SITE_ID}
            AND locale = ${sourceLocale}
            AND id LIKE ${parentId + '/%'}
        `;
        childPages.forEach(p => {
          childHashMap.set(p.id, p.content_hash);
        });
      } catch (err) {
        console.warn(`[executeBatchSyncWithProgress] 查询子页面失败:`, err);
      }
    }

    for (const targetLocale of targetLocales) {
      try {
        const syncCtx: SyncContext = {
          sourcePage,
          targetLocale,
          repairOnly,
          translate,
          operator,
        };
        const bizResult = await syncBusinessData(syncCtx);

        if (!bizResult.success) {
          await insertSyncLog(SITE_ID, pageId, sourceLocale, targetLocale, sourceHash, 'failed', bizResult.error, operator);
          results.push({ pageId, targetLocale, status: 'failed', error: bizResult.error });
          failedCount++;
          onProgress({ pageId, status: 'failed', message: `同步失败: ${bizResult.error}`, successCount, failedCount });
          continue;
        }

        if (repairOnly) {
          const targetRows = await sql<{ id: string }[]>`
            SELECT id FROM public.pages
            WHERE id = ${pageId}
              AND locale = ${targetLocale}
              AND site_id = ${SITE_ID}
            LIMIT 1
          `;

          if (!targetRows[0]) {
            await insertSyncLog(SITE_ID, pageId, sourceLocale, targetLocale, sourceHash, 'skipped', 'Target page not found for repair', operator);
            results.push({ pageId, targetLocale, status: 'skipped', reason: 'Target page not found' });
            continue;
          }

          await sql`
            UPDATE public.pages
            SET source_content_hash = ${sourceHash},
                source_locale = ${sourceLocale},
                last_sync_time = ${new Date().toISOString()},
                last_sync_operator = ${operator}
            WHERE id = ${pageId}
              AND locale = ${targetLocale}
              AND site_id = ${SITE_ID}
          `;
        } else {
          const translatedData = bizResult.data || sourcePage;
          const pageData = buildPageData(sourcePage, translatedData, sourceHash, sourceLocale, operator);
          await upsertPage(pageData, targetLocale);

          if (sourcePage.type === 'productCollection' && translatedData?.series?.length > 0) {
            const parentId = sourcePage.id.replace('productCollection:', '');
            for (const seriesItem of translatedData.series) {
              const childPageId = `productCollection:${parentId}/${seriesItem.id}`;
              const childSourceHash = childHashMap.get(childPageId) || sourceHash;

              const childPageData: PageData = {
                id: childPageId,
                type: 'productCollection',
                title: seriesItem.name || '未命名',
                slug: seriesItem.slug || '',
                url: `/collections/${translatedData.slug || parentId}/${seriesItem.slug || ''}`,
                cover_image: seriesItem.image || null,
                seo_title: seriesItem.seoTitle || null,
                seo_description: seriesItem.seoDescription || null,
                seo_keywords: seriesItem.seoKeywords || null,
                canonical: null,
                noindex: false,
                nofollow: false,
                priority: 0.5,
                changefreq: 'weekly',
                content_summary: seriesItem.description || '',
                content_full: null,
                translated_by_ai: 1,
                updatedAt: new Date().toISOString(),
                source_content_hash: childSourceHash,
                source_locale: sourceLocale,
                last_sync_time: new Date().toISOString(),
                last_sync_operator: operator,
              };
              await upsertPage(childPageData, targetLocale);
            }
          }
        }

        await insertSyncLog(SITE_ID, pageId, sourceLocale, targetLocale, sourceHash, 'success', undefined, operator);
        results.push({ pageId, targetLocale, status: 'success' });
        successCount++;
        onProgress({ pageId, status: 'success', message: `同步完成 ${pageId}`, successCount, failedCount });

      } catch (err: any) {
        await insertSyncLog(SITE_ID, pageId, sourceLocale, targetLocale, sourceHash, 'failed', err.message, operator);
        results.push({ pageId, targetLocale, status: 'failed', error: err.message });
        failedCount++;
        onProgress({ pageId, status: 'failed', message: `同步异常: ${err.message}`, successCount, failedCount });
      }
    }
  }

  return {
    total: results.length,
    successCount,
    failedCount,
    results,
  };
}