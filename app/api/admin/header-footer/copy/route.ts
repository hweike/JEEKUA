import { NextRequest, NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/SiteHeadersFooters/storage';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, sourceLocale, targetLocale } = body;

    if (!type || !sourceLocale || !targetLocale) {
      return NextResponse.json(
        { error: 'Missing parameters: type, sourceLocale, targetLocale' },
        { status: 400 }
      );
    }

    if (!['header', 'footer'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type, must be "header" or "footer"' },
        { status: 400 }
      );
    }

    if (sourceLocale === targetLocale) {
      return NextResponse.json(
        { error: '源站点和目标站点不能相同' },
        { status: 400 }
      );
    }

    // 读取源配置（复用 getConfig）
    const sourceConfig = await getConfig(type, sourceLocale);
    if (!sourceConfig || Object.keys(sourceConfig).length === 0) {
      return NextResponse.json(
        { error: `源${type === 'header' ? '页头' : '页脚'}配置不存在或为空 (${sourceLocale})，请先初始化` },
        { status: 404 }
      );
    }

    // 写入目标配置（复用 saveConfig）
    await saveConfig(type, targetLocale, sourceConfig);

    return NextResponse.json({ success: true, message: '复制成功' });
  } catch (error: any) {
    console.error('复制配置失败:', error);
    return NextResponse.json(
      { error: error.message || '复制失败' },
      { status: 500 }
    );
  }
}