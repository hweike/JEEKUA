import { NextRequest, NextResponse } from 'next/server';
import { initConfig } from '@/lib/SiteHeadersFooters/storage';

export async function POST(request: NextRequest) {
  console.log('[API /init] 收到请求');
  let body;
  try {
    body = await request.json();
  } catch (e) {
    console.error('[API /init] 解析请求体失败', e);
    return NextResponse.json({ error: '无效的请求体' }, { status: 400 });
  }

  const { type, locale } = body;
  console.log(`[API /init] 参数: type=${type}, locale=${locale}`);

  if (!type || !locale) {
    console.warn('[API /init] 缺少 type 或 locale');
    return NextResponse.json({ error: '缺少 type 或 locale' }, { status: 400 });
  }
  if (type !== 'header' && type !== 'footer') {
    console.warn('[API /init] 无效的 type:', type);
    return NextResponse.json({ error: '无效的 type' }, { status: 400 });
  }

  try {
    console.log('[API /init] 调用 storage.initConfig...');
    const config = await initConfig(type, locale);
    console.log('[API /init] 初始化成功，返回配置:', config);

    return NextResponse.json({
      success: true,
      config,          // 返回写入的配置对象
    });
  } catch (error: any) {
    console.error('[API /init] 初始化失败:', error);
    return NextResponse.json(
      { error: error.message || '初始化失败' },
      { status: 500 }
    );
  }
}