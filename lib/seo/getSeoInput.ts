// lib/seo/getSeoInput.ts

import { SeoInput, PageType } from './types';
import { pageTypeRegistry } from './page-type-registry';
import { getSiteSettings } from '@/lib/getSiteSettings';

export async function getSeoInput<T extends PageType>(
  pageType: T,
  slug: string,
  locale: string,
  // 新增：可选预加载数据，如果提供则跳过数据获取
  preloadedData?: any,
  customUrl?: string
): Promise<SeoInput<T> | null> {
  const config = pageTypeRegistry[pageType];
  if (!config) {
    console.warn(`[SEO] 未注册的页面类型: ${pageType}`);
    return null;
  }

  // 如果传入了预加载数据，直接使用；否则通过 fetcher 获取
  let data = preloadedData;
  if (!data) {
    const fetcher = config.getDataFetcher();
    data = await fetcher(slug, locale);
  }
  if (!data) return null;

  const settings = await getSiteSettings();
  const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const url = customUrl || `${baseUrl}/${locale}/${slug}`;

  const title = config.getTitle?.(data, locale) || data.title || '';
  const description = config.getDescription?.(data, locale) || '';
  const image = config.getImage?.(data, locale) || '';
  const noindex = config.getNoindex?.(data) || false;
  const canonical = config.getCanonical?.(data, baseUrl, locale) || undefined;

  const structuredData = await config.mapToStructuredData(data, locale);

  return {
    type: config.type as T,
    title,
    description,
    url,
    image,
    noindex,
    canonical,
    structuredData,
  };
}