// lib/seo/metadata.ts
import { Metadata } from 'next';
import { PageType, SeoInput } from './types';
import { generateJsonLd } from './jsonLd';
import { generateOpenGraph, generateTwitterCard } from './ogTwitter';
import { getSiteSettings } from '@/lib/getSiteSettings';
import { getFooterConfig, getHeaderConfig } from '@/lib/config-loader';

// Next.js Metadata 支持的 Open Graph 类型列表
const SUPPORTED_OG_TYPES = new Set([
  'website',
  'article',
  'book',
  'profile',
  'music.song',
  'music.album',
  'music.playlist',
  'music.radio_station',
  'video.movie',
  'video.episode',
  'video.tv_show',
  'video.other',
]);

/**
 * 获取站点元数据（网站名称、Twitter账号、默认分享图、Favicon、基础URL）
 * @param locale 当前语言
 */
async function getSiteMeta(locale: string) {
  const settings = await getSiteSettings();
  const siteName = settings.siteName || 'Site Name';

  const footerConfig = await getFooterConfig(locale);
  let twitterSite = '@feismanpower';
  if (footerConfig.social?.visible && footerConfig.social.links) {
    const twitterLink = footerConfig.social.links.find(
      (link) => link.platform === 'twitter'
    );
    if (twitterLink && twitterLink.url) {
      const match = twitterLink.url.match(/(?:twitter|x)\.com\/([^/?]+)/);
      if (match) twitterSite = `@${match[1]}`;
    }
  }

  const headerConfig = await getHeaderConfig(locale);
  const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');

  let defaultOgImage = `${baseUrl}/default-og.jpg`;

  if (settings.socialShareImage && settings.socialShareImage.trim() !== '') {
    if (settings.socialShareImage.startsWith('http')) {
      defaultOgImage = settings.socialShareImage;
    } else {
      const path = settings.socialShareImage.startsWith('/')
        ? settings.socialShareImage
        : `/${settings.socialShareImage}`;
      defaultOgImage = `${baseUrl}${path}`;
    }
  } else if (headerConfig.logo?.imageUrl) {
    const logoUrl = headerConfig.logo.imageUrl.startsWith('http')
      ? headerConfig.logo.imageUrl
      : `${baseUrl}${headerConfig.logo.imageUrl}`;
    defaultOgImage = logoUrl;
  }

  let faviconUrl = `${baseUrl}/favicon.ico`;
  if (headerConfig.logo?.faviconUrl && headerConfig.logo.faviconUrl.trim() !== '') {
    faviconUrl = headerConfig.logo.faviconUrl.startsWith('http')
      ? headerConfig.logo.faviconUrl
      : `${baseUrl}${headerConfig.logo.faviconUrl}`;
  }

  return { siteName, twitterSite, defaultOgImage, faviconUrl, baseUrl };
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
  const { siteName, twitterSite, defaultOgImage, faviconUrl, baseUrl } = await getSiteMeta(locale);

  const finalTitle = input.title ? `${input.title} | ${siteName}` : siteName;

  // 确保最终图片 URL 为绝对路径
  let finalImage = defaultOgImage;
  if (input.image) {
    if (input.image.startsWith('http://') || input.image.startsWith('https://')) {
      finalImage = input.image;
    } else {
      const path = input.image.startsWith('/') ? input.image : `/${input.image}`;
      finalImage = `${baseUrl}${path}`;
    }
  }

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

  // ✅ 只在类型不被 Next.js Metadata 支持时修正，保留 article、video.movie 等
  if (openGraph.type && !SUPPORTED_OG_TYPES.has(openGraph.type)) {
    // 类型断言，因为 TypeScript 认为 openGraph.type 只能是联合类型，但运行时我们可以改
    (openGraph as any).type = 'website';
  }

  // 构建 Metadata 对象
  const metadata: Metadata = {
  title: finalTitle,
  description: input.description,
  robots: input.noindex ? 'noindex, follow' : 'index, follow',
  alternates: {
    canonical: input.canonical || input.url,
  },
  openGraph,
  twitter,
  icons: { icon: faviconUrl },  // ← 完全删除这行
  };

  return { metadata, jsonLdScripts };
}