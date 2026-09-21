// app/api/languages/enabled/route.ts
import { NextResponse } from 'next/server';
import { LANGUAGES } from '@/lib/languages/config';
import { getEnabledLanguages } from '@/lib/languages/settings';

// 内存缓存
let cache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟

export async function GET() {
  const now = Date.now();

  // 命中缓存
  if (cache && now - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': 'HIT',
      },
    });
  }

  try {
    const enabledCodes = await getEnabledLanguages();
    const enabledLanguages = LANGUAGES
      .filter(lang => enabledCodes.includes(lang.code))
      .map(lang => ({
        code: lang.code,
        nativeName: lang.nativeName,
        zhName: lang.zhName,
      }));

    cache = { data: enabledLanguages, timestamp: now };

    return NextResponse.json(enabledLanguages, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('获取已启用语言失败:', error);
    const allLanguages = LANGUAGES.map(lang => ({
      code: lang.code,
      nativeName: lang.nativeName,
      zhName: lang.zhName,
    }));
    // 失败时也缓存，避免反复打远程
    cache = { data: allLanguages, timestamp: now };
    return NextResponse.json(allLanguages, {
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  }
}