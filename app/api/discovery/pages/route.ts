// app/api/discovery/pages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const SITE_ID = '000001';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'zh';

  const db = getDb();
  const rows = db.prepare(`
    SELECT 
      id, 
      title, 
      type, 
      url, 
      seo_title, 
      seo_description, 
      seo_keywords,
      noindex,
      updatedAt
    FROM pages
    WHERE site_id = ? AND locale = ?
    ORDER BY type, title
  `).all(SITE_ID, locale);

  // 转换为前端期望格式（包含 seo 对象）
  const pages = rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    type: row.type,
    url: row.url,
    seo: {
      metaTitle: row.seo_title,
      metaDescription: row.seo_description,
      metaKeywords: row.seo_keywords,
    },
    noindex: row.noindex === 1,
    updatedAt: row.updatedAt,
  }));

  return NextResponse.json(pages);
}