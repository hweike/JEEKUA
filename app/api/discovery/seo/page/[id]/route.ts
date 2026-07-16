// app/api/discovery/seo/page/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { seoService } from '@/lib/seo/services';

const DEFAULT_SITE_ID = '000001';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const locale = searchParams.get('locale') || 'en';

    // ✅ 只查询 page_seo_data（草稿数据），不查询 pages 表
    const data = await seoService.getPageSeoData(DEFAULT_SITE_ID, id, locale);
    
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}