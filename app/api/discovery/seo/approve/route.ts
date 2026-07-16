// app/api/discovery/seo/approve/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { seoService } from '@/lib/seo/services';
import { syncService } from '@/lib/seo/services/sync.service';

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

    try {
      await seoService.approveSeo(DEFAULT_SITE_ID, pageId, locale);
    } catch (approveError) {
      // 如果是因为 page_seo_data 不存在导致的跳过，不算错误
      if (approveError instanceof Error && approveError.message.includes('跳过发布')) {
        return NextResponse.json({ success: true, skipped: true });
      }
      throw approveError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('确认发布失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}