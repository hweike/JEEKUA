import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const SITE_ID = '000001';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://yourdomain.com';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;
  const db = getDb();

  // 查询所有允许索引的页面（noindex = 0）
  const pages = db.prepare(`
    SELECT url, updatedAt, priority, changefreq
    FROM pages
    WHERE site_id = ? AND locale = ? AND noindex = 0
    ORDER BY url
  `).all(SITE_ID, locale) as Array<{
    url: string;
    updatedAt: string;
    priority: number;
    changefreq: string;
  }>;

  // 生成 XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `
  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <lastmod>${page.updatedAt}</lastmod>
    <priority>${page.priority}</priority>
    <changefreq>${page.changefreq}</changefreq>
  </url>`).join('')}
</urlset>`;

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}