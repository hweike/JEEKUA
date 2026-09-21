// lib/seo/page-helpers.ts

import { getPageIdBySlug, readPage } from '@/lib/pages/storage';

export interface ExtendedPageData {
  title?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  visible?: string;
  canonical_url?: string;
  image?: string;
  [key: string]: any;
}

/**
 * 从 pages 存储中获取页面数据（包含 SEO 字段）
 */
export async function getPageDataFromStorage(locale: string, slug: string): Promise<ExtendedPageData | null> {
  const pageId = await getPageIdBySlug(locale, slug);
  if (!pageId) return null;
  const page = await readPage(locale, pageId);
  if (!page) return null;
  return {
    title: page.title,
    seo_title: page.seo_title,
    seo_description: page.seo_description,
    seo_keywords: page.seo_keywords,
    visible: page.visible,
    canonical_url: (page as any).canonical_url,
    image: (page as any).image,
  };
}