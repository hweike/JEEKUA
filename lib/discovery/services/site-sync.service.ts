// lib/discovery/services/site-sync.service.ts
// 为 admin/discovery/Site-sync 提供数据服务，包含获取页面同步状态等功能
import sql from '@/lib/db/admin';
import { getEnabledLanguages } from '@/lib/languages/settings';
import { LANGUAGES } from '@/lib/languages/config';

const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export interface SyncPageItem {
  id: string;
  locale: string;
  type: string;
  title: string;
  slug: string;
  url: string;
  updatedAt: string;
  content_hash: string;
  syncedCount: number;
  totalTargetCount: number;
  needSync: boolean;
  source_locale?: string | null;
  source_content_hash?: string | null;
}

export interface SiteSyncResult {
  pages: SyncPageItem[];
  totalTargetCount: number;
}

/**
 * 获取源语言页面列表及其同步进度
 */
export async function getSiteSyncStatus(
  sourceLocale: string,
  types: string = 'latest'
): Promise<SiteSyncResult> {
  // 1. 获取所有已开通的语言
  const enabledCodes = await getEnabledLanguages();
  const allEnabledLocales = LANGUAGES
    .filter(lang => enabledCodes.includes(lang.code))
    .map(lang => lang.code);
  const targetLocales = allEnabledLocales.filter(loc => loc !== sourceLocale);
  const totalTargetCount = targetLocales.length;

  // 2. 查询该语言的所有页面（动态 WHERE + ORDER BY）
  const conditions: any[] = [
    sql`site_id = ${SITE_ID}`,
    sql`locale = ${sourceLocale}`,
  ];

  if (types === 'productCollection') {
    conditions.push(sql`type = 'productCollection'`);
  } else if (types === 'product') {
    conditions.push(sql`type = 'product'`);
  }

  const whereClause = conditions.reduce(
    (acc, c, i) => (i === 0 ? c : sql`${acc} AND ${c}`),
    sql``
  );

  // ORDER BY 白名单
  const orderClause =
    types === 'latest' || types === 'productCollection' || types === 'product'
      ? sql`"updatedAt" DESC`
      : sql`title ASC`;

  let sourcePages: any[];
  try {
    sourcePages = await sql<any[]>`
      SELECT id, site_id, locale, type, title, slug, url,
             "updatedAt", content_hash, source_locale, source_content_hash
      FROM public.pages
      WHERE ${whereClause}
      ORDER BY ${orderClause}
    `;
  } catch (sourceError: any) {
    throw sourceError;
  }

  if (!sourcePages || sourcePages.length === 0) {
    return { pages: [], totalTargetCount };
  }

  // 3. 根据源语言类型分别处理
  let pagesWithSync: SyncPageItem[];

  if (sourceLocale === 'en') {
    const originalPages = sourcePages.filter(p => p.source_locale === null);
    const translatedPages = sourcePages.filter(p => p.source_locale !== null);

    // 3a. 原始英文页面：计算同步进度
    let syncMap = new Map<string, Set<string>>();
    if (originalPages.length > 0 && targetLocales.length > 0) {
      const pageIds = originalPages.map(p => p.id);
      try {
        const targetPages = await sql<{ id: string; locale: string; source_content_hash: string | null }[]>`
          SELECT id, locale, source_content_hash FROM public.pages
          WHERE id IN ${sql(pageIds)}
            AND site_id = ${SITE_ID}
            AND source_locale = ${sourceLocale}
            AND locale IN ${sql(targetLocales)}
        `;
        originalPages.forEach(p => syncMap.set(p.id, new Set()));
        for (const tp of targetPages) {
          const srcHash = originalPages.find(sp => sp.id === tp.id)?.content_hash;
          if (srcHash && tp.source_content_hash === srcHash) {
            syncMap.get(tp.id)?.add(tp.locale);
          }
        }
      } catch {
        // 查询失败时 syncMap 保持空
      }
    }

    const originalResults: SyncPageItem[] = originalPages.map(page => ({
      id: page.id,
      locale: page.locale,
      type: page.type,
      title: page.title,
      slug: page.slug || '',
      url: page.url,
      updatedAt: page.updatedAt,
      content_hash: page.content_hash,
      syncedCount: syncMap.get(page.id)?.size || 0,
      totalTargetCount,
      needSync: (syncMap.get(page.id)?.size || 0) < totalTargetCount,
      source_locale: page.source_locale,
      source_content_hash: page.source_content_hash,
    }));

    const translatedResults: SyncPageItem[] = translatedPages.map(page => ({
      id: page.id,
      locale: page.locale,
      type: page.type,
      title: page.title,
      slug: page.slug || '',
      url: page.url,
      updatedAt: page.updatedAt,
      content_hash: page.content_hash,
      syncedCount: totalTargetCount,
      totalTargetCount,
      needSync: false,
      source_locale: page.source_locale,
      source_content_hash: page.source_content_hash,
    }));

    pagesWithSync = [...originalResults, ...translatedResults];
    pagesWithSync.sort((a, b) => a.title.localeCompare(b.title));
  } else {
    const originalPages = sourcePages.filter(p => p.source_locale === null);
    const translatedPages = sourcePages.filter(p => p.source_locale === 'en');

    const originalResults: SyncPageItem[] = originalPages.map(page => ({
      id: page.id,
      locale: page.locale,
      type: page.type,
      title: page.title,
      slug: page.slug || '',
      url: page.url,
      updatedAt: page.updatedAt,
      content_hash: page.content_hash,
      syncedCount: 0,
      totalTargetCount: 1,
      needSync: true,
      source_locale: page.source_locale,
      source_content_hash: page.source_content_hash,
    }));

    const translatedResults: SyncPageItem[] = translatedPages.map(page => ({
      id: page.id,
      locale: page.locale,
      type: page.type,
      title: page.title,
      slug: page.slug || '',
      url: page.url,
      updatedAt: page.updatedAt,
      content_hash: page.content_hash,
      syncedCount: 1,
      totalTargetCount: 1,
      needSync: false,
      source_locale: page.source_locale,
      source_content_hash: page.source_content_hash,
    }));

    pagesWithSync = [...originalResults, ...translatedResults];
    pagesWithSync.sort((a, b) => a.title.localeCompare(b.title));
  }

  return {
    pages: pagesWithSync,
    totalTargetCount: sourceLocale === 'en' ? totalTargetCount : 1,
  };
}

