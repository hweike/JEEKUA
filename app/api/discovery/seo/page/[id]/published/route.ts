// app/api/discovery/seo/page/[id]/published/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
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

    // 1. 查询 pages 表获取正式数据
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .select('id, type, title, seo_title, seo_description, seo_keywords')
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('id', id)
      .eq('locale', locale)
      .single();

    if (pageError) throw pageError;

    // 2. 获取 analyzed_keywords（从 page_seo_data）
    const { data: seoData, error: seoError } = await supabase
      .from('page_seo_data')
      .select('analyzed_keywords')
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('page_id', id)
      .eq('locale', locale)
      .maybeSingle();

    if (seoError) throw seoError;

    // 3. 获取策略配置
    const strategies = await strategiesService.getStrategies(DEFAULT_SITE_ID);
    const strategy = strategies.find((s) => s.page_type === page.type);
    const fields = strategy?.fields || {};

    // 4. 计算正式数据的评分
    const config = {
      titleMinLength: fields?.seo_title?.minLength || 30,
      titleMaxLength: fields?.seo_title?.maxLength || 60,
      descMinLength: fields?.seo_description?.minLength || 80,
      descMaxLength: fields?.seo_description?.maxLength || 160,
      keywordMinCount: fields?.seo_keywords?.minCount || 2,
      keywordMaxCount: fields?.seo_keywords?.maxCount || 5,
    };

    const keywords = page.seo_keywords
      ? page.seo_keywords.split(',').map((k: string) => k.trim()).filter(Boolean)
      : [];
    const analyzed = seoData?.analyzed_keywords || [];

    const score = calculateSeoScore(
      page.seo_title,
      page.seo_description,
      keywords,
      analyzed,
      config
    );

    // 5. 返回正式数据
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