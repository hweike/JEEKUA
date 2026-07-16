import { PageData } from '../register';

export function mapDocLibraryToPageData(lib: any): PageData {
  const slug = lib.slug || lib.id;
  return {
    id: `docLibrary:${lib.id}`,
    type: 'docLibrary',
    title: lib.name || '未命名文档库',
    slug,
    url: `/docs/${slug}`,
    cover_image: null,
    seo_title: lib.seo_title || null,
    seo_description: lib.seo_description || null,
    seo_keywords: lib.seo_keywords || null,
    content_summary: lib.description || '',
    content_full: '',
    updatedAt: lib.createdAt || new Date().toISOString(),
  };
}