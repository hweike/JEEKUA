// app/api/SiteHeadersFooters/config/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/SiteHeadersFooters/storage';

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type');
  const locale = request.nextUrl.searchParams.get('locale') || 'zh';
  if (!type || (type !== 'header' && type !== 'footer')) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }
  try {
    const config = await getConfig(type, locale);
    // 如果配置不存在，返回 null（前端会处理默认值）
    return NextResponse.json(config);
  } catch (error) {
    console.error('GET /api/SiteHeadersFooters/config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, locale, config } = body;
    if (!type || !locale || !config) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (type !== 'header' && type !== 'footer') {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
    await saveConfig(type, locale, config);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/SiteHeadersFooters/config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}