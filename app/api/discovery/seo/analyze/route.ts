import { NextRequest, NextResponse } from 'next/server';
import { seoService } from '@/lib/seo/services';

const DEFAULT_SITE_ID = '000001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pageId, locale } = body;

    if (!pageId || !locale) {
      return NextResponse.json(
        { error: '缺少 pageId 或 locale' },
        { status: 400 }
      );
    }

    // 分析页面
    await seoService.analyzePage(DEFAULT_SITE_ID, pageId, locale);
    
    // 获取更新后的数据
    const updated = await seoService.getPageSeoData(DEFAULT_SITE_ID, pageId, locale);
    
    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error('分析失败:', error);
    return NextResponse.json(
      { error: error.message || '分析失败' },
      { status: 500 }
    );
  }
}