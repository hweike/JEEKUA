import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;

  try {
    // 查询关联的视频 ID 及排序
    const { data: relations, error: relError } = await supabase
      .from('resource_product')
      .select('resource_id, sort_order')
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('product_id', productId)
      .eq('resource_type', 'video')
      .order('sort_order', { ascending: true });

    if (relError) {
      console.error('查询 resource_product 失败:', relError);
      return NextResponse.json({ error: relError.message }, { status: 500 });
    }

    if (!relations || relations.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const videoIds = relations.map(r => r.resource_id);

    // 批量获取视频详情
    const { data: videos, error: vidError } = await supabase
      .from('videos')
      .select('id, title, thumbnail, duration')
      .in('id', videoIds);

    if (vidError) {
      console.error('查询 videos 失败:', vidError);
      return NextResponse.json({ error: vidError.message }, { status: 500 });
    }

    const videoMap = new Map(videos?.map(v => [v.id, v]) || []);

    const items = relations.map(rel => {
      const video = videoMap.get(rel.resource_id);
      if (video) {
        return {
          videoId: video.id,
          title: video.title,
          thumbnail: video.thumbnail || '',
          duration: video.duration || 0,
          sortOrder: rel.sort_order,
        };
      } else {
        return {
          videoId: rel.resource_id,
          title: '已删除的视频',
          thumbnail: '',
          duration: 0,
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
    // 删除所有旧关联
    const { error: deleteError } = await supabase
      .from('resource_product')
      .delete()
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('product_id', productId)
      .eq('resource_type', 'video');

    if (deleteError) {
      console.error('删除旧关联失败:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // 插入新关联
    if (videoIds.length > 0) {
      const insertData = videoIds.map((videoId, idx) => ({
        site_id: DEFAULT_SITE_ID,
        resource_type: 'video',
        resource_id: videoId,
        product_id: productId,
        sort_order: idx,
      }));
      const { error: insertError } = await supabase
        .from('resource_product')
        .insert(insertData);
      if (insertError) {
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