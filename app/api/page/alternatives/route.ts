import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path');
  if (!path) {
    return NextResponse.json({ error: 'Missing path' }, { status: 400 });
  }

  // 1. 查找当前路径对应的页面，获取其 id 和 locale
  const { data: currentPage, error: pageError } = await supabase
    .from('pages')
    .select('id, locale')
    .eq('site_id', SITE_ID)
    .eq('url', path)
    .eq('noindex', 0)
    .limit(1)
    .maybeSingle();

  if (pageError) {
    console.error('GET /api/page/alternatives error:', pageError);
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
  }

  if (!currentPage) {
    // 如果没有找到，返回空数组，前端会使用降级跳转
    return NextResponse.json([]);
  }

  // 2. 查询同一 id 下所有语言版本的 url（包括所有已开通语言）
  const { data: alternatives, error: altError } = await supabase
    .from('pages')
    .select('locale, url')
    .eq('site_id', SITE_ID)
    .eq('id', currentPage.id)
    .eq('noindex', 0)
    .order('locale', { ascending: true });

  if (altError) {
    console.error('GET /api/page/alternatives query alternatives error:', altError);
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
  }

  return NextResponse.json(alternatives || []);
}