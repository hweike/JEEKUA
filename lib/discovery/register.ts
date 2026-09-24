// lib/discovery/register.ts
import sql from '@/lib/db/admin';
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

export async function upsertPage(page: PageData, locale: string): Promise<void> {
  // 强制类型映射
  const FORCED_TYPE_MAP: Record<string, string> = {
    '10000001': 'home',
  };
  const rawId = page.id.startsWith('page:') ? page.id.slice(5) : page.id;
  if (FORCED_TYPE_MAP[rawId]) {
    page.type = FORCED_TYPE_MAP[rawId];
  }

  // 1. 查询现有记录的同步字段
  let existing: {
    source_content_hash: string | null;
    source_locale: string | null;
    last_sync_time: string | null;
    last_sync_operator: string | null;
  } | undefined;
  try {
    const rows = await sql<typeof existing[]>`
      SELECT source_content_hash, source_locale, last_sync_time, last_sync_operator
      FROM public.pages
      WHERE id = ${page.id}
        AND site_id = ${SITE_ID}
        AND locale = ${locale}
      LIMIT 1
    `;
    existing = rows[0];
  } catch (fetchError: any) {
    console.error(`查询现有页面 ${page.id} (${locale}) 失败:`, fetchError);
    throw new Error(`Failed to fetch existing page: ${fetchError.message}`);
  }

  // 2. 计算内容哈希
  const contentHash = computeHash({
    title: page.title,
    full_content: page.content_full || '',
    seo_title: page.seo_title || '',
    seo_description: page.seo_description || '',
    seo_keywords: page.seo_keywords || '',
  });

  // 3. 构建记录字段值
  const now = new Date().toISOString();
  const values = {
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
    updatedAt: page.updatedAt || now,
    source_content_hash:
      page.source_content_hash !== undefined
        ? page.source_content_hash
        : existing?.source_content_hash ?? null,
    source_locale:
      page.source_locale !== undefined ? page.source_locale : existing?.source_locale ?? null,
    last_sync_time:
      page.last_sync_time !== undefined ? page.last_sync_time : existing?.last_sync_time ?? null,
    last_sync_operator:
      page.last_sync_operator !== undefined
        ? page.last_sync_operator
        : existing?.last_sync_operator ?? null,
  };

  // 4. upsert pages（显式列名，避免 sql(obj) 的引用问题）
  try {
    await sql`
      INSERT INTO public.pages (
        id, site_id, locale, type, title, slug, url, cover_image,
        seo_title, seo_description, seo_keywords, canonical, noindex, nofollow,
        priority, changefreq, content_summary, content_hash, translated_by_ai,
        "updatedAt", source_content_hash, source_locale, last_sync_time, last_sync_operator
      ) VALUES (
        ${values.id}, ${values.site_id}, ${values.locale}, ${values.type},
        ${values.title}, ${values.slug}, ${values.url}, ${values.cover_image},
        ${values.seo_title}, ${values.seo_description}, ${values.seo_keywords},
        ${values.canonical}, ${values.noindex}, ${values.nofollow},
        ${values.priority}, ${values.changefreq}, ${values.content_summary},
        ${values.content_hash}, ${values.translated_by_ai}, ${values.updatedAt},
        ${values.source_content_hash}, ${values.source_locale},
        ${values.last_sync_time}, ${values.last_sync_operator}
      )
      ON CONFLICT (id, site_id, locale)
      DO UPDATE SET
        type = EXCLUDED.type,
        title = EXCLUDED.title,
        slug = EXCLUDED.slug,
        url = EXCLUDED.url,
        cover_image = EXCLUDED.cover_image,
        seo_title = EXCLUDED.seo_title,
        seo_description = EXCLUDED.seo_description,
        seo_keywords = EXCLUDED.seo_keywords,
        canonical = EXCLUDED.canonical,
        noindex = EXCLUDED.noindex,
        nofollow = EXCLUDED.nofollow,
        priority = EXCLUDED.priority,
        changefreq = EXCLUDED.changefreq,
        content_summary = EXCLUDED.content_summary,
        content_hash = EXCLUDED.content_hash,
        translated_by_ai = EXCLUDED.translated_by_ai,
        "updatedAt" = EXCLUDED."updatedAt",
        source_content_hash = EXCLUDED.source_content_hash,
        source_locale = EXCLUDED.source_locale,
        last_sync_time = EXCLUDED.last_sync_time,
        last_sync_operator = EXCLUDED.last_sync_operator
    `;
  } catch (pageError: any) {
    console.error(`Upsert page ${page.id} (${locale}) failed:`, pageError);
    throw new Error(`Failed to upsert page: ${pageError.message}`);
  }

  // 5. 处理 page_contents
  if (page.content_full) {
    try {
      await sql`
        INSERT INTO public.page_contents (
          page_id, site_id, locale, full_content, content_hash, "updatedAt"
        ) VALUES (
          ${page.id}, ${SITE_ID}, ${locale}, ${page.content_full},
          ${contentHash}, ${page.updatedAt || now}
        )
        ON CONFLICT (page_id, site_id, locale)
        DO UPDATE SET
          full_content = EXCLUDED.full_content,
          content_hash = EXCLUDED.content_hash,
          "updatedAt" = EXCLUDED."updatedAt"
      `;
    } catch (contentError: any) {
      console.error(`Upsert page_contents for ${page.id} (${locale}) failed:`, contentError);
      throw new Error(`Failed to upsert page content: ${contentError.message}`);
    }
  }
}

export async function deletePage(pageId: string, locale: string): Promise<void> {
  try {
    await sql`
      DELETE FROM public.pages
      WHERE id = ${pageId}
        AND site_id = ${SITE_ID}
        AND locale = ${locale}
    `;
  } catch (pageDeleteError: any) {
    console.error(`Delete page ${pageId} (${locale}) failed:`, pageDeleteError);
    throw new Error(`Failed to delete page: ${pageDeleteError.message}`);
  }

  try {
    await sql`
      DELETE FROM public.page_contents
      WHERE page_id = ${pageId}
        AND site_id = ${SITE_ID}
        AND locale = ${locale}
    `;
  } catch (contentDeleteError: any) {
    console.error(`Delete page_contents for ${pageId} (${locale}) failed:`, contentDeleteError);
    throw new Error(`Failed to delete page content: ${contentDeleteError.message}`);
  }
}