// app/api/page/alternatives/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const SITE_ID = '000001';

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path');
  if (!path) {
    return NextResponse.json({ error: 'Missing path' }, { status: 400 });
  }

  const db = getDb();
  // 查找当前路径对应的页面，获取其 id
  const currentPage = db.prepare(`
    SELECT id, locale FROM pages
    WHERE site_id = ? AND url = ? AND noindex = 0
    LIMIT 1
  `).get(SITE_ID, path) as { id: string; locale: string } | undefined;

  if (!currentPage) {
    // 如果没有找到，返回空数组，前端会使用降级跳转
    return NextResponse.json([]);
  }

  // 查询同一 id 下所有语言版本的 url（包括所有已开通语言）
  const alternatives = db.prepare(`
    SELECT locale, url FROM pages
    WHERE site_id = ? AND id = ? AND noindex = 0
    ORDER BY locale
  `).all(SITE_ID, currentPage.id) as { locale: string; url: string }[];

  return NextResponse.json(alternatives);
}