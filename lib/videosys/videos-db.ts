// lib/videosys/videos-db.ts
import sql from '@/lib/db/admin';
import { VideoIndex } from './types';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function insertVideo(video: VideoIndex): Promise<void> {
  try {
    await sql`
      INSERT INTO public.videos (
        site_id, id, locale, title, slug, category_key, source_type,
        video_url, video_id, thumbnail, duration, visible, flagged,
        template, seo_keywords, seo_title, seo_description,
        order_index, published_at, updated_at, created_at, tags
      ) VALUES (
        ${DEFAULT_SITE_ID}, ${video.id}, ${video.locale}, ${video.title}, ${video.slug},
        ${video.category_key}, ${video.source_type}, ${video.video_url}, ${video.video_id},
        ${video.thumbnail}, ${video.duration},
        ${video.visible ? 1 : 0}, ${video.flagged ? 1 : 0},
        ${video.template}, ${video.seo_keywords}, ${video.seo_title}, ${video.seo_description},
        ${video.order_index}, ${video.published_at}, ${video.updated_at}, ${video.created_at},
        ${video.tags}
      )
    `;
  } catch (error: any) {
    throw new Error(`insertVideo failed: ${error.message}`);
  }
}

export async function updateVideo(video: VideoIndex): Promise<void> {
  try {
    await sql`
      UPDATE public.videos
      SET title = ${video.title},
          slug = ${video.slug},
          category_key = ${video.category_key},
          source_type = ${video.source_type},
          video_url = ${video.video_url},
          video_id = ${video.video_id},
          thumbnail = ${video.thumbnail},
          duration = ${video.duration},
          visible = ${video.visible ? 1 : 0},
          flagged = ${video.flagged ? 1 : 0},
          template = ${video.template},
          seo_keywords = ${video.seo_keywords},
          seo_title = ${video.seo_title},
          seo_description = ${video.seo_description},
          order_index = ${video.order_index},
          updated_at = ${video.updated_at},
          tags = ${video.tags}
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND id = ${video.id}
        AND locale = ${video.locale}
    `;
  } catch (error: any) {
    throw new Error(`updateVideo failed: ${error.message}`);
  }
}

export async function deleteVideo(id: string, locale: string): Promise<void> {
  try {
    await sql`
      DELETE FROM public.videos
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND id = ${id}
        AND locale = ${locale}
    `;
  } catch (error: any) {
    throw new Error(`deleteVideo failed: ${error.message}`);
  }
}

export async function getVideoById(id: string, locale: string): Promise<VideoIndex | undefined> {
  let row: any;
  try {
    const rows = await sql<any[]>`
      SELECT * FROM public.videos
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND id = ${id}
        AND locale = ${locale}
      LIMIT 1
    `;
    row = rows[0];
  } catch (error: any) {
    throw new Error(`getVideoById failed: ${error.message}`);
  }
  if (!row) return undefined;
  return {
    ...row,
    visible: row.visible === 1,
    flagged: row.flagged === 1,
  } as VideoIndex;
}

export async function listVideos(params: {
  locale: string;
  title?: string;
  category?: string;
  visible?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ items: VideoIndex[]; total: number }> {
  const { locale, title, category, visible = true, page = 1, limit = 20 } = params;
  const offset = (page - 1) * limit;

  const conditions: any[] = [
    sql`site_id = ${DEFAULT_SITE_ID}`,
    sql`locale = ${locale}`,
    sql`visible = ${visible ? 1 : 0}`,
  ];
  if (title) {
    conditions.push(sql`title ILIKE ${'%' + title + '%'}`);
  }
  if (category) {
    conditions.push(sql`category_key = ${category}`);
  }
  const whereClause = conditions.reduce(
    (acc, c, i) => (i === 0 ? c : sql`${acc} AND ${c}`),
    sql``
  );

  const countRows = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count FROM public.videos
    WHERE ${whereClause}
  `;
  const total = parseInt(countRows[0]?.count || '0', 10);

  const data = await sql<any[]>`
    SELECT * FROM public.videos
    WHERE ${whereClause}
    ORDER BY order_index ASC, published_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const items = data.map(item => ({
    ...item,
    visible: item.visible === 1,
    flagged: item.flagged === 1,
  })) as VideoIndex[];

  return { items, total };
}