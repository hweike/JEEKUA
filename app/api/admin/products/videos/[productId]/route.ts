import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const db = getDb();

  try {
    // 查询关联的视频 ID 及排序
    const rows = db.prepare(`
      SELECT resource_id as video_id, sort_order
      FROM resource_product
      WHERE product_id = ? AND resource_type = 'video'
      ORDER BY sort_order ASC
    `).all(productId) as { video_id: string; sort_order: number }[];

    const items: any[] = [];
    for (const row of rows) {
      // 从 videos 表获取详细信息
      const video = db.prepare(`
        SELECT id, title, thumbnail, duration FROM videos WHERE id = ?
      `).get(row.video_id) as any;
      if (video) {
        items.push({
          videoId: video.id,
          title: video.title,
          thumbnail: video.thumbnail || '',
          duration: video.duration || 0,
          sortOrder: row.sort_order,
        });
      } else {
        // 视频可能已被删除，但仍保留关联，可以选择忽略或返回基本信息
        items.push({
          videoId: row.video_id,
          title: '已删除的视频',
          thumbnail: '',
          duration: 0,
          sortOrder: row.sort_order,
        });
      }
    }

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

  const db = getDb();

  try {
    const transaction = db.transaction(() => {
      // 删除该产品的所有视频关联
      db.prepare(`
        DELETE FROM resource_product
        WHERE product_id = ? AND resource_type = 'video'
      `).run(productId);

      // 插入新的关联，按顺序设置 sort_order
      for (let i = 0; i < videoIds.length; i++) {
        db.prepare(`
          INSERT INTO resource_product (resource_type, resource_id, product_id, sort_order)
          VALUES ('video', ?, ?, ?)
        `).run(videoIds[i], productId, i);
      }
    });

    transaction();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PUT /api/admin/products/videos/[productId] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}