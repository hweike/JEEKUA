// app/api/front/products/[productId]/related-resources/route.ts
import { NextRequest, NextResponse } from 'next/server';
import NodeCache from 'node-cache';
import { getResourcesByProduct } from '@/lib/products/resourceRelations';
import { getVideosByIds } from '@/lib/videosys';

// 缓存 5 分钟
const relatedResourcesCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// ========== 辅助：生成视频播放 URL ==========
function buildVideoPlayUrl(sourceType: string, videoId: string): string {
  switch (sourceType) {
    case 'youtube':
      return `https://www.youtube.com/embed/${videoId}`;
    case 'vimeo':
      return `https://player.vimeo.com/video/${videoId}`;
    case 'bilibili':
      return `https://player.bilibili.com/player.html?bvid=${videoId}&page=1`;
    default:
      return '';
  }
}

// ========== 资源详情填充 ==========
async function enrichResources(
  resourceType: string,
  ids: { id: string; sortOrder: number }[],
  locale: string
): Promise<any[]> {
  if (ids.length === 0) return [];

  const idList = ids.map(i => i.id);
  let items: any[] = [];

  try {
    if (resourceType === 'video') {
      const videos = await getVideosByIds(idList, locale);
      items = videos.map(video => ({
        ...video,
        type: 'video',
        url: buildVideoPlayUrl(video.source_type, video.video_id),
        sortOrder: ids.find(i => i.id === video.id)?.sortOrder ?? 0,
      }));
    } else if (resourceType === 'blog') {
      return [];
    } else if (resourceType === 'document') {
      return [];
    }
  } catch (err) {
    console.error(`Fetch ${resourceType} details error:`, err);
    return [];
  }

  return items;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const locale = searchParams.get('locale') || 'zh';

    const cacheKey = `related-resources:${productId}:${locale}`;

    // 1. 命中缓存
    const cached = relatedResourcesCache.get<{
      blogs: any[];
      documents: any[];
      videos: any[];
    }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'X-Cache': 'HIT',
        },
      });
    }

    // 2. 查库
    const grouped = await getResourcesByProduct(productId);

    // 并行获取各类型资源详情
    const [blogs, documents, videos] = await Promise.all([
      enrichResources('blog', grouped.blog, locale),
      enrichResources('document', grouped.document, locale),
      enrichResources('video', grouped.video, locale),
    ]);

    const result = { blogs, documents, videos };
    relatedResourcesCache.set(cacheKey, result);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('[Product Related Resources]', error);
    return NextResponse.json({ error: '加载失败' }, { status: 500 });
  }
}