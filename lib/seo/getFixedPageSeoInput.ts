// lib/seo/getFixedPageSeoInput.ts
import { SeoInput } from './types';
import { getSiteSettings } from '@/lib/getSiteSettings';
import { getHeaderConfig, getFooterConfig } from '@/lib/config-loader';

// 根据 locale 获取默认描述后缀
function getDefaultDescriptionSuffix(locale: string, siteName: string): string {
  switch (locale) {
    case 'zh':
      return `${siteName} - 官方网站`;
    case 'en':
      return `${siteName} - Official Website`;
    case 'ja':
      return `${siteName} - 公式ウェブサイト`;
    case 'de':
      return `${siteName} - Offizielle Website`;
    case 'fr':
      return `${siteName} - Site officiel`;
    case 'es':
      return `${siteName} - Sitio oficial`;
    default:
      return `${siteName} - Official Website`;
  }
}

/**
 * 安全地从 settings 中读取属性，支持动态语言后缀
 * @param settings SiteSettings 对象（类型可能不完整）
 * @param baseKey 基础字段名，如 'homeSeoDescription'
 * @param locale 当前语言
 */
function getSeoField(settings: any, baseKey: string, locale: string): string | undefined {
  // 优先读取语言专属字段：homeSeoDescription_zh
  const langKey = `${baseKey}_${locale}`;
  if (settings[langKey]) {
    return settings[langKey];
  }
  // 回退到基础字段：homeSeoDescription
  return settings[baseKey];
}

export async function getHomeSeoInput(locale: string): Promise<SeoInput<'home'>> {
  // 使用 as any 临时绕过不完整的类型定义
  const settings = (await getSiteSettings()) as any;
  const header = await getHeaderConfig(locale);
  const footer = await getFooterConfig(locale);
  const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  
  const sameAs = (footer.social?.links || [])
    .filter(link => ['facebook', 'twitter', 'instagram', 'youtube', 'linkedin'].includes(link.platform))
    .map(link => link.url);
  
  let defaultOgImage = `${baseUrl}/default-og.jpg`;
  if (header.logo?.imageUrl) {
    defaultOgImage = header.logo.imageUrl.startsWith('http')
      ? header.logo.imageUrl
      : `${baseUrl}${header.logo.imageUrl}`;
  }
  
  // 获取标题：优先 homeSeoTitle，否则使用 siteName
  const title = settings.homeSeoTitle || settings.siteName || 'Site Name';
  
  // 获取描述：优先语言专属，再基础字段，最后动态生成
  const description = getSeoField(settings, 'homeSeoDescription', locale) ||
                      getDefaultDescriptionSuffix(locale, settings.siteName || 'Site');
  
  return {
    type: 'home',
    title,
    description,
    url: `${baseUrl}/${locale}`,
    image: defaultOgImage,
    structuredData: {
      sameAs,
      contactPoint: {
        telephone: settings.contactPhone || '',
        contactType: 'customer service',
        availableLanguage: [locale === 'zh' ? 'Chinese' : 'English'],
      },
    },
  };
}