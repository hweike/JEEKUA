import { NextRequest, NextResponse } from 'next/server';
import { seoService } from '@/lib/seo/services';

const DEFAULT_SITE_ID = '000001';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { pageId, locale, seo_title, seo_description, seo_keywords } = body;

    if (!pageId || !locale) {
      return NextResponse.json(
        { error: '缺少 pageId 或 locale' },
        { status: 400 }
      );
    }

    const data = await seoService.updateDraft(DEFAULT_SITE_ID, pageId, locale, {
      seo_title,
      seo_description,
      seo_keywords,
    });

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}