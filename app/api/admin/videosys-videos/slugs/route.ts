// app/api/admin/videosys-videos/slugs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/admin';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const locale = searchParams.get('locale') || 'zh';

    const data = await sql<{ id: string; slug: string }[]>`
      SELECT id, slug FROM public.videos
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND locale = ${locale}
        AND slug IS NOT NULL
        AND slug != ''
    `;

    return NextResponse.json({
      pages: data.map(item => ({
        id: item.id,
        slug: item.slug,
      })),
      slugs: data.map(item => item.slug).filter(Boolean),
    });
  } catch (error: any) {
    console.error('获取视频 slug 列表失败:', error);
    return NextResponse.json({ pages: [], slugs: [] });
  }
}