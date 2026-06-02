import { getDb } from '@/lib/db';
import { VideoIndex } from './types';

export function insertVideo(video: VideoIndex): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO videos (
      id, locale, title, slug, category_key, source_type, video_url, video_id,
      thumbnail, duration, visible, flagged, template, seo_keywords, seo_title,
      seo_description, order_index, published_at, updated_at, created_at, tags
    ) VALUES (
      @id, @locale, @title, @slug, @category_key, @source_type, @video_url, @video_id,
      @thumbnail, @duration, @visible, @flagged, @template, @seo_keywords, @seo_title,
      @seo_description, @order_index, @published_at, @updated_at, @created_at, @tags
    )
  `);
  stmt.run(video);
}

export function updateVideo(video: VideoIndex): void {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE videos SET
      title = @title,
      slug = @slug,
      category_key = @category_key,
      source_type = @source_type,
      video_url = @video_url,
      video_id = @video_id,
      thumbnail = @thumbnail,
      duration = @duration,
      visible = @visible,
      flagged = @flagged,
      template = @template,
      seo_keywords = @seo_keywords,
      seo_title = @seo_title,
      seo_description = @seo_description,
      order_index = @order_index,
      updated_at = @updated_at,
      tags = @tags
    WHERE id = @id AND locale = @locale
  `);
  stmt.run(video);
}

export function deleteVideo(id: string, locale: string): void {
  const db = getDb();
  const stmt = db.prepare(`DELETE FROM videos WHERE id = ? AND locale = ?`);
  stmt.run(id, locale);
}

export function getVideoById(id: string, locale: string): VideoIndex | undefined {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM videos WHERE id = ? AND locale = ?`);
  return stmt.get(id, locale) as VideoIndex | undefined;
}

export function listVideos(params: {
  locale: string;
  title?: string;
  category?: string;
  visible?: boolean;
  page?: number;
  limit?: number;
}): { items: VideoIndex[]; total: number } {
  const db = getDb();
  const { locale, title, category, visible = true, page = 1, limit = 20 } = params;
  let sql = `SELECT * FROM videos WHERE locale = ? AND visible = ?`;
  const values: any[] = [locale, visible ? 1 : 0];
  if (title) {
    sql += ` AND title LIKE ?`;
    values.push(`%${title}%`);
  }
  if (category) {
    sql += ` AND category_key = ?`;
    values.push(category);
  }
  sql += ` ORDER BY order_index ASC, published_at DESC LIMIT ? OFFSET ?`;
  values.push(limit, (page - 1) * limit);
  const items = db.prepare(sql).all(...values) as VideoIndex[];
  // 获取总数
  let countSql = `SELECT COUNT(*) as total FROM videos WHERE locale = ? AND visible = ?`;
  const countValues: any[] = [locale, visible ? 1 : 0];
  if (title) {
    countSql += ` AND title LIKE ?`;
    countValues.push(`%${title}%`);
  }
  if (category) {
    countSql += ` AND category_key = ?`;
    countValues.push(category);
  }
  const total = db.prepare(countSql).get(...countValues) as { total: number };
  return { items, total: total.total };
}