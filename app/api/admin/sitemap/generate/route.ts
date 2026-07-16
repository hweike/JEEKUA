// app/api/admin/sitemap/generate/route.ts

import { NextResponse } from 'next/server';
import { generateSitemaps } from '@/lib/sitemap/generate';
import { getSiteSettings } from '@/lib/getSiteSettings';

export async function POST() {
  try {
    // 1. 检查网站配置
    const settings = await getSiteSettings();
    const baseUrl = settings.websiteUrl?.trim();
    if (!baseUrl) {
      return NextResponse.json(
        { error: '网站未配置网址，请前往“网站设置 > 基本设置”页面填写网站名称和网址后重试。' },
        { status: 400 }
      );
    }

    // 2. 生成站点地图（包含 hreflang 多语言支持）
    await generateSitemaps();

    // 3. ✅ robots.txt 由 app/robots.ts 动态生成，无需写入文件
    //    只需 ping 搜索引擎，告知 sitemap 已更新
    await pingSearchEngines(baseUrl);

    return NextResponse.json({
      success: true,
      message: 'Sitemap generated successfully',
    });
  } catch (error: any) {
    console.error('生成站点地图失败:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate sitemap' },
      { status: 500 }
    );
  }
}

async function pingSearchEngines(baseUrl: string) {
  const sitemapUrl = `${baseUrl}/sitemap/sitemap-index.xml`;
  const googlePing = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
  const bingPing = `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
  await Promise.allSettled([fetch(googlePing), fetch(bingPing)]);
}