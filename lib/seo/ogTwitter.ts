// lib/seo/ogTwitter.ts
import { PageType, SeoInput } from './types';

// 根据页面类型映射 og:type
const ogTypeMap: Record<PageType, string> = {
  home: 'website',
  productLine: 'website',
  productCollection: 'website',
  product: 'product',
  page: 'website',
  blogList: 'website',
  blogCollection: 'website',
  blogPost: 'article',
  docLibrary: 'website',
  doc: 'article',
  videoCollection: 'website',
  video: 'video.movie',
  inquiry: 'website',
  policy: 'website',
};

export async function generateOpenGraph<T extends PageType>(input: SeoInput<T>, siteName: string, locale: string) {
  const ogType = ogTypeMap[input.type] || 'website';
  const image = input.image || `${process.env.NEXT_PUBLIC_BASE_URL}/default-og.jpg`;
  return {
    title: input.title,
    description: input.description,
    url: input.canonical || input.url,
    type: ogType,
    siteName,
    images: [{ url: image, width: 1200, height: 630, alt: input.title }],
    locale,
  };
}

export async function generateTwitterCard<T extends PageType>(input: SeoInput<T>, twitterSite: string) {
  const image = input.image || `${process.env.NEXT_PUBLIC_BASE_URL}/default-og.jpg`;
  return {
    card: 'summary_large_image',
    title: input.title,
    description: input.description,
    images: [image],
    site: twitterSite,
  };
}