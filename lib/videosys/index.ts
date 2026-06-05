import { supabase } from '@/lib/supabase/client';
import type { VideoIndex, VideoData } from './types';
import { getFullVideo } from './video-service'; // 复用已有的完整获取函数

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

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
  let query = supabase
    .from('videos')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('locale', locale)
    .eq('visible', 1);

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

  // 转换布尔字段（数据库中以 0/1 存储）
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
    .eq('visible', 1)
    .maybeSingle();

  if (error || !videoIndex) {
    if (error) console.error('getVideoBySlug error:', error);
    return null;
  }

  // 转换布尔字段
  const video: VideoIndex = {
    ...videoIndex,
    visible: videoIndex.visible === 1,
    flagged: videoIndex.flagged === 1,
  };

  // 复用已有函数：从数据库索引 + Markdown 文件获取完整数据（包含 content）
  const fullVideo = await getFullVideo(video.id, locale);
  if (!fullVideo) return null;

  const categories = await getVideoCategories(locale);
  const category = categories.find(c => c.key === fullVideo.category_key);
  const categorySlug = category?.slug || fullVideo.category_key;

  return { ...fullVideo, categorySlug };
}

// 导出其他需要的方法（复用已有实现）
export { getFullVideo as getVideoById, insertVideo, updateVideo, deleteVideo, listVideos } from './video-service';