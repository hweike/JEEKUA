// lib/videosys/video-service.ts
import sql from '@/lib/db/admin';
import { insertVideo, updateVideo, deleteVideo, getVideoById } from './videos-db';
import { saveVideoMarkdown, loadVideoMarkdown, deleteVideoMarkdown } from './videos-fs';
import { VideoIndex, VideoData } from './types';
import { registerEntity } from '@/lib/discovery/services/business-register-pages.service';
import { deletePage } from '@/lib/discovery/register';
import { revalidateTag } from 'next/cache';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

// ========== 缓存 Tag 常量 ==========
const CACHE_TAGS = {
  list: 'video-list',
  detail: 'video-detail',
  config: 'video-config',
  categories: 'video-categories',
};

function invalidateVideoCache() {
  try {
    revalidateTag(CACHE_TAGS.list);
    revalidateTag(CACHE_TAGS.detail);
  } catch (err) {
    console.warn('[video-service] revalidateTag failed:', err);
  }
}

// ========== 内存缓存（进程级，30 秒 TTL） ==========
interface VideoListCacheEntry<T> {
  data: T;
  timestamp: number;
}
const videoListCache: Record<string, VideoListCacheEntry<any>> = {};
const VIDEO_CACHE_TTL = 30 * 1000;

function getVideoCache(key: string) {
  const cached = videoListCache[key];
  if (cached && Date.now() - cached.timestamp < VIDEO_CACHE_TTL) {
    return cached.data;
  }
  if (cached) delete videoListCache[key];
  return null;
}

function setVideoCache(key: string, data: any) {
  videoListCache[key] = { data, timestamp: Date.now() };
}

export function invalidateVideoListCache() {
  Object.keys(videoListCache).forEach(k => delete videoListCache[k]);
}

function clearAllVideoCache() {
  invalidateVideoListCache();
  invalidateVideoCache();
}

// ========== URL 解析工具 ==========
export function parseVideoUrl(url: string): { source_type: 'youtube' | 'vimeo' | 'bilibili'; video_id: string } | null {
  const youtube = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const vimeo = /vimeo\.com\/(?:.*\/)?(\d+)/;
  const bilibili = /bilibili\.com\/video\/(BV[0-9A-Za-z]+)/;
  let match;
  if ((match = url.match(youtube))) return { source_type: 'youtube', video_id: match[1] };
  if ((match = url.match(vimeo))) return { source_type: 'vimeo', video_id: match[1] };
  if ((match = url.match(bilibili))) return { source_type: 'bilibili', video_id: match[1] };
  return null;
}

// ========== 内部辅助函数 ==========

function buildVideoIndex(video: VideoData, locale: string, updatedAt?: string): VideoIndex {
  const now = updatedAt || new Date().toISOString();
  return {
    id: video.id,
    locale,
    title: video.title,
    slug: video.slug,
    category_key: video.category_key,
    source_type: video.source_type,
    video_url: video.video_url,
    video_id: video.video_id,
    thumbnail: video.thumbnail,
    duration: video.duration,
    visible: video.visible ?? 1,
    flagged: video.flagged ?? 0,
    template: video.template,
    seo_keywords: video.seo_keywords,
    seo_title: video.seo_title,
    seo_description: video.seo_description,
    order_index: video.order_index ?? 0,
    published_at: video.published_at || now,
    updated_at: now,
    created_at: video.created_at || now,
    tags: video.tags,
  };
}

function buildPageData(video: VideoData) {
  return {
    id: video.id,
    title: video.title,
    slug: video.slug,
    thumbnail: video.thumbnail,
    category_key: video.category_key,
    seo_title: video.seo_title,
    seo_description: video.seo_description,
    seo_keywords: video.seo_keywords,
    content_full: video.content || '',
  };
}

async function registerVideoToPages(video: VideoData, locale: string): Promise<void> {
  const now = new Date().toISOString();
  const pageData = buildPageData(video);
  registerEntity({
    type: 'video',
    id: video.id,
    locale,
    data: pageData,
    updatedAt: now,
  }).catch(err => console.error(`注册视频到 pages 失败 (${video.id}, ${locale}):`, err));
}

async function upsertVideo(video: VideoData, locale: string): Promise<void> {
  const existing = await getVideoById(video.id, locale);
  const index = buildVideoIndex(video, locale);
  if (existing) {
    await updateVideo(index);
  } else {
    await insertVideo(index);
  }
  await saveVideoMarkdown(video, locale);
  await registerVideoToPages(video, locale);
  clearAllVideoCache();
}

