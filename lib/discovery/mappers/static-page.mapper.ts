import { PageData } from '../register';

export function mapStaticPageToPageData(page: any, mdContent: string = ''): PageData {
  const slug = page.slug || page.id;
  const type = page.type === 'policy' ? 'policy' : 'page';
  return {
    id: `page:${page.id}`,
    type,
    title: page.title || '未命名页面',
    slug,
    url: `/${slug}`,
    cover_image: null,
    seo_title: page.seo_title || null,
    seo_description: page.seo_description || null,
    seo_keywords: page.seo_keywords || null,
    content_summary: '',
    content_full: mdContent,
    updatedAt: page.updated_at || new Date().toISOString(),
  };
}