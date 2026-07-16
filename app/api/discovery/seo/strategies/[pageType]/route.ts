import { NextRequest, NextResponse } from 'next/server';
import { strategiesService } from '@/lib/seo/services';

const DEFAULT_SITE_ID = '000001';

export async function GET(
  request: NextRequest,
  { params }: { params: { pageType: string } }
) {
  try {
    const { pageType } = params;
    const data = await strategiesService.getStrategy(pageType, DEFAULT_SITE_ID);
    if (!data) {
      return NextResponse.json({ error: '策略不存在' }, { status: 404 });
    }
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}