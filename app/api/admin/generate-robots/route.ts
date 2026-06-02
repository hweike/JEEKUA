import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getSiteSettings } from '@/lib/getSiteSettings';

export async function POST() {
  try {
    const settings = await getSiteSettings();
    const baseUrl = settings.websiteUrl?.trim();
    if (!baseUrl) {
      return NextResponse.json(
        { error: '网站未配置网址，请先前往“网站设置 > 基本设置”填写网站名称和网址。' },
        { status: 400 }
      );
    }
    const sitemapUrl = `${baseUrl}/sitemap/sitemap-index.xml`;
    const robotsContent = `User-agent: *
Allow: /
Sitemap: ${sitemapUrl}`;
    const robotsPath = path.join(process.cwd(), 'public', 'robots.txt');
    await fs.writeFile(robotsPath, robotsContent, 'utf-8');
    return NextResponse.json({ success: true, message: 'robots.txt 已生成' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '生成失败' }, { status: 500 });
  }
}