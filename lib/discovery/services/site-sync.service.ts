// lib/discovery/services/site-sync.service.ts
// 为 admin/discovery/Site-sync 提供数据服务，包含获取页面同步状态等功能
import { supabase } from '@/lib/supabase/client';
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
 * @param sourceLocale - 源语言代码（如 'en'）
 * @param types - 页面类型过滤：'latest' | 'productCollection' | 'product'
 * @returns 页面列表及目标语言总数
 */
export async function getSiteSyncStatus(
  sourceLocale: string,
  types: string = 'latest'
): Promise<SiteSyncResult> {
  // 1. 获取所有已开通的语言
  const enabledCodes = await getEnabledLanguages();
  const allEnabledLocales = LANGUAGES.filter(lang => enabledCodes.includes(lang.code)).map(lang => lang.code);
  const targetLocales = allEnabledLocales.filter(loc => loc !== sourceLocale);
  const totalTargetCount = targetLocales.length;

  // 2. 查询该语言的所有页面（包括原始和翻译页面）
  let query = supabase
    .from('pages')
    .select(`
      id,
      site_id,
      locale,
      type,
      title,
      slug,
      url,
      updatedAt,
      content_hash,
      source_locale,
      source_content_hash
    `)
    .eq('site_id', SITE_ID)
    .eq('locale', sourceLocale);

  // 类型过滤
  if (types === 'productCollection') {
    query = query.eq('type', 'productCollection');
  } else if (types === 'product') {
    query = query.eq('type', 'product');
  } else if (types === 'latest') {
    query = query.order('updatedAt', { ascending: false });
  } else {
    query = query.order('updatedAt', { ascending: false });
  }
  if (types !== 'latest') {
    query = query.order('title', { ascending: true });
  }

  const { data: sourcePages, error: sourceError } = await query;
  if (sourceError) throw sourceError;
  if (!sourcePages || sourcePages.length === 0) {
    return { pages: [], totalTargetCount };
  }

  // 3. 根据源语言类型分别处理
  let pagesWithSync: SyncPageItem[];

  if (sourceLocale === 'en') {
    // ---- 英文源：需要区分原始页面和翻译页面 ----
    const originalPages = sourcePages.filter(p => p.source_locale === null);
    const translatedPages = sourcePages.filter(p => p.source_locale !== null);

    // 3a. 原始英文页面：计算同步进度（到其他语言）
    let syncMap = new Map<string, Set<string>>();
    if (originalPages.length > 0) {
      const pageIds = originalPages.map(p => p.id);
      const { data: targetPages, error: targetError } = await supabase
        .from('pages')
        .select('id, locale, source_content_hash')
        .in('id', pageIds)
        .eq('site_id', SITE_ID)
        .eq('source_locale', sourceLocale)
        .in('locale', targetLocales);
      if (!targetError && targetPages) {
        originalPages.forEach(p => syncMap.set(p.id, new Set()));
        for (const tp of targetPages) {
          const srcHash = originalPages.find(sp => sp.id === tp.id)?.content_hash;
          if (srcHash && tp.source_content_hash === srcHash) {
            syncMap.get(tp.id)?.add(tp.locale);
          }
        }
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

    // 3b. 翻译页面（从中文同步来的）：标记为“已从中文站同步”，不可再同步
    const translatedResults: SyncPageItem[] = translatedPages.map(page => ({
      id: page.id,
      locale: page.locale,
      type: page.type,
      title: page.title,
      slug: page.slug || '',
      url: page.url,
      updatedAt: page.updatedAt,
      content_hash: page.content_hash,
      syncedCount: totalTargetCount,      // 显示为完全同步
      totalTargetCount,
      needSync: false,                    // 不显示“待同步”
      source_locale: page.source_locale,
      source_content_hash: page.source_content_hash,
    }));

    // 合并结果（可按标题排序）
    pagesWithSync = [...originalResults, ...translatedResults];
    pagesWithSync.sort((a, b) => a.title.localeCompare(b.title));
  } else {
    // ---- 非英文源（如中文）：区分原始页面和从英文同步来的页面 ----
    const originalPages = sourcePages.filter(p => p.source_locale === null);
    const translatedPages = sourcePages.filter(p => p.source_locale === 'en'); // 假设只有从英文同步来的

    // 原始页面：显示“待同步”
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
      totalTargetCount: 1,               // 只有英文一个目标
      needSync: true,                    // 待同步
      source_locale: page.source_locale,
      source_content_hash: page.source_content_hash,
    }));

    // 翻译页面（从英文同步来的）：显示“已从英文站同步”
    const translatedResults: SyncPageItem[] = translatedPages.map(page => ({
      id: page.id,
      locale: page.locale,
      type: page.type,
      title: page.title,
      slug: page.slug || '',
      url: page.url,
      updatedAt: page.updatedAt,
      content_hash: page.content_hash,
      syncedCount: 1,                    // 已同步
      totalTargetCount: 1,
      needSync: false,                   // 不需要同步
      source_locale: page.source_locale,
      source_content_hash: page.source_content_hash,
    }));

    pagesWithSync = [...originalResults, ...translatedResults];
    pagesWithSync.sort((a, b) => a.title.localeCompare(b.title));
  }

  return {
    pages: pagesWithSync,
    totalTargetCount: sourceLocale === 'en' ? totalTargetCount : 1, // 非英文目标只有英文
  };
}

