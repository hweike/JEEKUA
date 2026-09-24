// app/api/discovery/pages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/admin';

const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'zh';

  try {
    const rows = await sql<any[]>`
      SELECT id, title, type, url, seo_title, seo_description, seo_keywords, noindex, "updatedAt"
      FROM public.pages
      WHERE site_id = ${SITE_ID}
        AND locale = ${locale}
      ORDER BY type ASC, title ASC
    `;

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
  } catch (error: any) {
    console.error('GET /api/discovery/pages error:', error);
    return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 });
  }
}