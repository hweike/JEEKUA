// app/api/discovery/seo/page/[id]/published/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/admin';
import { calculateSeoScore } from '@/lib/seo/utils/score';
import { strategiesService } from '@/lib/seo/services';
import type { SeoScoreResult } from '@/lib/seo/types';

const DEFAULT_SITE_ID = '000001';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const locale = searchParams.get('locale') || 'en';

    // 1. 查询 pages 表
    let page: { id: string; type: string; title: string; seo_title: string | null; seo_description: string | null; seo_keywords: string | null } | undefined;
    try {
      const rows = await sql<{ id: string; type: string; title: string; seo_title: string | null; seo_description: string | null; seo_keywords: string | null }[]>`
        SELECT id, type, title, seo_title, seo_description, seo_keywords FROM public.pages
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND id = ${id}
          AND locale = ${locale}
        LIMIT 1
      `;
      page = rows[0];
    } catch (pageError: any) {
      throw pageError;
    }

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // 2. 获取 analyzed_keywords
    let analyzed: string[] = [];
    try {
      const rows = await sql<{ analyzed_keywords: string[] | null }[]>`
        SELECT analyzed_keywords FROM public.page_seo_data
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND page_id = ${id}
          AND locale = ${locale}
        LIMIT 1
      `;
      analyzed = rows[0]?.analyzed_keywords || [];
    } catch {}

    // 3. 获取策略配置
    const strategies = await strategiesService.getStrategies(DEFAULT_SITE_ID);
    const strategy = strategies.find((s) => s.page_type === page!.type);
    const fields = strategy?.fields || {};

    // 4. 计算评分
    const config = {
      titleMinLength: (fields as any)?.seo_title?.minLength || 30,
      titleMaxLength: (fields as any)?.seo_title?.maxLength || 60,
      descMinLength: (fields as any)?.seo_description?.minLength || 80,
      descMaxLength: (fields as any)?.seo_description?.maxLength || 160,
      keywordMinCount: (fields as any)?.seo_keywords?.minCount || 2,
      keywordMaxCount: (fields as any)?.seo_keywords?.maxCount || 5,
    };

    const keywords = page.seo_keywords
      ? page.seo_keywords.split(',').map((k: string) => k.trim()).filter(Boolean)
      : [];

    const score = calculateSeoScore(
      page.seo_title,
      page.seo_description,
      keywords,
      analyzed,
      config
    );

    // 5. 返回
    return NextResponse.json({
      data: {
        seo_title: page.seo_title,
        seo_description: page.seo_description,
        seo_keywords: page.seo_keywords,
        analyzed_keywords: analyzed,
        seoScore: score,
      },
    });
  } catch (error: any) {
    console.error('获取已发布 SEO 数据失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}