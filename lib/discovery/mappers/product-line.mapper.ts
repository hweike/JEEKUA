import { PageData } from '../register';

export function mapProductLineToPageData(line: any): PageData {
  const slug = line.slug || line.id;
  return {
    id: `productLine:${line.id}`,
    type: 'productLine',
    title: line.name || '未命名产品线',
    slug,
    url: `/products/${slug}`,
    cover_image: null,
    seo_title: line.seoTitle || null,
    seo_description: line.seoDescription || null,
    seo_keywords: line.seoKeywords || null,
    content_summary: '',
    content_full: '',
    updatedAt: new Date().toISOString(),
  };
}