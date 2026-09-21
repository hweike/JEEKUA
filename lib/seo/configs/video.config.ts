// lib/seo/configs/video.config.ts
import { PageTypeConfig } from '../types';
import { getTranslations } from 'next-intl/server';
import {
  getCachedVideoCategories,
  getCachedVideoConfig,
  getCachedVideos,
  getCachedVideoBySlug,
  type VideoData,
} from '@/lib/videosys';
import { getSiteSettings } from '@/lib/getSiteSettings';
import { getImageUrl } from '@/lib/files/url';

// ---------- 辅助函数 ----------
function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

function getVideoHomeUrl(locale: string, baseUrl: string): string {
  return `${baseUrl}/${locale}/video`;
}

function getVideoCategoryUrl(locale: string, slug: string, baseUrl: string): string {
  return `${baseUrl}/${locale}/video/${slug}`;
}

function getVideoDetailUrl(locale: string, categorySlug: string, videoSlug: string, baseUrl: string): string {
  return `${baseUrl}/${locale}/video/${categorySlug}/${videoSlug}`;
}

function secondsToISO8601(seconds: number): string {
  if (!seconds || seconds <= 0) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `PT${hours}H${minutes}M${secs}S`;
  }
  if (minutes > 0) {
    return `PT${minutes}M${secs}S`;
  }
  return `PT${secs}S`;
}

function getVideoEmbedUrl(sourceType: string, videoId: string): string {
  switch (sourceType) {
    case 'youtube': return `https://www.youtube.com/embed/${videoId}`;
    case 'vimeo': return `https://player.vimeo.com/video/${videoId}`;
    case 'bilibili': return `https://player.bilibili.com/player.html?bvid=${videoId}`;
    default: return '';
  }
}

