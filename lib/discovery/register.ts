// lib/discovery/register.ts
import { supabase } from '@/lib/supabase/client';
import crypto from 'crypto';

export const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export interface PageData {
  id: string;
  type: string;
  title: string;
  slug?: string;
  url: string;
  cover_image?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string | null;
  canonical?: string | null;
  noindex?: boolean;
  nofollow?: boolean;
  priority?: number;
  changefreq?: string;
  content_summary?: string | null;
  content_full?: string | null;
  translated_by_ai?: boolean;
  updatedAt?: string;
  // 同步相关字段（仅目标语言页面需要，扫描时不传则保留原值）
  source_content_hash?: string | null;
  source_locale?: string | null;
  last_sync_time?: string | null;
  last_sync_operator?: string | null;
}

export function computeHash(data: any): string {
  const sorted = sortObjectKeys(data);
  const str = JSON.stringify(sorted);
  return crypto.createHash('md5').update(str).digest('hex');
}

function sortObjectKeys(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  return Object.keys(obj).sort().reduce((acc, key) => {
    acc[key] = sortObjectKeys(obj[key]);
    return acc;
  }, {} as any);
}

/**
 * 注册或更新页面（源语言或目标语言）
 * - 对于源语言页面：不传 source_content_hash, source_locale, last_sync_time, last_sync_operator
 * - 对于目标语言页面：需传入 source_content_hash, source_locale，可选 last_sync_time, last_sync_operator
 * - 保护机制：如果调用方未传入同步字段，则保留数据库中已有的值（避免扫描覆盖）
 */
export async function upsertPage(page: PageData, locale: string): Promise<void> {
  // ===== 强制类型映射（根据业务需求调整） =====
  const FORCED_TYPE_MAP: Record<string, string> = {
    '10000001': 'home',
    // 可添加更多：'10000002': 'inquiry', 等
  };
  const rawId = page.id.startsWith('page:') ? page.id.slice(5) : page.id;
if (FORCED_TYPE_MAP[rawId]) {
  page.type = FORCED_TYPE_MAP[rawId];
}
  // =============================================

  // 1. 先查询现有记录的同步字段
  const { data: existing, error: fetchError } = await supabase
    .from('pages')
    .select('source_content_hash, source_locale, last_sync_time, last_sync_operator')
    .eq('id', page.id)
    .eq('site_id', SITE_ID)
    .eq('locale', locale)
    .maybeSingle();

  if (fetchError) {
    console.error(`查询现有页面 ${page.id} (${locale}) 失败:`, fetchError);
    throw new Error(`Failed to fetch existing page: ${fetchError.message}`);
  }

  // 2. 计算内容哈希（基于新传入的内容）
  const contentHash = computeHash({
    title: page.title,
    full_content: page.content_full || '',
    seo_title: page.seo_title || '',
    seo_description: page.seo_description || '',
    seo_keywords: page.seo_keywords || '',
  });

  // 3. 构建页面记录：同步字段若未显式传入，则使用现有记录的值（若无现有记录则为 null）
  const pageRecord: any = {
    id: page.id,
    site_id: SITE_ID,
    locale: locale,
    type: page.type,
    title: page.title,
    slug: page.slug || null,
    url: page.url,
    cover_image: page.cover_image || null,
    seo_title: page.seo_title || null,
    seo_description: page.seo_description || null,
    seo_keywords: page.seo_keywords || null,
    canonical: page.canonical || null,
    noindex: page.noindex ? 1 : 0,
    nofollow: page.nofollow ? 1 : 0,
    priority: page.priority ?? 0.5,
    changefreq: page.changefreq || 'weekly',
    content_summary: page.content_summary || null,
    content_hash: contentHash,
    translated_by_ai: page.translated_by_ai ? 1 : 0,
    updatedAt: page.updatedAt || new Date().toISOString(),
    // 同步字段：优先使用传入值（若为 undefined 则保留现有，若为 null 则清空，若现有也为 null 则最终为 null）
    source_content_hash: page.source_content_hash !== undefined ? page.source_content_hash : (existing?.source_content_hash ?? null),
    source_locale: page.source_locale !== undefined ? page.source_locale : (existing?.source_locale ?? null),
    last_sync_time: page.last_sync_time !== undefined ? page.last_sync_time : (existing?.last_sync_time ?? null),
    last_sync_operator: page.last_sync_operator !== undefined ? page.last_sync_operator : (existing?.last_sync_operator ?? null),
  };

  // 4. 执行 upsert
  const { error: pageError } = await supabase
    .from('pages')
    .upsert(pageRecord, { onConflict: 'id, site_id, locale' });
  if (pageError) {
    console.error(`Upsert page ${page.id} (${locale}) failed:`, pageError);
    throw new Error(`Failed to upsert page: ${pageError.message}`);
  }

  // 5. 处理 page_contents（仅当有内容时）
  if (page.content_full) {
    const { error: contentError } = await supabase
      .from('page_contents')
      .upsert({
        page_id: page.id,
        site_id: SITE_ID,
        locale: locale,
        full_content: page.content_full,
        content_hash: contentHash,
        updatedAt: page.updatedAt || new Date().toISOString(),
      }, { onConflict: 'page_id, site_id, locale' });
    if (contentError) {
      console.error(`Upsert page_contents for ${page.id} (${locale}) failed:`, contentError);
      throw new Error(`Failed to upsert page content: ${contentError.message}`);
    }
  }
}

export async function deletePage(pageId: string, locale: string): Promise<void> {
  const { error: pageDeleteError } = await supabase
    .from('pages')
    .delete()
    .eq('id', pageId)
    .eq('site_id', SITE_ID)
    .eq('locale', locale);
  if (pageDeleteError) {
    console.error(`Delete page ${pageId} (${locale}) failed:`, pageDeleteError);
    throw new Error(`Failed to delete page: ${pageDeleteError.message}`);
  }

  const { error: contentDeleteError } = await supabase
    .from('page_contents')
    .delete()
    .eq('page_id', pageId)
    .eq('site_id', SITE_ID)
    .eq('locale', locale);
  if (contentDeleteError) {
    console.error(`Delete page_contents for ${pageId} (${locale}) failed:`, contentDeleteError);
    throw new Error(`Failed to delete page content: ${contentDeleteError.message}`);
  }
}