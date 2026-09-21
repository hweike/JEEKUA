import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
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
  const SELECT_FIELDS = 'id, title, url, type, content_summary, cover_image, updatedAt';

  // ---- 1. 标题匹配 ----
  const { data: titleMatches, error: titleError } = await supabase
    .from('pages')
    .select(SELECT_FIELDS)
    .eq('site_id', SITE_ID)
    .eq('locale', locale)
    .in('type', SEARCHABLE_TYPES)
    .ilike('title', searchTerm)
    .order('updatedAt', { ascending: false });

  if (titleError) {
    console.error('Search title error:', titleError);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }

  // ---- 2. 内容匹配（不带 .not()，在 JS 里排除重复） ----
  const { data: contentMatchesRaw, error: contentError } = await supabase
    .from('pages')
    .select(SELECT_FIELDS)
    .eq('site_id', SITE_ID)
    .eq('locale', locale)
    .in('type', SEARCHABLE_TYPES)
    .ilike('content_summary', searchTerm)
    .order('updatedAt', { ascending: false });

  if (contentError) {
    console.error('Search content error:', contentError);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }

  // ---- 3. JS 里排除标题已匹配的 ----
  const titleIdSet = new Set((titleMatches || []).map(r => r.id));
  const contentMatches = (contentMatchesRaw || []).filter(
    row => !titleIdSet.has(row.id)
  );

  // ---- 4. 合并 + 计算 total ----
  const allResults = [...(titleMatches || []), ...contentMatches];
  const total = allResults.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ---- 5. 分页切片 ----
  const from = (page - 1) * PAGE_SIZE;
  const pagedResults = allResults.slice(from, from + PAGE_SIZE);

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
}