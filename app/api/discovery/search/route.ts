import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';
const SEARCHABLE_TYPES = ['product', 'page', 'blogPost', 'doc', 'video'];
const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const q = searchParams.get('q') || '';
  const locale = searchParams.get('locale') || 'zh';
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

  // ---- 1. 标题匹配（全量） ----
  const { data: titleMatches, error: titleError } = await supabase
    .from('pages')
    .select(SELECT_FIELDS)
    .eq('site_id', SITE_ID)
    .eq('locale', locale)
    .in('type', SEARCHABLE_TYPES)
    .ilike('title', searchTerm)
    .order('updatedAt', { ascending: false });

  if (titleError) {
    console.error('Discovery search title error:', titleError);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }

  // ---- 2. 内容匹配（全量，不用 .not()） ----
  const { data: contentMatchesRaw, error: contentError } = await supabase
    .from('pages')
    .select(SELECT_FIELDS)
    .eq('site_id', SITE_ID)
    .eq('locale', locale)
    .in('type', SEARCHABLE_TYPES)
    .ilike('content_summary', searchTerm)
    .order('updatedAt', { ascending: false });

  if (contentError) {
    console.error('Discovery search content error:', contentError);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }

  // ---- 3. JS 去重（避开 PostgREST 的 .not('id','in',...) 语法坑） ----
  const titleIdSet = new Set((titleMatches || []).map(r => r.id));
  const contentMatches = (contentMatchesRaw || []).filter(r => !titleIdSet.has(r.id));

  // ---- 4. 合并 + 分页 ----
  const allResults = [...(titleMatches || []), ...contentMatches];
  const total = allResults.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);

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