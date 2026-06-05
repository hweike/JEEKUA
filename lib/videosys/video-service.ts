import { insertVideo, updateVideo, deleteVideo, getVideoById, listVideos } from './videos-db';
import { saveVideoMarkdown, loadVideoMarkdown, deleteVideoMarkdown } from './videos-fs';
import { VideoIndex, VideoData } from './types';

export async function createVideo(video: VideoData, locale: string): Promise<void> {
  const index: VideoIndex = {
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
    published_at: video.published_at,
    updated_at: video.updated_at,
    created_at: video.created_at,
    tags: video.tags,
  };
  await insertVideo(index);
  await saveVideoMarkdown(video, locale);
}

export async function updateVideoService(video: VideoData, locale: string): Promise<void> {
  const index: VideoIndex = {
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
    updated_at: new Date().toISOString(),
    published_at: video.published_at,
    created_at: video.created_at,
    tags: video.tags,
  };
  await updateVideo(index);
  await saveVideoMarkdown(video, locale);
}

export async function deleteVideoService(id: string, locale: string): Promise<void> {
  await deleteVideo(id, locale);
  await deleteVideoMarkdown(id, locale);
}

export async function getFullVideo(id: string, locale: string): Promise<VideoData | null> {
  const index = await getVideoById(id, locale);
  if (!index) return null;
  const markdown = await loadVideoMarkdown(id, locale);
  return { ...index, content: markdown?.content || '' };
}

export { listVideos };