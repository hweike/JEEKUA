// app/api/discovery/sitemap/status/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
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
    const { data: locales, error: localesError } = await supabase
      .from('pages')
      .select('locale')
      .eq('site_id', DEFAULT_SITE_ID)
      .order('locale');

    if (localesError) throw new Error(`查询语言失败: ${localesError.message}`);

    const allLocales = Array.from(new Set(locales.map((row) => row.locale)));
    const queryLocales = targetLocales.length > 0
      ? targetLocales.filter((l) => allLocales.includes(l))
      : allLocales;

    // 2. 获取每个语言的页面数量
    const localeCounts: Record<string, number> = {};
    for (const locale of queryLocales) {
      const { count, error } = await supabase
        .from('pages')
        .select('*', { count: 'exact', head: true })
        .eq('site_id', DEFAULT_SITE_ID)
        .eq('locale', locale);
      if (!error) {
        localeCounts[locale] = count || 0;
      }
    }

    // 3. 检测 sitemap 索引文件是否存在
    let hasSitemap = false;
    let lastRun: string | undefined;

    try {
      const content = await storage.read('sitemap/sitemap-index.xml', 'utf8');
      if (content) {
        hasSitemap = true;
        // 尝试获取文件修改时间
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

    // 如果索引文件不存在，尝试检查是否有任何子文件
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