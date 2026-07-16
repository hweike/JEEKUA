// lib/discovery/services/sync-batch.service.ts
import { supabase } from '@/lib/supabase/client';
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
  await supabase.from('sync_logs').insert({
    site_id: siteId,
    sync_type: 'page',
    source_id: sourceId,
    source_locale: sourceLocale,
    target_locale: targetLocale,
    target_id: sourceId,
    source_hash: sourceHash,
    status,
    error_message: errorMessage || null,
    operator: operator || 'admin',
  });
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

/**
 * 根据页面类型和翻译数据构建 PageData
 */
function buildPageData(
  sourcePage: any,
  translatedData: any,
  sourceHash: string,
  sourceLocale: string,
  operator: string
): PageData {
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
    // 适配 product 翻译配置字段
    title = translatedData?.product_name ?? sourcePage.title;
    seo_title = translatedData?.seo_title ?? sourcePage.seo_title;
    seo_description = translatedData?.seo_description ?? sourcePage.seo_description;
    seo_keywords = translatedData?.seo_keywords ?? sourcePage.seo_keywords;
    content_summary = translatedData?.short_description ?? sourcePage.content_summary;
    content_full = translatedData?.description ?? sourcePage.content_full;
  } else {
    // 其他类型通用后备逻辑
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

/**
 * 原有同步函数（保持完全不变）
 */
export async function executeBatchSync(params: BatchSyncParams): Promise<BatchSyncResult> {
  const { sourceLocale, targetLocales, pageIds, mode, operator = 'admin' } = params;

  const ALLOWED_SOURCE_LOCALES = ['en', 'zh'];
  if (!ALLOWED_SOURCE_LOCALES.includes(sourceLocale)) {
    throw new Error('Source locale must be "en" or "zh"');
  }

  // 过滤：只同步父级页面（id 不含 '/'），子级（变体、二级分类）由父级同步时内部处理
  const parentPageIds = pageIds.filter(id => !id.includes('/'));
  if (parentPageIds.length === 0) {
    return { total: 0, successCount: 0, failedCount: 0, results: [] };
  }

  const repairOnly = mode === 'repair';
  const translate = mode === 'copy_translate';

  const results: BatchSyncResultItem[] = [];

  for (const pageId of parentPageIds) {
    const { data: sourcePage, error: pageError } = await supabase
      .from('pages')
      .select('*')
      .eq('id', pageId)
      .eq('locale', sourceLocale)
      .eq('site_id', SITE_ID)
      .single();

    if (pageError || !sourcePage) {
      results.push({ pageId, status: 'failed', error: 'Source page not found' });
      continue;
    }

    const sourceHash = sourcePage.content_hash;

    // 如果是 productCollection，预先获取子页面的哈希映射（用于二级分类同步）
    let childHashMap: Map<string, string> = new Map();
    if (sourcePage.type === 'productCollection') {
      const parentId = sourcePage.id;
      const { data: childPages, error: childError } = await supabase
        .from('pages')
        .select('id, content_hash')
        .eq('site_id', SITE_ID)
        .eq('locale', sourceLocale)
        .ilike('id', `${parentId}/%`);
      if (!childError && childPages) {
        childPages.forEach(p => {
          childHashMap.set(p.id, p.content_hash);
        });
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
          const { data: targetExists, error: existError } = await supabase
            .from('pages')
            .select('id')
            .eq('id', pageId)
            .eq('locale', targetLocale)
            .eq('site_id', SITE_ID)
            .maybeSingle();

          if (existError || !targetExists) {
            await insertSyncLog(SITE_ID, pageId, sourceLocale, targetLocale, sourceHash, 'skipped', 'Target page not found for repair', operator);
            results.push({ pageId, targetLocale, status: 'skipped', reason: 'Target page not found' });
            continue;
          }

          const { error: updateError } = await supabase
            .from('pages')
            .update({
              source_content_hash: sourceHash,
              source_locale: sourceLocale,
              last_sync_time: new Date().toISOString(),
              last_sync_operator: operator,
            })
            .eq('id', pageId)
            .eq('locale', targetLocale)
            .eq('site_id', SITE_ID);

          if (updateError) throw new Error(`Update pages failed: ${updateError.message}`);
        } else {
          // 完整同步：处理父级 pages
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

/**
 * 带进度回调的批量同步函数（新增，不改变原有逻辑）
 * 适用场景：中文→英文 或 英文→其他语言
 * 实时回调：当前正在处理的页面、状态（processing/success/failed）、累计成功/失败数量
 */
export async function executeBatchSyncWithProgress(
  params: BatchSyncParams & { onProgress: (log: { pageId: string; status: 'processing' | 'success' | 'failed'; message?: string; successCount: number; failedCount: number }) => void }
): Promise<BatchSyncResult> {
  const { sourceLocale, targetLocales, pageIds, mode, operator = 'admin', onProgress } = params;

  const ALLOWED_SOURCE_LOCALES = ['en', 'zh'];
  if (!ALLOWED_SOURCE_LOCALES.includes(sourceLocale)) {
    throw new Error('Source locale must be "en" or "zh"');
  }

  // 过滤父级页面
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
    // 开始处理
    onProgress({ pageId, status: 'processing', message: `正在同步 ${pageId}`, successCount, failedCount });

    const { data: sourcePage, error: pageError } = await supabase
      .from('pages')
      .select('*')
      .eq('id', pageId)
      .eq('locale', sourceLocale)
      .eq('site_id', SITE_ID)
      .single();

    if (pageError || !sourcePage) {
      results.push({ pageId, status: 'failed', error: 'Source page not found' });
      failedCount++;
      onProgress({ pageId, status: 'failed', message: `源页面不存在: ${pageId}`, successCount, failedCount });
      continue;
    }

    const sourceHash = sourcePage.content_hash;

    // 如果是 productCollection，预先获取子页面哈希
    let childHashMap: Map<string, string> = new Map();
    if (sourcePage.type === 'productCollection') {
      const parentId = sourcePage.id;
      const { data: childPages, error: childError } = await supabase
        .from('pages')
        .select('id, content_hash')
        .eq('site_id', SITE_ID)
        .eq('locale', sourceLocale)
        .ilike('id', `${parentId}/%`);
      if (!childError && childPages) {
        childPages.forEach(p => {
          childHashMap.set(p.id, p.content_hash);
        });
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
          const { data: targetExists, error: existError } = await supabase
            .from('pages')
            .select('id')
            .eq('id', pageId)
            .eq('locale', targetLocale)
            .eq('site_id', SITE_ID)
            .maybeSingle();

          if (existError || !targetExists) {
            await insertSyncLog(SITE_ID, pageId, sourceLocale, targetLocale, sourceHash, 'skipped', 'Target page not found for repair', operator);
            results.push({ pageId, targetLocale, status: 'skipped', reason: 'Target page not found' });
            // 跳过不计入成功/失败
            continue;
          }

          const { error: updateError } = await supabase
            .from('pages')
            .update({
              source_content_hash: sourceHash,
              source_locale: sourceLocale,
              last_sync_time: new Date().toISOString(),
              last_sync_operator: operator,
            })
            .eq('id', pageId)
            .eq('locale', targetLocale)
            .eq('site_id', SITE_ID);

          if (updateError) throw new Error(`Update pages failed: ${updateError.message}`);
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