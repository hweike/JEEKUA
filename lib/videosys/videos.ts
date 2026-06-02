import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { VideoMetadata } from './types';

const VIDEOS_DIR = path.join(process.cwd(), 'data/videosys-videos');

export async function getAllVideos(locale: string): Promise<VideoMetadata[]> {
  const localeDir = path.join(VIDEOS_DIR, locale);
  try {
    const files = await fs.readdir(localeDir);
    const videos = await Promise.all(
      files.filter(f => f.endsWith('.md')).map(async file => {
        const content = await fs.readFile(path.join(localeDir, file), 'utf-8');
        const { data, content: markdown } = matter(content);
        return { ...data, content: markdown } as VideoMetadata;
      })
    );
    // 排序：先按 order 升序，再按 updatedAt 降序
    return videos.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  } catch {
    return [];
  }
}

export async function getVideoById(id: string, locale: string): Promise<VideoMetadata | null> {
  const filePath = path.join(VIDEOS_DIR, locale, `${id}.md`);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const { data, content: markdown } = matter(content);
    return { ...data, content: markdown } as VideoMetadata;
  } catch {
    return null;
  }
}

export async function saveVideo(video: VideoMetadata, locale: string): Promise<void> {
  const { content = '', ...frontmatter } = video;
  // 自动更新最后修改时间
  frontmatter.updatedAt = new Date().toISOString();
  const markdown = matter.stringify(content, frontmatter);
  const dir = path.join(VIDEOS_DIR, locale);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${video.id}.md`), markdown, 'utf-8');
}

export async function deleteVideo(id: string, locale: string): Promise<void> {
  const filePath = path.join(VIDEOS_DIR, locale, `${id}.md`);
  await fs.unlink(filePath);
}