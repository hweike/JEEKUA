// app/api/SiteHeadersFooters/config/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/SiteHeadersFooters/storage';

// 内存缓存
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

  // ===== 新增：批量接口 =====
  if (localesParam) {
    if (!type || (type !== 'header' && type !== 'footer')) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
    const locales = localesParam.split(',').filter(Boolean);
    if (locales.length === 0) {
      return NextResponse.json({ error: 'No valid locales provided' }, { status: 400 });
    }

    try {
      const result: Record<string, any> = {};
      const promises = locales.map(async (loc) => {
        const cached = getCached(type, loc);
        if (cached !== null) {
          result[loc] = cached;
          return;
        }
        const config = await getConfig(type, loc);
        setCache(type, loc, config);
        result[loc] = config;
      });
      await Promise.all(promises);
      return NextResponse.json(result);
    } catch (error) {
      console.error('GET /api/SiteHeadersFooters/config batch error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  // ===== 原有单语言接口（完全不变） =====
  if (!type || (type !== 'header' && type !== 'footer')) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

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