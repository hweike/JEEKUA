// app/api/front/videos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import NodeCache from 'node-cache';
import { getVideos } from '@/lib/videosys';

// 缓存 5 分钟
const videosCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'zh';
  const categoryKey = searchParams.get('category') || undefined;

  const cacheKey = `front-videos:${locale}:${categoryKey || 'all'}`;

  // 1. 命中缓存
  const cached = videosCache.get<{ videos: any[] }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': 'HIT',
      },
    });
  }

  // 2. 查库
  try {
    const videos = await getVideos(locale, categoryKey);
    const result = { videos };
    videosCache.set(cacheKey, result);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('Failed to fetch videos:', error);
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
  }
}