// ========== 核心服务函数 ==========

export async function getFullVideo(id: string, locale: string): Promise<VideoData | null> {
  const index = await getVideoById(id, locale);
  if (!index) return null;
  const markdown = await loadVideoMarkdown(id, locale);
  return { ...index, content: markdown?.content || '' };
}

export async function createVideo(video: VideoData, locale: string): Promise<void> {
  if (!video.id) throw new Error('视频 ID 不能为空');
  await upsertVideo(video, locale);
}

export async function updateVideoService(video: VideoData, locale: string): Promise<void> {
  await upsertVideo(video, locale);
}

export async function deleteVideoService(id: string, locale: string): Promise<void> {
  await deleteVideo(id, locale);
  await deleteVideoMarkdown(id, locale);
  const pageId = `video:${id}`;
  try {
    await deletePage(pageId, locale);
  } catch (err) {
    console.error(`删除视频 pages 失败 (${pageId}):`, err);
  }
  clearAllVideoCache();
}

// ========== 单语言分页列表（带内存缓存）—— 已迁移 ==========
export async function listVideos(options: {
  locale: string;
  title?: string;
  category?: string;
  page?: number;
  limit?: number;
  includeInvisible?: boolean;
}) {
  const { locale, title, category, page = 1, limit = 20, includeInvisible = false } = options;
  const cacheKey = `list_${locale}_${title || ''}_${category || ''}_${page}_${limit}_${includeInvisible}`;
  const cached = getVideoCache(cacheKey);
  if (cached) return cached;

  const offset = (page - 1) * limit;

  const conditions: any[] = [
    sql`site_id = ${DEFAULT_SITE_ID}`,
    sql`locale = ${locale}`,
  ];
  if (!includeInvisible) {
    conditions.push(sql`visible = 1`);
  }
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

  try {
    const countRows = await sql<{ count: string }[]>`
      SELECT COUNT(*)::text AS count FROM public.videos WHERE ${whereClause}
    `;
    const total = parseInt(countRows[0]?.count || '0', 10);

    const items = await sql<any[]>`
      SELECT * FROM public.videos
      WHERE ${whereClause}
      ORDER BY published_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const result = { items, total, page, limit };
    setVideoCache(cacheKey, result);
    return result;
  } catch (error: any) {
    console.error('listVideos error:', error);
    throw error;
  }
}

// ========== 批量多语言列表 —— 已迁移 ==========

const VIDEO_LIST_FIELDS =
  'id, locale, title, slug, category_key, source_type, video_id, thumbnail, duration, visible, flagged, template, seo_keywords, seo_title, seo_description, order_index, published_at, updated_at, created_at, tags';

export async function listVideosBatch(
  locales: string[],
  includeInvisible = true
): Promise<Record<string, VideoData[]>> {
  if (!locales || locales.length === 0) return {};

  const cacheKey = `batch_${locales.slice().sort().join(',')}_${includeInvisible}`;
  const cached = getVideoCache(cacheKey);
  if (cached) return cached;

  const conditions: any[] = [
    sql`site_id = ${DEFAULT_SITE_ID}`,
    sql`locale IN ${sql(locales)}`,
  ];
  if (!includeInvisible) {
    conditions.push(sql`visible = 1`);
  }
  const whereClause = conditions.reduce(
    (acc, c, i) => (i === 0 ? c : sql`${acc} AND ${c}`),
    sql``
  );

  try {
    const data = await sql<any[]>`
      SELECT ${sql(VIDEO_LIST_FIELDS.split(',').map(f => f.trim()))}
      FROM public.videos
      WHERE ${whereClause}
    `;

    const result: Record<string, VideoData[]> = {};
    locales.forEach(loc => { result[loc] = []; });
    data.forEach((video: any) => {
      const loc = video.locale;
      if (result[loc]) {
        result[loc].push(video);
      } else {
        result[loc] = [video];
      }
    });

    setVideoCache(cacheKey, result);
    return result;
  } catch (error: any) {
    console.error('listVideosBatch error:', error);
    throw error;
  }
}

// ========== 创建/更新/复制/翻译 ==========

export async function createVideoFromData(
  data: Omit<VideoData, 'id' | 'source_type' | 'video_id' | 'created_at' | 'updated_at' | 'published_at'> & { video_url: string },
  locale: string
): Promise<{ id: string }> {
  if (!data.video_url) {
    throw new Error('视频 URL 是必需的');
  }
  const parsed = parseVideoUrl(data.video_url);
  if (!parsed) {
    throw new Error('无效的视频 URL，仅支持 YouTube、Vimeo、Bilibili');
  }

  const id = Math.floor(10000000 + Math.random() * 90000000).toString();
  const now = new Date().toISOString();

  const fullVideo: VideoData = {
    id,
    locale,
    title: data.title,
    slug: data.slug || '',
    category_key: data.category_key || '',
    source_type: parsed.source_type,
    video_url: data.video_url,
    video_id: parsed.video_id,
    thumbnail: data.thumbnail || '',
    duration: data.duration || 0,
    visible: data.visible ?? 1,
    flagged: data.flagged ?? 0,
    template: data.template || '',
    seo_keywords: data.seo_keywords || '',
    seo_title: data.seo_title || '',
    seo_description: data.seo_description || '',
    order_index: data.order_index ?? 0,
    published_at: now,
    updated_at: now,
    created_at: now,
    content: data.content || '',
    tags: data.tags,
  };

  await upsertVideo(fullVideo, locale);
  return { id };
}

export async function updateVideoFromData(
  id: string,
  data: Partial<Omit<VideoData, 'id' | 'source_type' | 'video_id' | 'created_at'>>,
  locale: string
): Promise<void> {
  const existing = await getFullVideo(id, locale);
  if (!existing) {
    throw new Error('视频不存在');
  }

  let sourceType = existing.source_type;
  let videoId = existing.video_id;
  if (data.video_url) {
    const parsed = parseVideoUrl(data.video_url);
    if (!parsed) {
      throw new Error('无效的视频 URL');
    }
    sourceType = parsed.source_type;
    videoId = parsed.video_id;
  }

  const updated: VideoData = {
    ...existing,
    ...data,
    source_type: sourceType,
    video_id: videoId,
    updated_at: new Date().toISOString(),
  };

  await upsertVideo(updated, locale);
}

export async function copyVideoToLocale(
  id: string,
  sourceLocale: string,
  targetLocale: string
): Promise<void> {
  if (sourceLocale === targetLocale) {
    throw new Error('源语言和目标语言不能相同');
  }
  const sourceVideo = await getFullVideo(id, sourceLocale);
  if (!sourceVideo) {
    throw new Error('源视频不存在');
  }
  const now = new Date().toISOString();
  const cloned: VideoData = {
    ...sourceVideo,
    locale: targetLocale,
    updated_at: now,
    created_at: sourceVideo.created_at || now,
  };
  await upsertVideo(cloned, targetLocale);
}

export async function updateVideoTranslations(
  targetLocale: string,
  translations: Array<{
    id: string;
    title?: string;
    content?: string;
    seo_keywords?: string;
    seo_title?: string;
    seo_description?: string;
    tags?: string[] | string;
  }>,
  sourceLocale?: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const trans of translations) {
    const { id, title, content, seo_keywords, seo_title, seo_description, tags } = trans;

    try {
      let targetVideo = await getFullVideo(id, targetLocale);

      if (!targetVideo && sourceLocale) {
        const sourceVideo = await getFullVideo(id, sourceLocale);
        if (!sourceVideo) {
          throw new Error(`源视频 ${id} 不存在`);
        }
        await upsertVideo(sourceVideo, targetLocale);
        targetVideo = await getFullVideo(id, targetLocale);
        if (!targetVideo) {
          throw new Error(`复制后无法获取视频 ${id}`);
        }
      }

      if (!targetVideo) {
        errors.push(`视频 ${id} 在目标语言中不存在且无法创建`);
        failed++;
        continue;
      }

      let newContent = targetVideo.content || '';
      if (content !== undefined) newContent = content;
      if (title !== undefined) targetVideo.title = title;
      if (seo_keywords !== undefined) targetVideo.seo_keywords = seo_keywords;
      if (seo_title !== undefined) targetVideo.seo_title = seo_title;
      if (seo_description !== undefined) targetVideo.seo_description = seo_description;
      if (tags !== undefined) {
        targetVideo.tags = typeof tags === 'string' ? tags : JSON.stringify(tags);
      }
      targetVideo.content = newContent;

      await upsertVideo(targetVideo, targetLocale);

      success++;
    } catch (err: any) {
      errors.push(`处理视频 ${id} 失败: ${err.message}`);
      failed++;
    }
  }

  return { success, failed, errors };
}