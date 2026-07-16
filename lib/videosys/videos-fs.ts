import matter from 'gray-matter';
import { getPrivateStorage } from '@/lib/storage/factory';
import { VideoData } from './types';

function getVideoKey(id: string, locale: string): string {
  return `data/videosys/${locale}/${id}.md`;
}

export async function saveVideoMarkdown(video: VideoData, locale: string): Promise<void> {
  const storage = getPrivateStorage();
  const key = getVideoKey(video.id, locale);
  const { content = '', ...frontmatter } = video;
  const markdown = matter.stringify(content, frontmatter);
  await storage.write(key, markdown, { contentType: 'text/markdown' });
}

export async function loadVideoMarkdown(id: string, locale: string): Promise<VideoData | null> {
  const storage = getPrivateStorage();
  const key = getVideoKey(id, locale);
  try {
    const raw = await storage.read(key, 'utf8');
    const { data, content } = matter(raw as string);
    let finalData = { ...data } as any;
    if (data.seo && typeof data.seo === 'object') {
      finalData.seo_keywords = data.seo.keywords || '';
      finalData.seo_title = data.seo.metaTitle || '';
      finalData.seo_description = data.seo.metaDescription || '';
      delete finalData.seo;
    }
    return { ...finalData, content } as VideoData;
  } catch (error: any) {
    // 兼容多种错误表示：NoSuchKey
    const isNotFound =
      error?.Code === 'NoSuchKey' ||
      error?.code === 'NoSuchKey' ||
      error?.message?.includes('NoSuchKey') ||
      error?.message?.includes('not found');
    if (isNotFound) {
      console.warn(`Video markdown not found: ${key}`);
      return null;
    }
    console.error(`Failed to load video markdown key=${key}`, error);
    throw error;
  }
}

export async function deleteVideoMarkdown(id: string, locale: string): Promise<void> {
  const storage = getPrivateStorage();
  const key = getVideoKey(id, locale);
  try {
    await storage.delete(key);
  } catch (error: any) {
    const isNotFound =
      error?.Code === 'NoSuchKey' ||
      error?.code === 'NoSuchKey' ||
      error?.message?.includes('NoSuchKey') ||
      error?.message?.includes('not found');
    if (!isNotFound) {
      throw error;
    }
  }
}