// app/api/discovery/sitemap/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/admin';
import { getPublicStorage } from '@/lib/storage/factory';

const DEFAULT_SITE_ID = '000001';
const storage = getPublicStorage();

interface SitemapStatus {
  locale: string;
  status: 'pending' | 'completed' | 'failed';
  totalPages: number;
  generated: number;
  lastRun?: string;
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const localesParam = searchParams.get('locales');
    let targetLocales: string[] = [];

    if (localesParam) {
      targetLocales = localesParam.split(',');
    }

    // 1. 获取所有语言
    let allLocales: string[];
    try {
      const rows = await sql<{ locale: string }[]>`
        SELECT DISTINCT locale FROM public.pages
        WHERE site_id = ${DEFAULT_SITE_ID}
        ORDER BY locale ASC
      `;
      allLocales = rows.map(r => r.locale);
    } catch (localesError: any) {
      throw new Error(`查询语言失败: ${localesError.message}`);
    }

    const queryLocales = targetLocales.length > 0
      ? targetLocales.filter((l) => allLocales.includes(l))
      : allLocales;

    // 2. 获取每个语言的页面数量
    const localeCounts: Record<string, number> = {};
    for (const locale of queryLocales) {
      try {
        const countRows = await sql<{ count: string }[]>`
          SELECT COUNT(*)::text AS count FROM public.pages
          WHERE site_id = ${DEFAULT_SITE_ID}
            AND locale = ${locale}
        `;
        localeCounts[locale] = parseInt(countRows[0]?.count || '0', 10);
      } catch {}
    }

    // 3. 检测 sitemap 索引文件是否存在
    let hasSitemap = false;
    let lastRun: string | undefined;

    try {
      const content = await storage.read('sitemap/sitemap-index.xml', 'utf8');
      if (content) {
        hasSitemap = true;
        try {
          const stat = await storage.stat('sitemap/sitemap-index.xml');
          if (stat?.mtime) {
            lastRun = new Date(stat.mtime).toISOString();
          }
        } catch {
          lastRun = new Date().toISOString();
        }
      }
    } catch {
      hasSitemap = false;
    }

    if (!hasSitemap) {
      try {
        const files = await storage.list('sitemap/');
        if (files && files.length > 0) {
          hasSitemap = true;
          lastRun = new Date().toISOString();
        }
      } catch {
        hasSitemap = false;
      }
    }

    // 4. 构建状态
    const statuses: SitemapStatus[] = queryLocales.map((locale) => ({
      locale,
      status: hasSitemap ? 'completed' : 'pending',
      totalPages: localeCounts[locale] || 0,
      generated: hasSitemap ? localeCounts[locale] || 0 : 0,
      lastRun,
    }));

    return NextResponse.json(statuses);
  } catch (error: any) {
    console.error('获取站点地图状态失败:', error);
    return NextResponse.json(
      { error: error.message || '获取状态失败' },
      { status: 500 }
    );
  }
}