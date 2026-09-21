// app/api/productCrawl/plugin/config/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const versionOnly = searchParams.get('version') === 'true';

    const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
    
    if (!r2PublicUrl) {
      return NextResponse.json(
        { error: 'R2 地址未配置' },
        { status: 500 }
      );
    }

    const normalizedUrl = r2PublicUrl.replace(/\/+$/, '');
    const upgradeListUrl = `${normalizedUrl}/plugin-adapters/upgrade-list.json`;

    // 🔥 从 R2 获取真实版本号
    let version = '1.0.0';
    try {
      const response = await fetch(upgradeListUrl, {
        signal: AbortSignal.timeout(3000)
      });
      if (response.ok) {
        const data = await response.json();
        if (data.version) {
          version = data.version;
          console.log(`✅ 从 R2 获取版本号: ${version}`);
        }
      } else {
        console.warn(`⚠️ R2 upgrade-list.json 不存在 (HTTP ${response.status})，使用默认版本`);
      }
    } catch (err) {
      console.warn(`⚠️ 从 R2 获取版本号失败: ${err.message}，使用默认版本`);
    }

    if (versionOnly) {
      return NextResponse.json({ version });
    }

    return NextResponse.json({
      r2PublicUrl: normalizedUrl,
      version: version,
      configPath: 'plugin-adapters/config.json',
      upgradeListPath: 'plugin-adapters/upgrade-list.json'
    });

  } catch (error) {
    console.error('获取插件配置失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取配置失败' },
      { status: 500 }
    );
  }
}