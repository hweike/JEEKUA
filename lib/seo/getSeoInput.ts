// lib/seo/getSeoInput.ts
import { SeoInput, PageType } from './types';
import { pageTypeRegistry } from './page-type-registry';
import { getSiteSettings } from '@/lib/getSiteSettings';

/**
 * 根据页面类型和 slug 自动构建 SeoInput 对象
 * @param pageType 页面类型（product, blogPost, page...）
 * @param slug 页面的 slug（不含语言前缀，例如 "smartphone-x10" 或 "about-us"）
 * @param locale 当前语言（如 'zh', 'en'）
 * @param customUrl 可选，自定义完整 URL（默认自动拼接）
 * @returns SeoInput 对象，若数据不存在则返回 null
 */
export async function getSeoInput<T extends PageType>(
  pageType: T,
  slug: string,
  locale: string,
  customUrl?: string
): Promise<SeoInput<T> | null> {
  const config = pageTypeRegistry[pageType];
  if (!config) {
    console.warn(`[SEO] 未注册的页面类型: ${pageType}`);
    return null;
  }

  // 1. 获取业务数据
  const fetcher = config.getDataFetcher();
  const data = await fetcher(slug, locale);
  if (!data) return null;

  // 2. 获取基础站点配置
  const settings = await getSiteSettings();
  const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const url = customUrl || `${baseUrl}/${locale}/${slug}`;

  // 3. 提取各字段（优先使用业务数据中的 SEO 字段，否则使用配置映射）
  const title = config.getTitle?.(data, locale) || data.title || '';
  const description = config.getDescription?.(data, locale) || '';
  const image = config.getImage?.(data, locale) || '';
  const noindex = config.getNoindex?.(data) || false;
  const canonical = config.getCanonical?.(data, baseUrl, locale) || undefined;

  // 4. 构建 structuredData
  const structuredData = config.mapToStructuredData(data, locale);

  // 5. 组装 SeoInput
  const seoInput: SeoInput<T> = {
    type: config.type as T,
    title,
    description,
    url,
    image,
    noindex,
    canonical,
    structuredData,
  };

  return seoInput;
}