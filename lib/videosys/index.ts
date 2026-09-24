// lib/videosys/index.ts
import { unstable_cache } from 'next/cache';
import sql from '@/lib/db/admin';
import { getPrivateStorage } from '@/lib/storage/factory';
import type { VideoIndex, VideoData } from './types';
import { getFullVideo, listVideos } from './video-service';
import { getCategoriesList } from './services/category.service';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

// ============================================================
// 原始（无缓存）查询函数
// ============================================================

export async function getVideoCategories(locale: string): Promise<{ key: string; name: string; slug: string }[]> {
  try {
    const list = await getCategoriesList(locale);
    return list.map(item => ({
      key: item.key,
      name: item.name,
      slug: item.slug || item.key,
    }));
  } catch (error) {
    console.error('getVideoCategories error:', error);
    return [];
  }
}

export async function getVideoConfig(locale: string): Promise<{ name: string; seoTitle?: string; seoDescription?: string; image?: string }> {
  const storage = getPrivateStorage();
  const key = `video/${locale}/settings.json`;
  try {
    const content = await storage.read(key, 'utf8');
    const parsed = JSON.parse(content as string);
    return {
      name: parsed.name || 'Video',
      seoTitle: parsed.seoTitle || '',
      seoDescription: parsed.seoDescription || '',
      image: parsed.image || '',
    };
  } catch {
    return { name: 'Video', seoTitle: '', seoDescription: '', image: '' };
  }
}

// ✅ 已迁移
export async function getVideos(locale: string, categoryKey?: string): Promise<VideoIndex[]> {
  const conditions: any[] = [
    sql`site_id = ${DEFAULT_SITE_ID}`,
    sql`locale = ${locale}`,
    sql`visible = 1`,
  ];
  if (categoryKey && categoryKey !== 'all') {
    conditions.push(sql`category_key = ${categoryKey}`);
  }
  const whereClause = conditions.reduce(
    (acc, c, i) => (i === 0 ? c : sql`${acc} AND ${c}`),
    sql``
  );

  try {
    const data = await sql<any[]>`
      SELECT * FROM public.videos
      WHERE ${whereClause}
      ORDER BY order_index ASC, published_at DESC
    `;
    return data.map(item => ({
      ...item,
      visible: item.visible === 1,
      flagged: item.flagged === 1,
    })) as VideoIndex[];
  } catch (error) {
    console.error('getVideos error:', error);
    return [];
  }
}

// ✅ 已迁移
export async function getVideoBySlug(slug: string, locale: string): Promise<(VideoData & { categorySlug: string }) | null> {
  let videoIndex: any;
  try {
    const rows = await sql<any[]>`
      SELECT * FROM public.videos
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND slug = ${slug}
        AND locale = ${locale}
        AND visible = 1
      LIMIT 1
    `;
    videoIndex = rows[0];
  } catch (error) {
    console.error('getVideoBySlug error:', error);
    return null;
  }

  if (!videoIndex) return null;

  const video: VideoIndex = {
    ...videoIndex,
    visible: videoIndex.visible === 1,
    flagged: videoIndex.flagged === 1,
  };

  const fullVideo = await getFullVideo(video.id, locale);
  if (!fullVideo) return null;

  const categories = await getVideoCategories(locale);
  const category = categories.find(c => c.key === fullVideo.category_key);
  const categorySlug = category?.slug || fullVideo.category_key;

  return { ...fullVideo, categorySlug };
}

// ✅ 已迁移
export async function getVideosByIds(ids: string[], locale: string): Promise<VideoData[]> {
  if (ids.length === 0) return [];
  try {
    const data = await sql<any[]>`
      SELECT * FROM public.videos
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND locale = ${locale}
        AND visible = 1
        AND id IN ${sql(ids)}
    `;
    return data.map(item => ({
      ...item,
      visible: item.visible === 1,
      flagged: item.flagged === 1,
    })) as VideoData[];
  } catch (error) {
    console.error('getVideosByIds error:', error);
    return [];
  }
}

export { getFullVideo as getVideoById, listVideos } from './video-service';

// ============================================================
// 缓存版本
// ============================================================

export const getCachedVideoCategories = unstable_cache(
  async (locale: string) => getVideoCategories(locale),
  ['video-categories'],
  { revalidate: 3600, tags: ['video-categories'] }
);

export const getCachedVideoConfig = unstable_cache(
  async (locale: string) => getVideoConfig(locale),
  ['video-config'],
  { revalidate: 3600, tags: ['video-config'] }
);

export const getCachedVideos = unstable_cache(
  async (locale: string, categoryKey?: string, page: number = 1, pageSize: number = 15) => {
    const result = await listVideos({
      locale,
      category: categoryKey,
      page,
      limit: pageSize,
      includeInvisible: false,
    });
    return result;
  },
  ['video-list'],
  { revalidate: 3600, tags: ['video-list'] }
);

export const getCachedVideoBySlug = unstable_cache(
  async (locale: string, slug: string) => getVideoBySlug(slug, locale),
  ['video-detail'],
  { revalidate: 3600, tags: ['video-detail'] }
);


// ============================================================
// 模块级缓存：所有已发布视频的 {locale, categorySlug, videoSlug}
// 用于 generateStaticParams，避免反复查库
// ============================================================
let cachedAllVideos: Array<{ locale: string; categorySlug: string; videoSlug: string }> | null = null;
let cachedAllVideosAt = 0;
const ALL_VIDEOS_TTL = 5 * 60 * 1000; // 5 分钟

/**
 * 获取所有已发布视频的 {locale, categorySlug, videoSlug} 列表
 * 用于 generateStaticParams 预生成
 *
 * ✅ 表结构：videos（site_id, locale, slug, category_key, visible）
 * ✅ visible = 1 表示可见
 * ✅ 带模块级缓存（5 分钟 TTL），避免反复查库
 */
export async function getAllPublishedVideos(): Promise<Array<{ locale: string; categorySlug: string; videoSlug: string }>> {
  const now = Date.now();

  if (cachedAllVideos && now - cachedAllVideosAt < ALL_VIDEOS_TTL) {
    const ageSec = Math.round((now - cachedAllVideosAt) / 1000);
    console.log(`[getAllPublishedVideos] ✅ 命中缓存（${cachedAllVideos.length} 条，${ageSec}s 前查的）`);
    return cachedAllVideos;
  }

  console.log(`[getAllPublishedVideos] ❌ 未命中，查库中...`);
  const start = Date.now();

  try {
    const rows = await sql<any[]>`
      SELECT locale, slug, category_key
      FROM public.videos
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND visible = 1
      ORDER BY order_index ASC, published_at DESC
    `;

    const result = rows
      .filter(r => r.locale && r.slug && r.category_key)
      .map(r => ({
        locale: r.locale,
        categorySlug: r.category_key,
        videoSlug: r.slug,
      }));

    const elapsed = Date.now() - start;
    console.log(`[getAllPublishedVideos] ✅ 查库完成，${result.length} 条，耗时 ${elapsed}ms`);

    cachedAllVideos = result;
    cachedAllVideosAt = now;
    return result;
  } catch (error) {
    console.error('[getAllPublishedVideos] 失败:', error);
    return cachedAllVideos ?? [];
  }
}

/**
 * 清空视频列表缓存（发布/删除视频后调用）
 */
export function clearAllPublishedVideosCache(): void {
  cachedAllVideos = null;
  cachedAllVideosAt = 0;
  console.log('[getAllPublishedVideos] 缓存已清空');
}
