// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/admin';
import { cookies } from 'next/headers';
import { getEnabledLanguages } from '@/lib/languages/settings';

const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';
const SEARCHABLE_TYPES = ['product', 'page', 'blogPost', 'doc', 'video'];
const PAGE_SIZE = 50;

async function getLocale(request: NextRequest): Promise<string> {
  const searchParams = request.nextUrl.searchParams;
  const localeParam = searchParams.get('locale');
  if (localeParam) return localeParam;

  const cookieStore = await cookies();
  const localeCookie =
    cookieStore.get('NEXT_LOCALE')?.value ||
    cookieStore.get('preferred_language')?.value;
  if (localeCookie) return localeCookie;

  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const enabledLanguages = await getEnabledLanguages();
    const langs = acceptLanguage.split(',').map(l => l.split(';')[0].trim());
    for (const lang of langs) {
      if (enabledLanguages.includes(lang)) return lang;
      const code = lang.substring(0, 2);
      if (enabledLanguages.includes(code)) return code;
    }
  }

  return 'zh';
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q') || '';
  const locale = await getLocale(request);
  const page = parseInt(searchParams.get('page') || '1', 10) || 1;

  if (!q.trim()) {
    return NextResponse.json({
      results: [],
      total: 0,
      page: 1,
      pageSize: PAGE_SIZE,
      totalPages: 0,
    });
  }

  const searchTerm = `%${q}%`;

  try {
    // 1. 标题匹配
    const titleMatches = await sql<any[]>`
      SELECT id, title, url, type, content_summary, cover_image, "updatedAt"
      FROM public.pages
      WHERE site_id = ${SITE_ID}
        AND locale = ${locale}
        AND type IN ${sql(SEARCHABLE_TYPES)}
        AND title ILIKE ${searchTerm}
      ORDER BY "updatedAt" DESC
    `;

    // 2. 内容匹配
    const contentMatchesRaw = await sql<any[]>`
      SELECT id, title, url, type, content_summary, cover_image, "updatedAt"
      FROM public.pages
      WHERE site_id = ${SITE_ID}
        AND locale = ${locale}
        AND type IN ${sql(SEARCHABLE_TYPES)}
        AND content_summary ILIKE ${searchTerm}
      ORDER BY "updatedAt" DESC
    `;

    // 3. 排除标题已匹配的
    const titleIdSet = new Set(titleMatches.map(r => r.id));
    const contentMatches = contentMatchesRaw.filter(row => !titleIdSet.has(row.id));

    // 4. 合并 + 分页
    const allResults = [...titleMatches, ...contentMatches];
    const total = allResults.length;
    const totalPages = Math.ceil(total / PAGE_SIZE);

    const offset = (page - 1) * PAGE_SIZE;
    const pagedResults = allResults.slice(offset, offset + PAGE_SIZE);

    const results = pagedResults.map(row => ({
      id: row.id,
      title: row.title,
      url: row.url,
      type: row.type,
      content_summary: row.content_summary || '',
      cover_image: row.cover_image || '',
      updatedAt: row.updatedAt,
    }));

    return NextResponse.json({
      results,
      total,
      page,
      pageSize: PAGE_SIZE,
      totalPages,
    });
  } catch (error: any) {
    console.error('[API] Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}