// lib/videosys/markdown.ts
import matter from 'gray-matter';
import { getPrivateStorage } from '@/lib/storage/factory';
import { VideoData } from './types';

/**
 * 获取视频 Markdown 文件在私有桶中的存储 Key
 */
function getVideoKey(id: string, locale: string): string {
  return `data/videosys/${locale}/${id}.md`;
}

/**
 * 保存视频 Markdown 文件到私有桶
 */
export async function saveVideoMarkdown(video: VideoData, locale: string): Promise<void> {
  const storage = getPrivateStorage();
  const key = getVideoKey(video.id, locale);
  const { content = '', ...frontmatter } = video;
  // 确保 seo 字段平铺存储（视频数据模型中已是平铺，无需额外处理）
  const markdown = matter.stringify(content, frontmatter);
  await storage.write(key, markdown, { contentType: 'text/markdown' });
}

/**
 * 加载视频 Markdown 文件从私有桶
 * @returns VideoData 对象，如果文件不存在则返回 null
 */
export async function loadVideoMarkdown(id: string, locale: string): Promise<VideoData | null> {
  const storage = getPrivateStorage();
  const key = getVideoKey(id, locale);
  try {
    const raw = await storage.read(key, 'utf8');
    const { data, content } = matter(raw as string);
    // 兼容旧数据：如果存在 seo 嵌套对象，则提取字段
    let finalData = { ...data } as any;
    if (data.seo && typeof data.seo === 'object') {
      finalData.seo_keywords = data.seo.keywords || '';
      finalData.seo_title = data.seo.metaTitle || '';
      finalData.seo_description = data.seo.metaDescription || '';
      delete finalData.seo;
    }
    return { ...finalData, content } as VideoData;
  } catch (error: any) {
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      return null;
    }
    throw error;
  }
}

/**
 * 删除视频 Markdown 文件（如果文件不存在则静默忽略）
 */
export async function deleteVideoMarkdown(id: string, locale: string): Promise<void> {
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