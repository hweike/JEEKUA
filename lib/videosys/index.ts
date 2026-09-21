// lib/videosys/index.ts
import { supabase } from '@/lib/supabase/client';
import { unstable_cache } from 'next/cache';
import { getPrivateStorage } from '@/lib/storage/factory';
import type { VideoIndex, VideoData } from './types';
import { getFullVideo, listVideos } from './video-service';
import { getCategoriesList } from './services/category.service';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

// ============================================================
// 原始（无缓存）查询函数
// ============================================================

// 获取所有视频分类（包含 slug）- 从云存储读取
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

// 获取视频配置（从云存储读取 settings.json）
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

// 获取视频列表（按分类 key 过滤，全部数据，无分页）
export async function getVideos(locale: string, categoryKey?: string): Promise<VideoIndex[]> {
  let query = supabase
    .from('videos')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('locale', locale)
    .eq('visible', 1);   // ✅ 已过滤

  if (categoryKey && categoryKey !== 'all') {
    query = query.eq('category_key', categoryKey);
  }

  const { data, error } = await query
    .order('order_index', { ascending: true })
    .order('published_at', { ascending: false });

  if (error) {
    console.error('getVideos error:', error);
    return [];
  }

  return (data || []).map(item => ({
    ...item,
    visible: item.visible === 1,
    flagged: item.flagged === 1,
  })) as VideoIndex[];
}

// 根据 slug 获取单个视频，并附加其分类 slug 和完整内容
export async function getVideoBySlug(slug: string, locale: string): Promise<(VideoData & { categorySlug: string }) | null> {
  const { data: videoIndex, error } = await supabase
    .from('videos')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('slug', slug)
    .eq('locale', locale)
    .eq('visible', 1)   // ✅ 已过滤
    .maybeSingle();

  if (error || !videoIndex) {
    if (error) console.error('getVideoBySlug error:', error);
    return null;
  }

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

// 根据 ID 列表批量获取视频详情（用于关联资源）
export async function getVideosByIds(ids: string[], locale: string): Promise<VideoData[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('locale', locale)
    .eq('visible', 1)   // ✅ 新增：过滤隐藏视频
    .in('id', ids);

  if (error) {
    console.error('getVideosByIds error:', error);
    return [];
  }
  return (data || []).map(item => ({
    ...item,
    visible: item.visible === 1,
    flagged: item.flagged === 1,
  })) as VideoData[];
}

// 导出 video-service 中的方法（供外部使用）
export { getFullVideo as getVideoById, listVideos } from './video-service';

// ============================================================
// 缓存版本（使用 unstable_cache）
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

/**
 * 获取视频列表（缓存版本，支持分页和分类过滤）
 */
export const getCachedVideos = unstable_cache(
  async (locale: string, categoryKey?: string, page: number = 1, pageSize: number = 15) => {
    const result = await listVideos({
      locale,
      category: categoryKey,
      page,
      limit: pageSize,
      includeInvisible: false,   // ✅ 明确只显示可见视频
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