import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const q = searchParams.get('q') || '';
  const locale = searchParams.get('locale') || 'zh';

  if (!q.trim()) {
    return NextResponse.json([]);
  }

  const searchTerm = `%${q}%`;

  // 1. 标题匹配
  const { data: titleMatches, error: titleError } = await supabase
    .from('pages')
    .select('id, title, url, content_summary, updatedAt')
    .eq('site_id', SITE_ID)
    .eq('locale', locale)
    .ilike('title', searchTerm)
    .limit(50);

  if (titleError) {
    console.error('Search title error:', titleError);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }

  // 2. 内容匹配（排除已标题匹配的）
  const titleIds = titleMatches?.map(item => item.id) || [];
  let contentQuery = supabase
    .from('pages')
    .select('id, title, url, content_summary, updatedAt')
    .eq('site_id', SITE_ID)
    .eq('locale', locale)
    .ilike('content_summary', searchTerm);

  if (titleIds.length > 0) {
    contentQuery = contentQuery.not('id', 'in', `(${titleIds.join(',')})`);
  }

  const { data: contentMatches, error: contentError } = await contentQuery.limit(50);

  if (contentError) {
    console.error('Search content error:', contentError);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }

  // 合并结果，标题匹配在前，内容匹配在后
  const allResults = [...(titleMatches || []), ...(contentMatches || [])].slice(0, 50);

  const rows = allResults.map(row => ({
    id: row.id,
    title: row.title,
    url: row.url,
    content: row.content_summary || '',
    updatedAt: row.updatedAt,
  }));

  return NextResponse.json(rows);
}