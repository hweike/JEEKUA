import { NextRequest, NextResponse } from 'next/server';
import { initConfig } from '@/lib/SiteHeadersFooters/storage';

export async function POST(request: NextRequest) {
  const { type, locale } = await request.json();
  if (!type || !locale) {
    return NextResponse.json({ error: '缺少 type 或 locale' }, { status: 400 });
  }
  if (type !== 'header' && type !== 'footer') {
    return NextResponse.json({ error: '无效的 type' }, { status: 400 });
  }
  try {
    await initConfig(type, locale);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('初始化失败:', error);
    return NextResponse.json({ error: error.message || '初始化失败' }, { status: 500 });
  }
}