/**
 * 专门用于中文→英文的同步状态查询
 */
export async function getCn2EnSyncStatus(
  types: string = 'latest'
): Promise<SiteSyncResult> {
  const sourceLocale = 'zh';
  const targetLocale = 'en';

  // 1. 检查英文是否已开通
  const enabledCodes = await getEnabledLanguages();
  if (!enabledCodes.includes('en')) {
    return { pages: [], totalTargetCount: 0 };
  }

  // 2. 查询所有中文页面（动态 WHERE + ORDER BY）
  const conditions: any[] = [
    sql`site_id = ${SITE_ID}`,
    sql`locale = ${sourceLocale}`,
  ];

  if (types === 'productCollection') {
    conditions.push(sql`type = 'productCollection'`);
  } else if (types === 'product') {
    conditions.push(sql`type = 'product'`);
  }

  const whereClause = conditions.reduce(
    (acc, c, i) => (i === 0 ? c : sql`${acc} AND ${c}`),
    sql``
  );

  const orderClause =
    types === 'latest' || types === 'productCollection' || types === 'product'
      ? sql`"updatedAt" DESC`
      : sql`title ASC`;

  let sourcePages: any[];
  try {
    sourcePages = await sql<any[]>`
      SELECT id, site_id, locale, type, title, slug, url,
             "updatedAt", content_hash, source_locale, source_content_hash
      FROM public.pages
      WHERE ${whereClause}
      ORDER BY ${orderClause}
    `;
  } catch (sourceError: any) {
    throw sourceError;
  }

  if (!sourcePages || sourcePages.length === 0) {
    return { pages: [], totalTargetCount: 1 };
  }

  // 3. 获取原始中文页面 ID，查询英文翻译记录
  const originalPageIds = sourcePages
    .filter(p => p.source_locale === null)
    .map(p => p.id);

  let targetPages: any[] = [];
  if (originalPageIds.length > 0) {
    try {
      targetPages = await sql<{ id: string; source_content_hash: string | null }[]>`
        SELECT id, source_content_hash FROM public.pages
        WHERE id IN ${sql(originalPageIds)}
          AND site_id = ${SITE_ID}
          AND locale = ${targetLocale}
          AND source_locale = ${sourceLocale}
      `;
    } catch {
      targetPages = [];
    }
  }

  const sourceHashMap = new Map<string, string>();
  sourcePages.forEach(p => sourceHashMap.set(p.id, p.content_hash));

  const syncedMap = new Map<string, boolean>();
  sourcePages.forEach(p => syncedMap.set(p.id, false));

  for (const tp of targetPages) {
    const srcHash = sourceHashMap.get(tp.id);
    if (srcHash && tp.source_content_hash === srcHash) {
      syncedMap.set(tp.id, true);
    }
  }

  // 4. 组装结果
  const pagesWithSync: SyncPageItem[] = sourcePages.map(page => {
    const isOriginal = page.source_locale === null;

    let syncedCount: number;
    let needSync: boolean;

    if (isOriginal) {
      const isSynced = syncedMap.get(page.id) || false;
      syncedCount = isSynced ? 1 : 0;
      needSync = !isSynced;
    } else {
      syncedCount = 1;
      needSync = false;
    }

    return {
      id: page.id,
      locale: page.locale,
      type: page.type,
      title: page.title,
      slug: page.slug || '',
      url: page.url,
      updatedAt: page.updatedAt,
      content_hash: page.content_hash,
      syncedCount,
      totalTargetCount: 1,
      needSync,
      source_locale: page.source_locale,
      source_content_hash: page.source_content_hash,
    };
  });

  return {
    pages: pagesWithSync,
    totalTargetCount: 1,
  };
}