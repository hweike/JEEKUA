// app/api/admin/products/videos/[productId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/admin';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;

  try {
    // 1. 查询关联的视频 ID 及排序
    let relations: { resource_id: string; sort_order: number }[];
    try {
      relations = await sql<{ resource_id: string; sort_order: number }[]>`
        SELECT resource_id, sort_order FROM public.resource_product
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND product_id = ${productId}
          AND resource_type = 'video'
        ORDER BY sort_order ASC
      `;
    } catch (relError: any) {
      console.error('查询 resource_product 失败:', relError);
      return NextResponse.json({ error: relError.message }, { status: 500 });
    }

    if (!relations || relations.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const videoIds = relations.map(r => r.resource_id);

    // 2. 批量获取视频详情
    let videos: any[];
    try {
      videos = await sql<any[]>`
        SELECT id, title, thumbnail, duration, source_type, video_id
        FROM public.videos
        WHERE id IN ${sql(videoIds)}
      `;
    } catch (vidError: any) {
      console.error('查询 videos 失败:', vidError);
      return NextResponse.json({ error: vidError.message }, { status: 500 });
    }

    const videoMap = new Map(videos.map(v => [v.id, v]));

    const items = relations.map(rel => {
      const video = videoMap.get(rel.resource_id);
      if (video) {
        return {
          videoId: video.id,
          title: video.title,
          thumbnail: video.thumbnail || '',
          duration: video.duration || 0,
          source_type: video.source_type,
          video_id: video.video_id,
          sortOrder: rel.sort_order,
        };
      } else {
        return {
          videoId: rel.resource_id,
          title: '已删除的视频',
          thumbnail: '',
          duration: 0,
          source_type: '',
          video_id: '',
          sortOrder: rel.sort_order,
        };
      }
    });

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error('GET /api/admin/products/videos/[productId] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const { videoIds } = await req.json();
  if (!Array.isArray(videoIds)) {
    return NextResponse.json({ error: 'videoIds must be an array' }, { status: 400 });
  }

  try {
    // 1. 删除所有旧关联
    try {
      await sql`
        DELETE FROM public.resource_product
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND product_id = ${productId}
          AND resource_type = 'video'
      `;
    } catch (deleteError: any) {
      console.error('删除旧关联失败:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // 2. 插入新关联
    if (videoIds.length > 0) {
      try {
        for (let idx = 0; idx < videoIds.length; idx++) {
          await sql`
            INSERT INTO public.resource_product (
              site_id, resource_type, resource_id, product_id, sort_order
            ) VALUES (
              ${DEFAULT_SITE_ID}, 'video', ${videoIds[idx]}, ${productId}, ${idx}
            )
          `;
        }
      } catch (insertError: any) {
        console.error('插入新关联失败:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PUT /api/admin/products/videos/[productId] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}