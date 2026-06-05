import { supabase } from '@/lib/supabase/client';
import { VideoIndex } from './types';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function insertVideo(video: VideoIndex): Promise<void> {
  const { error } = await supabase
    .from('videos')
    .insert({
      site_id: DEFAULT_SITE_ID,
      id: video.id,
      locale: video.locale,
      title: video.title,
      slug: video.slug,
      category_key: video.category_key,
      source_type: video.source_type,
      video_url: video.video_url,
      video_id: video.video_id,
      thumbnail: video.thumbnail,
      duration: video.duration,
      visible: video.visible ? 1 : 0,
      flagged: video.flagged ? 1 : 0,
      template: video.template,
      seo_keywords: video.seo_keywords,
      seo_title: video.seo_title,
      seo_description: video.seo_description,
      order_index: video.order_index,
      published_at: video.published_at,
      updated_at: video.updated_at,
      created_at: video.created_at,
      tags: video.tags,
    });
  if (error) throw new Error(`insertVideo failed: ${error.message}`);
}

export async function updateVideo(video: VideoIndex): Promise<void> {
  const { error } = await supabase
    .from('videos')
    .update({
      title: video.title,
      slug: video.slug,
      category_key: video.category_key,
      source_type: video.source_type,
      video_url: video.video_url,
      video_id: video.video_id,
      thumbnail: video.thumbnail,
      duration: video.duration,
      visible: video.visible ? 1 : 0,
      flagged: video.flagged ? 1 : 0,
      template: video.template,
      seo_keywords: video.seo_keywords,
      seo_title: video.seo_title,
      seo_description: video.seo_description,
      order_index: video.order_index,
      updated_at: video.updated_at,
      tags: video.tags,
    })
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('id', video.id)
    .eq('locale', video.locale);
  if (error) throw new Error(`updateVideo failed: ${error.message}`);
}

export async function deleteVideo(id: string, locale: string): Promise<void> {
  const { error } = await supabase
    .from('videos')
    .delete()
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('id', id)
    .eq('locale', locale);
  if (error) throw new Error(`deleteVideo failed: ${error.message}`);
}

export async function getVideoById(id: string, locale: string): Promise<VideoIndex | undefined> {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('id', id)
    .eq('locale', locale)
    .maybeSingle();
  if (error) throw new Error(`getVideoById failed: ${error.message}`);
  if (!data) return undefined;
  return {
    ...data,
    visible: data.visible === 1,
    flagged: data.flagged === 1,
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
  let query = supabase
    .from('videos')
    .select('*', { count: 'exact' })
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('locale', locale)
    .eq('visible', visible ? 1 : 0);

  if (title) {
    query = query.ilike('title', `%${title}%`);
  }
  if (category) {
    query = query.eq('category_key', category);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { data, error, count } = await query
    .order('order_index', { ascending: true })
    .order('published_at', { ascending: false })
    .range(from, to);

  if (error) throw new Error(`listVideos failed: ${error.message}`);
  const items = (data || []).map(item => ({
    ...item,
    visible: item.visible === 1,
    flagged: item.flagged === 1,
  })) as VideoIndex[];
  return { items, total: count || 0 };
}