// app/api/discovery/seo/generate-multi/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { seoService, aiService } from '@/lib/seo/services';

const DEFAULT_SITE_ID = '000001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pageId, sourceLocale, targetLocales } = body;

    if (!pageId || !sourceLocale || !targetLocales?.length) {
      return NextResponse.json(
        { error: '缺少必要参数: pageId, sourceLocale, targetLocales' },
        { status: 400 }
      );
    }

    // 构建生成输入（使用第一个目标语言作为默认）
    const input = await seoService.buildGenerateInput(
      DEFAULT_SITE_ID,
      pageId,
      targetLocales[0],
      sourceLocale
    );

    // 调用 AI 生成多语言
    const results = await aiService.generateMultiLanguage(input, targetLocales);

    // 保存生成结果到 page_seo_data
    for (const [locale, result] of Object.entries(results)) {
      if (result.success && result.data) {
        await seoService.updateDraft(DEFAULT_SITE_ID, pageId, locale, {
          seo_title: result.data.seo_title,
          seo_description: result.data.seo_description,
          seo_keywords: result.data.seo_keywords,
        });
      } else {
        console.error(`生成 ${locale} 失败:`, result.error);
      }
    }

    return NextResponse.json({ data: results });
  } catch (error: any) {
    console.error('AI 多语言生成失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}