// lib/discovery/mappers/video.mapper.ts
import { PageData } from '../register';

export function mapVideoToPageData(
  video: any,
  mdData: any = {},
  mdContent: string = '',
  categorySlug: string
): PageData {
  // 合并数据（数据库优先）
  const merged = { ...mdData, ...video };
  const slug = merged.slug || merged.id;
  const title = merged.title || '未命名视频';
  const url = `/video/${categorySlug}/${slug}`;
  const thumbnail = merged.thumbnail || null;
  const seo_title = merged.seo_title || null;
  const seo_description = merged.seo_description || null;
  const seo_keywords = merged.seo_keywords || null;
  // content_summary: 优先使用 MD 中的 description，否则使用内容前 5000 字符
  const description = merged.description || mdContent || '';
  const contentSummary = description.slice(0, 5000);

  return {
    id: `video:${merged.id}`,
    type: 'video',
    title,
    slug,
    url,
    cover_image: thumbnail,
    seo_title,
    seo_description,
    seo_keywords,
    content_summary: contentSummary,
    content_full: mdContent,
    updatedAt: merged.updated_at || new Date().toISOString(),
  };
}