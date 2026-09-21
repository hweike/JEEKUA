// lib/seo/configs/page.config.ts

import { PageTypeConfig } from '../types';
import { getSiteSettings } from '@/lib/getSiteSettings';
import { getBreadcrumbLabels } from '../utils/seo-helpers';
import { getOrganization } from '../jsonLd';
import { getPageIdBySlug, readPage } from '@/lib/pages/pageService';

// ========== 辅助函数 ==========

function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

function extractPlainText(html: string): string {
  if (!html) return '';
  let text = html.replace(/<[^>]*>/g, ' ');
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
  return text.replace(/\s+/g, ' ').trim();
}

// ========== 基础配置工厂函数 ==========

interface PageConfigOptions {
  type: 'page' | 'policy' | 'inquiry';
  schemaType: 'WebPage' | 'ContactPage';
}

function createPageConfig(options: PageConfigOptions): PageTypeConfig<any, any> {
  const { type, schemaType } = options;

  return {
    type,

    getDataFetcher: () => async (slug: string, locale: string, preloadedData?: any) => {
      // 1. 优先使用预加载数据
      if (preloadedData) {
        return {
          title: preloadedData.title || '',
          seoTitle: preloadedData.seo_title || preloadedData.title || '',
          seoDescription: preloadedData.seo_description || '',
          seoKeywords: preloadedData.seo_keywords || '',
          visible: preloadedData.visible || 'visible',
          canonical: `/${locale}/${preloadedData.slug || slug}`,
          image: preloadedData.image || '',
          content: preloadedData.content || '',
          createdAt: preloadedData.createdAt || '',
          updatedAt: preloadedData.updatedAt || '',
          noindex: preloadedData.visible !== 'visible',
        };
      }

      // 2. 回退：从存储获取
      try {
        const pageId = await getPageIdBySlug(locale, slug);
        if (!pageId) return null;
        const page = await readPage(locale, pageId);
        if (!page) return null;

        return {
          title: page.title || '',
          seoTitle: page.seo_title || page.title || '',
          seoDescription: page.seo_description || '',
          seoKeywords: page.seo_keywords || '',
          visible: page.visible || 'visible',
          canonical: `/${locale}/${page.slug}`,
          image: '', // PageData 没有 image 字段，设为空，由 generatePageMetadata 使用默认图
          content: page.content || '',
          createdAt: page.createdAt || '',
          updatedAt: page.updatedAt || '',
          noindex: page.visible !== 'visible',
        };
      } catch (error) {
        console.error(`[${type}Config] 获取页面数据失败:`, error);
        return null;
      }
    },

    getTitle: (data: any) => data.seoTitle || data.title || '页面',

    getDescription: (data: any) => {
      if (data.seoDescription) return data.seoDescription;
      if (data.content) {
        const plainText = extractPlainText(data.content);
        return truncateText(plainText, 160);
      }
      return '';
    },

    getImage: (data: any) => data.image || '',

    getNoindex: (data: any) => data.noindex || false,

    getCanonical: (data: any, baseUrl: string, locale: string) => {
        // 优先使用 data.canonical
        if (data.canonical) {
          return data.canonical.startsWith('/') ? data.canonical : `/${data.canonical}`;
        }
        // ✅ 修复：使用 data.slug 而不是硬编码 'page'
        const slug = data.slug || '';
        return `/${locale}/${slug}`;
      },

    mapToStructuredData: async (data: any, locale: string) => {
      const settings = await getSiteSettings();
      const baseUrl = settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '';
      const siteName = settings.siteName || 'Site Name';

      const labels = await getBreadcrumbLabels(locale);
      const homeLabel = labels.home || '首页';

      const canonicalPath = data.canonical || `/${locale}/${data.slug || ''}`;
      const pageUrl = `${baseUrl}${canonicalPath.startsWith('/') ? '' : '/'}${canonicalPath}`;

      // --- 面包屑（2层） ---
      const breadcrumbItems = [
        { position: 1, name: homeLabel, item: `${baseUrl}/${locale}` },
        { position: 2, name: data.title || '页面', item: pageUrl },
      ];
      const breadcrumbList = {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbItems.map(({ position, name, item }) => ({
          '@type': 'ListItem',
          position,
          name,
          item,
        })),
      };

      // --- 根据类型生成不同的 Schema ---
      const description = data.seoDescription || truncateText(extractPlainText(data.content || ''), 200) || '';

      let mainEntity;
      if (schemaType === 'ContactPage') {
        mainEntity = {
          '@type': 'ContactPage',
          '@id': `${pageUrl}#contactpage`,
          name: data.seoTitle || data.title || '页面',
          description,
          url: pageUrl,
          inLanguage: locale,
          isPartOf: { '@id': `${baseUrl}/#website` },
          datePublished: data.createdAt || undefined,
          dateModified: data.updatedAt || undefined,
        };
      } else {
        mainEntity = {
          '@type': 'WebPage',
          '@id': `${pageUrl}#webpage`,
          name: data.seoTitle || data.title || '页面',
          description,
          url: pageUrl,
          inLanguage: locale,
          isPartOf: { '@id': `${baseUrl}/#website` },
          datePublished: data.createdAt || undefined,
          dateModified: data.updatedAt || undefined,
        };
      }

      return {
        '@graph': [
          { '@type': 'Organization', '@id': `${baseUrl}/#organization` },
          { '@type': 'WebSite', '@id': `${baseUrl}/#website` },
          breadcrumbList,
          mainEntity,
        ],
      };
    },
  };
}

// ========== 导出三个配置 ==========

export const pageConfig: PageTypeConfig<'page'> = createPageConfig({
  type: 'page',
  schemaType: 'WebPage',
});

export const policyConfig: PageTypeConfig<'policy'> = createPageConfig({
  type: 'policy',
  schemaType: 'WebPage',
});

export const inquiryConfig: PageTypeConfig<'inquiry'> = createPageConfig({
  type: 'inquiry',
  schemaType: 'ContactPage',
});