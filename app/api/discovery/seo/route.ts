// app/api/discovery/seo/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/admin';
import crypto from 'crypto';

const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

function computeHash(data: any): string {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('md5').update(str).digest('hex');
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, locale, seo } = body;

  if (!id || !locale || !seo) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  try {
    // 1. 获取原页面信息
    let page: { title: string | null; content_hash: string | null; content_summary: string | null } | undefined;
    try {
      const rows = await sql<{ title: string | null; content_hash: string | null; content_summary: string | null }[]>`
        SELECT title, content_hash, content_summary FROM public.pages
        WHERE id = ${id}
          AND site_id = ${SITE_ID}
          AND locale = ${locale}
        LIMIT 1
      `;
      page = rows[0];
    } catch (pageError: any) {
      console.error('查询页面失败:', pageError);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // 2. 更新 pages 的 SEO 字段
    try {
      await sql`
        UPDATE public.pages
        SET seo_title = ${seo.metaTitle || null},
            seo_description = ${seo.metaDescription || null},
            seo_keywords = ${seo.metaKeywords || null},
            "updatedAt" = ${new Date().toISOString()}
        WHERE id = ${id}
          AND site_id = ${SITE_ID}
          AND locale = ${locale}
      `;
    } catch (updateError: any) {
      console.error('更新 SEO 字段失败:', updateError);
      return NextResponse.json({ error: 'Failed to update SEO' }, { status: 500 });
    }

    // 3. 获取 page_contents 中的 full_content
    let fullContent = '';
    try {
      const rows = await sql<{ full_content: string | null }[]>`
        SELECT full_content FROM public.page_contents
        WHERE page_id = ${id}
          AND site_id = ${SITE_ID}
          AND locale = ${locale}
        LIMIT 1
      `;
      if (rows[0]?.full_content) fullContent = rows[0].full_content;
    } catch (contentError: any) {
      console.error('查询 page_contents 失败:', contentError);
    }

    // 4. 重新计算 content_hash
    const newHash = computeHash({
      title: page.title,
      full_content: fullContent,
      seo_title: seo.metaTitle,
      seo_description: seo.metaDescription,
      seo_keywords: seo.metaKeywords,
    });

    try {
      await sql`
        UPDATE public.pages
        SET content_hash = ${newHash}
        WHERE id = ${id}
          AND site_id = ${SITE_ID}
          AND locale = ${locale}
      `;
    } catch (hashError: any) {
      console.error('更新 content_hash 失败:', hashError);
      return NextResponse.json({ error: 'Failed to update content hash' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/discovery/seo error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}