// 专门针对中文→英文的同步状态查询，简化逻辑只关注英文是否已同步  
/**
 * 专门用于中文→英文的同步状态查询
 * 只关注中文页面是否已同步到英文站
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

  // 2. 查询所有中文页面（不再过滤 source_locale）
  let query = supabase
    .from('pages')
    .select(`
      id,
      site_id,
      locale,
      type,
      title,
      slug,
      url,
      updatedAt,
      content_hash,
      source_locale,
      source_content_hash
    `)
    .eq('site_id', SITE_ID)
    .eq('locale', sourceLocale);

  // 类型过滤
  if (types === 'productCollection') {
    query = query.eq('type', 'productCollection');
  } else if (types === 'product') {
    query = query.eq('type', 'product');
  } else if (types === 'latest') {
    query = query.order('updatedAt', { ascending: false });
  } else {
    query = query.order('updatedAt', { ascending: false });
  }
  if (types !== 'latest') {
    query = query.order('title', { ascending: true });
  }

  const { data: sourcePages, error: sourceError } = await query;
  if (sourceError) throw sourceError;
  if (!sourcePages || sourcePages.length === 0) {
    return { pages: [], totalTargetCount: 1 };
  }

  // 3. 获取所有原始中文页面（source_locale IS NULL）的 ID，用于查询英文翻译记录
  const originalPageIds = sourcePages
    .filter(p => p.source_locale === null)
    .map(p => p.id);

  let targetPages: any[] = [];
  if (originalPageIds.length > 0) {
    const { data, error } = await supabase
      .from('pages')
      .select('id, source_content_hash')
      .in('id', originalPageIds)
      .eq('site_id', SITE_ID)
      .eq('locale', targetLocale)
      .eq('source_locale', sourceLocale);
    if (!error) targetPages = data || [];
  }

  // 构建映射：原始中文页面ID -> 是否已同步到英文
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
      // 原始页面：根据是否已同步到英文决定状态
      const isSynced = syncedMap.get(page.id) || false;
      syncedCount = isSynced ? 1 : 0;
      needSync = !isSynced;
    } else {
      // 非原始页面（已从其他语言同步过来），视为“已同步”状态，但不可再同步
      syncedCount = 1;          // 显示为已完成
      needSync = false;        // 不显示“待同步”
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
      totalTargetCount: 1,      // 固定为1（英文）
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