// lib/discovery/mappers/doc.mapper.ts
import { PageData } from '../register';

export function mapDocToPageData(
  doc: any,
  mdData: any = {},
  libSlug: string,
  mdContent: string = ''
): PageData {
  // 合并数据（数据库优先）
  const merged = { ...mdData, ...doc };
  const slug = merged.slug || merged.id;
  const title = merged.title || '未命名文档';
  const url = `/docs/${libSlug}/${slug}`;
  const seo_title = merged.seo_title || null;
  const seo_description = merged.seo_description || null;
  const seo_keywords = merged.seo_keywords || null;
  // content_summary: 优先使用 MD 中的 description，否则使用内容前 5000 字符
  const contentSummary = (mdData.description || mdContent || '').slice(0, 5000);

  return {
    id: `doc:${merged.id}`,
    type: 'doc',
    title,
    slug,
    url,
    cover_image: null,
    seo_title,
    seo_description,
    seo_keywords,
    content_summary: contentSummary,
    content_full: mdContent,
    updatedAt: merged.updated_at || new Date().toISOString(),
  };
}