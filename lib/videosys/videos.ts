// lib/videosys-videos/repository.ts
import matter from 'gray-matter';
import { getPrivateStorage } from '@/lib/storage/factory';
import { VideoMetadata } from './types';

// 私有桶中的基础前缀（对应原 data/videosys-videos）
const STORAGE_PREFIX = 'data/videosys-videos';

/**
 * 获取视频 Markdown 文件在私有桶中的存储 Key
 */
function getVideoKey(id: string, locale: string): string {
  return `${STORAGE_PREFIX}/${locale}/${id}.md`;
}

/**
 * 获取指定语言下所有视频的元数据
 */
export async function getAllVideos(locale: string): Promise<VideoMetadata[]> {
  const storage = getPrivateStorage();
  const prefix = `${STORAGE_PREFIX}/${locale}/`;
  try {
    // 列出该前缀下的所有文件
    const keys = await storage.list(prefix);
    const mdKeys = keys.filter(key => key.endsWith('.md'));
    const videos: VideoMetadata[] = [];

    for (const key of mdKeys) {
      try {
        const content = await storage.read(key, 'utf8');
        const { data, content: markdown } = matter(content as string);
        videos.push({ ...data, content: markdown } as VideoMetadata);
      } catch (err) {
        console.error(`Failed to parse video file ${key}:`, err);
      }
    }

    // 排序：先按 order 升序，再按 updatedAt 降序
    return videos.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  } catch (error: any) {
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      return [];
    }
    throw error;
  }
}

/**
 * 根据 ID 获取单个视频
 */
export async function getVideoById(id: string, locale: string): Promise<VideoMetadata | null> {
  const storage = getPrivateStorage();
  const key = getVideoKey(id, locale);
  try {
    const content = await storage.read(key, 'utf8');
    const { data, content: markdown } = matter(content as string);
    return { ...data, content: markdown } as VideoMetadata;
  } catch (error: any) {
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      return null;
    }
    throw error;
  }
}

/**
 * 保存视频（创建或更新）
 */
export async function saveVideo(video: VideoMetadata, locale: string): Promise<void> {
  const storage = getPrivateStorage();
  const key = getVideoKey(video.id, locale);
  const { content = '', ...frontmatter } = video;
  // 自动更新最后修改时间
  frontmatter.updatedAt = new Date().toISOString();
  const markdown = matter.stringify(content, frontmatter);
  await storage.write(key, markdown, { contentType: 'text/markdown' });
}

/**
 * 删除视频
 */
export async function deleteVideo(id: string, locale: string): Promise<void> {
  const storage = getPrivateStorage();
  const key = getVideoKey(id, locale);
  try {
    await storage.delete(key);
  } catch (error: any) {
    if (!(error?.message?.includes('NoSuchKey') || error?.code === 'NoSuchKey')) {
      throw error;
    }
  }
}