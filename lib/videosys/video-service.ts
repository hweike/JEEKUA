// lib/videosys/video-service.ts
import { insertVideo, updateVideo, deleteVideo, getVideoById, listVideos as listVideosDb } from './videos-db';
import { saveVideoMarkdown, loadVideoMarkdown, deleteVideoMarkdown } from './videos-fs';
import { VideoIndex, VideoData } from './types';
import { supabase } from '@/lib/supabase/client';
import { registerEntity } from '@/lib/discovery/services/business-register-pages.service';
import { deletePage } from '@/lib/discovery/register';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

// ========== 公共辅助函数 ==========

/** 构建数据库索引对象 */
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

/** 构建 pages 注册数据 */
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

/** 注册视频到 pages 表（异步，错误仅记录日志） */
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

/** 插入或更新视频（根据 ID+locale 是否存在） */
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
}

// ========== 对外服务函数 ==========

export async function createVideo(video: VideoData, locale: string): Promise<void> {
  // 确保 ID 存在（如果未提供，应由调用方生成）
  if (!video.id) {
    throw new Error('视频 ID 不能为空');
  }
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
}

export async function getFullVideo(id: string, locale: string): Promise<VideoData | null> {
  const index = await getVideoById(id, locale);
  if (!index) return null;
  const markdown = await loadVideoMarkdown(id, locale);
  return { ...index, content: markdown?.content || '' };
}

/**
 * 自定义 listVideos，支持 includeInvisible 参数
 * 用于后台管理列表，可显示所有视频（包括不可见的）
 */
export async function listVideos(options: {
  locale: string;
  title?: string;
  category?: string;
  page?: number;
  limit?: number;
  includeInvisible?: boolean;
}) {
  const { locale, title, category, page = 1, limit = 20, includeInvisible = false } = options;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('videos')
    .select('*', { count: 'exact' })
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('locale', locale);

  if (!includeInvisible) {
    query = query.eq('visible', 1);
  }

  if (title) {
    query = query.ilike('title', `%${title}%`);
  }
  if (category) {
    query = query.eq('category_key', category);
  }

  const { data, error, count } = await query
    .order('published_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('listVideos error:', error);
    throw error;
  }

  return { items: data || [], total: count || 0, page, limit };
}

/**
 * 批量更新视频翻译字段（若目标语言不存在则从源语言复制）
 * @param targetLocale 目标语言
 * @param translations 翻译数据数组（通常只有一条）
 * @param sourceLocale 源语言（可选，用于创建新视频时复制非翻译字段）
 */
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
      // 检查目标是否存在
      let targetVideo = await getFullVideo(id, targetLocale);

      // 如果目标不存在且提供了源语言，则复制
      if (!targetVideo && sourceLocale) {
        const sourceVideo = await getFullVideo(id, sourceLocale);
        if (!sourceVideo) {
          throw new Error(`源视频 ${id} 不存在`);
        }
        // 复制（使用 upsert 插入/更新）
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

      // 更新字段
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

      // 保存更新（通过 upsert）
      await upsertVideo(targetVideo, targetLocale);

      success++;
    } catch (err: any) {
      errors.push(`处理视频 ${id} 失败: ${err.message}`);
      failed++;
    }
  }

  return { success, failed, errors };
}