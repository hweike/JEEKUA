// lib/discovery/mappers/blog-post.mapper.ts
import { PageData } from '../register';

export function mapBlogPostToPageData(post: any, mdData: any = {}, mdContent: string = ''): PageData {
  // 合并数据，post 优先（数据库字段优先于 MD 元数据）
  const merged = { ...mdData, ...post };
  const slug = merged.slug || merged.id;
  const excerpt = merged.excerpt || '';
  const fullContent = mdContent || '';
  const contentSummary = excerpt.slice(0, 5000) || fullContent.slice(0, 5000);

  return {
    id: `blogPost:${merged.id}`,
    type: 'blogPost',
    title: merged.title || '未命名文章',
    slug,
    url: `/blog/${slug}`,
    cover_image: merged.featured_image || null,
    seo_title: merged.seo_title || null,
    seo_description: merged.seo_description || null,
    seo_keywords: merged.seo_keywords || null,
    content_summary: contentSummary,
    content_full: fullContent,
    updatedAt: merged.updated_at || new Date().toISOString(),
  };
}