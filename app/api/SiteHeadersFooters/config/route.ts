import { NextRequest, NextResponse } from 'next/server';
import { headerFooterService } from '@/lib/SiteHeadersFooters/header-footer-service';
import { getConfig, saveConfig } from '@/lib/SiteHeadersFooters/storage';

// 内存缓存（仅用于单语言查询，批量查询不使用此缓存，因为已合并）
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000;

function getCacheKey(type: string, locale: string): string {
  return `${type}_${locale}`;
}

function getCached(type: string, locale: string): any | null {
  const key = getCacheKey(type, locale);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCache(type: string, locale: string, data: any): void {
  const key = getCacheKey(type, locale);
  cache.set(key, { data, timestamp: Date.now() });
}

function clearCache(type?: string, locale?: string): void {
  if (type && locale) {
    cache.delete(getCacheKey(type, locale));
  } else if (type) {
    for (const key of cache.keys()) {
      if (key.startsWith(`${type}_`)) cache.delete(key);
    }
  } else {
    cache.clear();
  }
}

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type');
  const locale = request.nextUrl.searchParams.get('locale') || 'zh';
  const localesParam = request.nextUrl.searchParams.get('locales');
  const forceRefresh = request.nextUrl.searchParams.has('_t');

  // ===== 批量接口 =====
  if (localesParam) {
    if (!type || (type !== 'header' && type !== 'footer')) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
    const locales = localesParam.split(',').filter(Boolean);
    if (locales.length === 0) {
      return NextResponse.json({ error: 'No valid locales provided' }, { status: 400 });
    }

    try {
      // 使用 headerFooterService 的方法批量查询（或保持原有 Supabase 查询）
      // 这里保持原有逻辑（直接查 Supabase）不变，因为批量查询不涉及内存缓存
      const { supabase } = await import('@/lib/supabase/client');
      const { data, error } = await supabase
        .from('site_configs')
        .select('locale, config')
        .eq('id', type)
        .eq('site_id', '000001')
        .in('locale', locales);

      if (error) throw error;

      const result: Record<string, any> = {};
      data.forEach(row => {
        result[row.locale] = row.config || null;
      });
      locales.forEach(loc => {
        if (!(loc in result)) result[loc] = null;
      });

      return NextResponse.json(result);
    } catch (error) {
      console.error('批量获取配置失败:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  // ===== 单语言接口 =====
  if (!type || (type !== 'header' && type !== 'footer')) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  // 强制刷新：直接调用服务层方法从数据库获取最新数据，并更新缓存
  if (forceRefresh) {
    try {
      let config;
      if (type === 'header') {
        config = await headerFooterService.getHeaderConfig(locale);
      } else {
        config = await headerFooterService.getFooterConfig(locale);
      }
      // 更新内存缓存，以便后续不带 _t 的请求能直接使用最新数据
      setCache(type, locale, config);
      return NextResponse.json(config);
    } catch (error) {
      console.error('强制刷新获取配置失败:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  // 非强制刷新：使用原有缓存逻辑
  const cached = getCached(type, locale);
  if (cached !== null) {
    return NextResponse.json(cached);
  }

  try {
    const config = await getConfig(type, locale);
    setCache(type, locale, config);
    return NextResponse.json(config);
  } catch (error) {
    console.error('GET /api/SiteHeadersFooters/config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, locale, config } = body;
    if (!type || !locale || !config) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (type !== 'header' && type !== 'footer') {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
    await saveConfig(type, locale, config);
    clearCache(type, locale);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/SiteHeadersFooters/config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}