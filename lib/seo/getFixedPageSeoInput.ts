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
      return `${siteName} - Official Website`; // 默认英文
  }
}

export async function getHomeSeoInput(locale: string): Promise<SeoInput<'home'>> {
  const settings = await getSiteSettings();
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
  
  // 动态生成描述：优先使用配置中的多语言描述，否则使用带后缀的默认描述
  let description = settings.homeSeoDescription;
  if (!description) {
    // 支持按语言配置独立字段，例如 homeSeoDescription_zh, homeSeoDescription_en
    const langDescKey = `homeSeoDescription_${locale}`;
    if (settings[langDescKey]) {
      description = settings[langDescKey];
    } else {
      description = getDefaultDescriptionSuffix(locale, settings.siteName);
    }
  }
  
  return {
    type: 'home',
    title: settings.homeSeoTitle || settings.siteName,
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