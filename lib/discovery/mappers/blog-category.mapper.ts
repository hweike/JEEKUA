import { PageData } from '../register';

export function mapBlogCategoryToPageData(cat: any): PageData {
  const slug = cat.slug || cat.id;
  // 兼容 title 和 name 字段
  const title = cat.title || cat.name || '未命名博客分类';
  return {
    id: `blogCategory:${cat.id}`,
    type: 'blogCategory',
    title,
    slug,
    url: `/blogs/${slug}`,
    cover_image: null,
    seo_title: cat.seo_title || null,
    seo_description: cat.seo_description || null,
    seo_keywords: cat.seo_keywords || null,
    content_summary: '',
    content_full: '',
    updatedAt: cat.updated_at || cat.created_at || new Date().toISOString(),
  };
}