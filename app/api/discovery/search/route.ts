// app/api/discovery/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const SITE_ID = '000001';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const q = searchParams.get('q') || '';
  const locale = searchParams.get('locale') || 'zh';

  if (!q.trim()) {
    return NextResponse.json([]);
  }

  const db = getDb();

  // 搜索 pages 表，匹配 title 或 content 字段
  const rows = db.prepare(`
    SELECT id, title, url, content_summary as content, updatedAt
    FROM pages
    WHERE site_id = ? AND locale = ?
      AND (title LIKE ? OR content_summary LIKE ?)
    ORDER BY 
      CASE 
        WHEN title LIKE ? THEN 1 
        WHEN content_summary LIKE ? THEN 2 
        ELSE 3 
      END,
      updatedAt DESC
    LIMIT 50
  `).all(
    SITE_ID,
    locale,
    `%${q}%`,
    `%${q}%`,
    `%${q}%`,
    `%${q}%`
  ) as Array<{
    id: string;
    title: string;
    url: string;
    content: string;
    updatedAt: string;
  }>;

  return NextResponse.json(rows);
}