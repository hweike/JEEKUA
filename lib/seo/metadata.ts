// lib/seo/metadata.ts
import { Metadata } from 'next';
import { PageType, SeoInput } from './types';
import { generateJsonLd } from './jsonLd';
import { generateOpenGraph, generateTwitterCard } from './ogTwitter';
import { getSiteSettings } from '@/lib/getSiteSettings';
import { getFooterConfig, getHeaderConfig } from '@/lib/config-loader';

/**
 * 获取站点元数据（网站名称、Twitter账号、默认分享图、Favicon）
 * @param locale 当前语言
 */
async function getSiteMeta(locale: string) {
  const settings = await getSiteSettings();
  const siteName = settings.siteName || 'Site Name';

  // 从页脚配置中提取 Twitter 账号（如果有）
  const footerConfig = await getFooterConfig(locale);
  let twitterSite = '@yourhandle'; // 默认值
  if (footerConfig.social?.visible && footerConfig.social.links) {
    const twitterLink = footerConfig.social.links.find(
      (link) => link.platform === 'twitter'
    );
    if (twitterLink && twitterLink.url) {
      const match = twitterLink.url.match(/twitter\.com\/([^/?]+)/);
      if (match) twitterSite = `@${match[1]}`;
    }
  }

  // 从页头配置中获取 Logo 和 Favicon
  const headerConfig = await getHeaderConfig(locale);
  const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');

  // 默认分享图：优先使用页头 Logo，否则使用 /default-og.jpg
  let defaultOgImage = `${baseUrl}/default-og.jpg`;
  if (headerConfig.logo?.imageUrl) {
    const logoUrl = headerConfig.logo.imageUrl.startsWith('http')
      ? headerConfig.logo.imageUrl
      : `${baseUrl}${headerConfig.logo.imageUrl}`;
    defaultOgImage = logoUrl;
  }

  // Favicon：优先使用页头配置的 faviconUrl，否则回退到 /favicon.ico
  let faviconUrl = `${baseUrl}/favicon.ico`;
  if (headerConfig.logo?.faviconUrl && headerConfig.logo.faviconUrl.trim() !== '') {
    faviconUrl = headerConfig.logo.faviconUrl.startsWith('http')
      ? headerConfig.logo.faviconUrl
      : `${baseUrl}${headerConfig.logo.faviconUrl}`;
  }

  return { siteName, twitterSite, defaultOgImage, faviconUrl };
}

/**
 * 生成页面的 Metadata 和 JSON-LD 脚本
 * @param input SEO 输入参数
 * @param locale 当前语言代码（用于 og:locale）
 * @returns { metadata, jsonLdScripts }
 */
export async function generatePageMetadata<T extends PageType>(
  input: SeoInput<T>,
  locale: string
): Promise<{ metadata: Metadata; jsonLdScripts: string[] }> {
  const { siteName, twitterSite, defaultOgImage, faviconUrl } = await getSiteMeta(locale);
  const finalTitle = `${input.title} | ${siteName}`;
  const finalImage = input.image || defaultOgImage;

  // 生成 JSON-LD 字符串数组（每个元素是一个完整的 JSON 字符串）
  const jsonLdScripts = await generateJsonLd(input, locale);

  // 生成 OG 和 Twitter Card
  const openGraph = await generateOpenGraph(
    { ...input, image: finalImage },
    siteName,
    locale
  );
  const twitter = await generateTwitterCard(
    { ...input, image: finalImage },
    twitterSite
  );

  // 构建 Metadata 对象（不再包含 other 字段）
  const metadata: Metadata = {
    title: finalTitle,
    description: input.description,
    robots: input.noindex ? 'noindex, follow' : 'index, follow',
    alternates: {
      canonical: input.canonical || input.url,
    },
    openGraph,
    twitter,
    // 添加 favicon 图标配置
    icons: {
      icon: faviconUrl,
      // 如果需要指定尺寸和类型，可以展开为对象数组，例如：
      // icon: [
      //   { url: faviconUrl, sizes: 'any', type: 'image/x-icon' },
      // ],
    },
  };

  return { metadata, jsonLdScripts };
}