// ---------- 1. 视频首页（videoCategory） ----------
export const videoCategoryConfig: PageTypeConfig<'videoCategory', any> = {
  type: 'videoCategory' as any,
  getDataFetcher: () => async (slug: string, locale: string) => {
    const settings = await getSiteSettings();
    const siteName = settings.siteName || 'Site Name';
    const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
    const t = await getTranslations({ locale, namespace: 'Video' });
    const [config, categories, videosResult] = await Promise.all([
      getCachedVideoConfig(locale),
      getCachedVideoCategories(locale),
      getCachedVideos(locale, undefined, 1, 15),
    ]);
    return {
      config,
      categories,
      videos: videosResult.items || [],
      total: videosResult.total || 0,
      siteName,
      baseUrl,
      t,
    };
  },
  mapToStructuredData: (data: any, locale: string) => {
    const { config, categories, videos, baseUrl, t } = data;
    const videoUrl = getVideoHomeUrl(locale, baseUrl);
    const siteUrl = baseUrl;

    const breadcrumbHome = t('breadcrumb.home', 'Home');
    const breadcrumbVideo = t('breadcrumb.video', 'Video');

    const configName = config.name || 'Video';
    const title = config.seoTitle || `${configName} | ${data.siteName}`;
    const description = config.seoDescription || getFallbackHomeDescription(data, locale);

    const breadcrumbItems = [
      { position: 1, name: breadcrumbHome, item: `${baseUrl}/${locale}` },
      { position: 2, name: breadcrumbVideo, item: videoUrl },
    ];

    const graph = [
      {
        '@type': 'CollectionPage',
        '@id': `${videoUrl}#collectionpage`,
        name: title,
        description: description,
        url: videoUrl,
        mainEntity: {
          '@type': 'ItemList',
          '@id': `${videoUrl}#itemlist`,
          numberOfItems: videos.length,
          itemListElement: videos.map((video: VideoData, index: number) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: {
              '@type': 'VideoObject',
              name: video.title,
              url: `${baseUrl}/${locale}/video/${video.categorySlug || video.category_key}/${video.slug}`,
              thumbnailUrl: video.thumbnail ? getImageUrl(video.thumbnail) : '',
              description: video.shortDescription || video.description || '',
              duration: video.duration ? secondsToISO8601(video.duration) : undefined,
              uploadDate: video.published_at,
            },
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbItems.map(({ position, name, item }) => ({
          '@type': 'ListItem',
          position,
          name,
          item,
        })),
      },
    ];

    return { '@context': 'https://schema.org', '@graph': graph };
  },
  getTitle: (data: any, locale: string) => {
    const { config } = data;
    if (config.seoTitle) return config.seoTitle;
    return config.name || 'Video';
  },
  getDescription: (data: any, locale: string) => {
    const { config } = data;
    if (config.seoDescription) return config.seoDescription;
    return getFallbackHomeDescription(data, locale);
  },
  getImage: (data: any, locale: string) => data.config.image || '',
  getNoindex: () => false,
  getCanonical: (data: any, baseUrl: string, locale: string) => getVideoHomeUrl(locale, baseUrl),
};

// ---------- 2. 视频分类页（videoCollection） ----------
export const videoCollectionConfig: PageTypeConfig<'videoCollection', any> = {
  type: 'videoCollection' as any,
  getDataFetcher: () => async (slug: string, locale: string) => {
    const settings = await getSiteSettings();
    const siteName = settings.siteName || 'Site Name';
    const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
    const t = await getTranslations({ locale, namespace: 'Video' });
    const categories = await getCachedVideoCategories(locale);
    const category = categories.find((c) => c.slug === slug) || null;
    if (!category) return null;

    const [config, videosResult] = await Promise.all([
      getCachedVideoConfig(locale),
      getCachedVideos(locale, category.key, 1, 15),
    ]);
    return {
      config,
      category,
      videos: videosResult.items || [],
      total: videosResult.total || 0,
      siteName,
      baseUrl,
      t,
    };
  },
  mapToStructuredData: (data: any, locale: string) => {
    const { config, category, videos, baseUrl, t } = data;
    const videoHomeUrl = getVideoHomeUrl(locale, baseUrl);
    const categoryUrl = getVideoCategoryUrl(locale, category.slug, baseUrl);
    const siteUrl = baseUrl;

    const breadcrumbHome = t('breadcrumb.home', 'Home');
    const breadcrumbVideo = t('breadcrumb.video', 'Video');

    const categoryName = category.name || category.slug;
    const title = category.seo_title || `${categoryName} | ${data.siteName}`;
    const description = category.seo_description || getFallbackCategoryDescription(data, locale);

    const breadcrumbItems = [
      { position: 1, name: breadcrumbHome, item: `${baseUrl}/${locale}` },
      { position: 2, name: breadcrumbVideo, item: videoHomeUrl },
      { position: 3, name: categoryName, item: categoryUrl },
    ];

    const graph = [
      {
        '@type': 'CollectionPage',
        '@id': `${categoryUrl}#collectionpage`,
        name: title,
        description: description,
        url: categoryUrl,
        mainEntity: {
          '@type': 'ItemList',
          '@id': `${categoryUrl}#itemlist`,
          numberOfItems: videos.length,
          itemListElement: videos.map((video: VideoData, index: number) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: {
              '@type': 'VideoObject',
              name: video.title,
              url: `${baseUrl}/${locale}/video/${category.slug}/${video.slug}`,
              thumbnailUrl: video.thumbnail ? getImageUrl(video.thumbnail) : '',
              description: video.shortDescription || video.description || '',
              duration: video.duration ? secondsToISO8601(video.duration) : undefined,
              uploadDate: video.published_at,
            },
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbItems.map(({ position, name, item }) => ({
          '@type': 'ListItem',
          position,
          name,
          item,
        })),
      },
    ];

    return { '@context': 'https://schema.org', '@graph': graph };
  },
  getTitle: (data: any, locale: string) => {
    const { category } = data;
    if (category.seo_title) return category.seo_title;
    return category.name || category.slug;
  },
  getDescription: (data: any, locale: string) => {
    const { category } = data;
    if (category.seo_description) return category.seo_description;
    return getFallbackCategoryDescription(data, locale);
  },
  getImage: (data: any, locale: string) => data.config.image || '',
  getNoindex: (data: any) => !data.videos || data.videos.length === 0,
  getCanonical: (data: any, baseUrl: string, locale: string) => getVideoCategoryUrl(locale, data.category.slug, baseUrl),
};

// ---------- 3. 视频详情页（videoDetail） ----------
export const videoDetailConfig: PageTypeConfig<'videoDetail', any> = {
  type: 'videoDetail' as any,
  getDataFetcher: () => async (slug: string, locale: string) => {
    const settings = await getSiteSettings();
    const siteName = settings.siteName || 'Site Name';
    const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
    const t = await getTranslations({ locale, namespace: 'Video' });
    const videoWithCategory = await getCachedVideoBySlug(locale, slug);
    if (!videoWithCategory) return null;
    const categories = await getCachedVideoCategories(locale);
    const category = categories.find((c) => c.slug === videoWithCategory.categorySlug) || null;
    return {
      video: videoWithCategory,
      category,
      siteName,
      baseUrl,
      t,
    };
  },
  mapToStructuredData: (data: any, locale: string) => {
    const { video, category, baseUrl, siteName, t } = data;
    const videoHomeUrl = getVideoHomeUrl(locale, baseUrl);
    const videoDetailUrl = getVideoDetailUrl(locale, video.categorySlug || video.category_key, video.slug, baseUrl);
    const categoryUrl = category ? getVideoCategoryUrl(locale, category.slug, baseUrl) : null;

    const breadcrumbHome = t('breadcrumb.home', 'Home');
    const breadcrumbVideo = t('breadcrumb.video', 'Video');

    const videoDescription = video.seo_description || video.shortDescription || video.description || video.title || 'Video';

    const videoObject: any = {
      '@type': 'VideoObject',
      '@id': `${videoDetailUrl}#videoobject`,
      name: video.title || 'Video',
      description: videoDescription,
      thumbnailUrl: video.thumbnail ? getImageUrl(video.thumbnail) : '',
      uploadDate: video.published_at || new Date().toISOString(),
    };

    if (video.duration) {
      videoObject.duration = secondsToISO8601(video.duration);
    }
    if (video.video_url) {
      videoObject.contentUrl = video.video_url;
    }
    if (video.video_id && video.source_type) {
      videoObject.embedUrl = getVideoEmbedUrl(video.source_type, video.video_id);
    }
    if (video.views) {
      videoObject.interactionStatistic = {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/WatchAction',
        userInteractionCount: video.views,
      };
    }
    if (video.content) {
      videoObject.transcript = video.content;
    }

    const breadcrumbItems = [
      { position: 1, name: breadcrumbHome, item: `${baseUrl}/${locale}` },
      { position: 2, name: breadcrumbVideo, item: videoHomeUrl },
    ];
    if (category) {
      breadcrumbItems.push({ position: 3, name: category.name, item: categoryUrl || '' });
    }
    breadcrumbItems.push({ position: breadcrumbItems.length + 1, name: video.title || 'Video', item: videoDetailUrl });

    const graph = [
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbItems.map(({ position, name, item }) => ({
          '@type': 'ListItem',
          position,
          name,
          item: item || '',
        })),
      },
      videoObject,
    ];

    return { '@context': 'https://schema.org', '@graph': graph };
  },
  getTitle: (data: any, locale: string) => {
    const { video } = data;
    if (!video) return 'Video';
    if (video.seo_title) return video.seo_title;
    return video.title || 'Video';
  },
  getDescription: (data: any, locale: string) => {
    const { video } = data;
    if (!video) return '';
    if (video.seo_description) return video.seo_description;
    return video.shortDescription || video.description || video.title || '';
  },
  getImage: (data: any, locale: string) => {
    const { video } = data;
    if (!video) return '';
    return video.thumbnail ? getImageUrl(video.thumbnail) : '';
  },
  getNoindex: () => false,
  getCanonical: (data: any, baseUrl: string, locale: string) => {
    const { video } = data;
    if (!video) return '';
    return getVideoDetailUrl(locale, video.categorySlug || video.category_key, video.slug, baseUrl);
  },
};

// ---------- fallback 描述生成（纯拼接，无占位符） ----------
function getFallbackHomeDescription(data: any, locale: string): string {
  const { config, videos, t } = data;
  const name = config.name || 'Video';
  const suffix = t('fallback.home.description', 'latest videos');
  return `${name} - ${suffix}`;
}

function getFallbackCategoryDescription(data: any, locale: string): string {
  const { category, config, videos, t } = data;
  const categoryName = category.name || category.slug;
  const suffix = t('fallback.category.description', `videos in ${categoryName}`);
  return `${categoryName} ${suffix}`;
}