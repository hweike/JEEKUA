import { PageData } from '../register';

export function mapCategoryToPageData(cat: any): PageData {
  const slug = cat.slug || cat.id;
  return {
    id: `productCollection:${cat.id}`,
    type: 'productCollection',
    title: cat.name || '未命名分类',
    slug,
    url: `/collections/${slug}`,
    cover_image: cat.image || null,
    seo_title: cat.seoTitle || null,
    seo_description: cat.seoDescription || null,
    seo_keywords: cat.seoKeywords || null,
    content_summary: cat.description || '',
    content_full: '',
    updatedAt: new Date().toISOString(),
  };
}

export function mapSeriesToPageData(catId: string, catSlug: string, series: any): PageData {
  const slug = series.slug || series.id;
  return {
    id: `productCollection:${catId}/${series.id}`,
    type: 'productCollection',
    title: series.name || '未命名二级分类',
    slug,
    url: `/collections/${catSlug}/${slug}`,
    cover_image: series.image || null,
    seo_title: series.seo?.title || null,
    seo_description: series.seo?.description || null,
    seo_keywords: series.seo?.keywords || null,
    content_summary: series.description || '',
    content_full: '',
    updatedAt: new Date().toISOString(),
  };
}