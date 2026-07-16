import { PageData } from '../register';

export function mapVideoCategoryToPageData(cat: any, catId: string): PageData {
  const slug = cat.slug || catId;
  return {
    id: `videoCategory:${catId}`,
    type: 'videoCategory',
    title: cat.name || '未命名视频分类',
    slug,
    url: `/video/${slug}`,
    cover_image: null,
    seo_title: cat.seo_title || null,
    seo_description: cat.seo_description || null,
    seo_keywords: cat.seo_keywords || null,
    content_summary: '',
    content_full: '',
    updatedAt: new Date().toISOString(),
  };
}