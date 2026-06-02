import { NextResponse } from 'next/server';
import { generateSitemaps } from '@/lib/sitemap/generate';
import { getSiteSettings } from '@/lib/getSiteSettings';

export async function POST() {
  try {
    // 先检查网站配置
    const settings = await getSiteSettings();
    if (!settings.websiteUrl?.trim()) {
      return NextResponse.json(
        { error: '网站未配置网址，请前往“网站设置 > 基本设置”页面填写网站名称和网址后重试。' },
        { status: 400 }
      );
    }
    await generateSitemaps();
    // 可选：自动 ping 搜索引擎
    await pingSearchEngines(settings.websiteUrl);
    return NextResponse.json({ success: true, message: 'Sitemap generated successfully' });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Failed to generate sitemap' }, { status: 500 });
  }
}

async function pingSearchEngines(baseUrl: string) {
  const sitemapUrl = `${baseUrl}/sitemap/sitemap-index.xml`;
  const googlePing = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
  const bingPing = `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
  await Promise.allSettled([fetch(googlePing), fetch(bingPing)]);
}