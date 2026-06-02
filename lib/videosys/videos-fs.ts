import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { VideoData } from './types';

// 新路径：data/videosys/{locale}
const BASE_DIR = path.join(process.cwd(), 'data/videosys');

export async function saveVideoMarkdown(video: VideoData, locale: string): Promise<void> {
  const dir = path.join(BASE_DIR, locale);
  await fs.mkdir(dir, { recursive: true });
  const { content = '', ...frontmatter } = video;
  // 确保 seo 字段平铺存储
  const dataToWrite = { ...frontmatter };
  // 如果 video 中有 seo 嵌套，则展开（但视频数据模型中已是平铺，无需额外处理）
  const markdown = matter.stringify(content, dataToWrite);
  await fs.writeFile(path.join(dir, `${video.id}.md`), markdown, 'utf-8');
}

export async function loadVideoMarkdown(id: string, locale: string): Promise<VideoData | null> {
  const filePath = path.join(BASE_DIR, locale, `${id}.md`);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const { data, content } = matter(raw);
    // 兼容旧数据：如果存在 seo 嵌套对象，则提取字段
    let finalData = { ...data } as any;
    if (data.seo && typeof data.seo === 'object') {
      finalData.seo_keywords = data.seo.keywords || '';
      finalData.seo_title = data.seo.metaTitle || '';
      finalData.seo_description = data.seo.metaDescription || '';
      delete finalData.seo;
    }
    return { ...finalData, content } as VideoData;
  } catch {
    return null;
  }
}

export async function deleteVideoMarkdown(id: string, locale: string): Promise<void> {
  const filePath = path.join(BASE_DIR, locale, `${id}.md`);
  await fs.unlink(filePath).catch(() => {});
}