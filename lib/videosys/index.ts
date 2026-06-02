// lib/videosys/index.ts
import { getDb } from '@/lib/db';
import type { VideoIndex, VideoData } from './types';
import { getFullVideo } from './video-service'; // 复用已有的完整获取函数

// 获取所有视频分类（包含 slug）
export async function getVideoCategories(locale: string): Promise<{ key: string; name: string; slug: string }[]> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const categoriesPath = path.join(process.cwd(), 'data', 'videosys', locale, 'categories.json');
  try {
    const content = await fs.readFile(categoriesPath, 'utf-8');
    const data = JSON.parse(content);
    return Object.entries(data).map(([key, cat]: [string, any]) => ({
      key,
      name: cat.name,
      slug: cat.slug || key,
    }));
  } catch {
    return [];
  }
}

// 获取视频列表（按分类 key 过滤）
export async function getVideos(locale: string, categoryKey?: string): Promise<VideoIndex[]> {
  const db = getDb();
  let sql = `SELECT * FROM videos WHERE locale = ? AND visible = 1`;
  const params: any[] = [locale];
  if (categoryKey && categoryKey !== 'all') {
    sql += ` AND category_key = ?`;
    params.push(categoryKey);
  }
  sql += ` ORDER BY order_index ASC, published_at DESC`;
  return db.prepare(sql).all(...params) as VideoIndex[];
}

// 根据 slug 获取单个视频，并附加其分类 slug 和完整内容
export async function getVideoBySlug(slug: string, locale: string): Promise<(VideoData & { categorySlug: string }) | null> {
  const db = getDb();
  const videoIndex = db.prepare(`SELECT * FROM videos WHERE slug = ? AND locale = ? AND visible = 1`).get(slug, locale) as VideoIndex | undefined;
  if (!videoIndex) return null;

  // 复用已有函数：从数据库索引 + Markdown 文件获取完整数据（包含 content）
  const fullVideo = await getFullVideo(videoIndex.id, locale);
  if (!fullVideo) return null;

  const categories = await getVideoCategories(locale);
  const category = categories.find(c => c.key === fullVideo.category_key);
  const categorySlug = category?.slug || fullVideo.category_key;

  return { ...fullVideo, categorySlug };
}

// 导出其他需要的方法（复用已有实现）
export { getFullVideo as getVideoById, insertVideo, updateVideo, deleteVideo, listVideos } from './video-service';