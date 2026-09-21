// lib/seo/configs/home.config.ts

import { PageTypeConfig } from '../types';
import { getPageDataFromStorage } from '../page-helpers';
import { getSiteSettings } from '@/lib/getSiteSettings';
import { getHeaderConfig, getFooterConfig } from '@/lib/config-loader';
// 移除未使用的导入
// import { getBreadcrumbLabels } from '../utils/seo-helpers';
import type { ExtendedSiteSettings } from '../types';

export const homeConfig: PageTypeConfig<'home', any> = {
  type: 'home',

  getDataFetcher: () => async (slug: string, locale: string, preloadedData?: any) => {
    if (preloadedData) {
      const settings = await getSiteSettings() as ExtendedSiteSettings;
      const header = await getHeaderConfig(locale);
      const footer = await getFooterConfig(locale);

      return {
        title: preloadedData.title || 'Home',
        seoTitle: preloadedData.seo_title || settings.homeSeoTitle || settings.siteName || '',
        seoDescription: preloadedData.seo_description || settings.homeSeoDescription || '',
        seoKeywords: preloadedData.seo_keywords || settings.homeSeoKeywords || '',
        siteName: settings.siteName || 'Site Name',
        websiteUrl: settings.websiteUrl || '',
        contactPhone: settings.contactPhone || '',
        companyName: settings.companyName || '',
        country: settings.country || '',
        registeredAddress: settings.registeredAddress || '',
        city: settings.city || '',
        province: settings.province || '',
        postalCode: settings.postalCode || '',
        brand: settings.brand || [],
        logo: header.logo,
        socialShareImage: settings.socialShareImage || '',
        sameAs: (footer.social?.links || [])
          .filter((link: any) => link.url && link.url.trim() !== '')
          .map((link: any) => link.url),
      };
    }

    const pageData = await getPageDataFromStorage(locale, 'home');
    const settings = await getSiteSettings() as ExtendedSiteSettings;
    const header = await getHeaderConfig(locale);
    const footer = await getFooterConfig(locale);

    const seoTitle = pageData?.seo_title || settings.homeSeoTitle || settings.siteName || '';
    const seoDescription = pageData?.seo_description || settings.homeSeoDescription || '';
    const seoKeywords = pageData?.seo_keywords || settings.homeSeoKeywords || '';

    return {
      title: pageData?.title || 'Home',
      seoTitle,
      seoDescription,
      seoKeywords,
      siteName: settings.siteName || 'Site Name',
      websiteUrl: settings.websiteUrl || '',
      contactPhone: settings.contactPhone || '',
      companyName: settings.companyName || '',
      country: settings.country || '',
      registeredAddress: settings.registeredAddress || '',
      city: settings.city || '',
      province: settings.province || '',
      postalCode: settings.postalCode || '',
      brand: settings.brand || [],
      logo: header.logo,
      socialShareImage: settings.socialShareImage || '',
      sameAs: (footer.social?.links || [])
        .filter((link: any) => link.url && link.url.trim() !== '')
        .map((link: any) => link.url),
    };
  },

  mapToStructuredData: async (data: any, locale: string) => {
    const baseUrl = data.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '';
    const siteName = data.siteName || 'Site Name';

    const organization: any = {
      '@type': 'Organization',
      '@id': `${baseUrl}/#organization`,
      name: siteName,
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: data.logo?.imageUrl || `${baseUrl}/logo.png`,
      },
    };

    if (data.sameAs && data.sameAs.length > 0) {
      organization.sameAs = data.sameAs;
    }

    if (data.brand && data.brand.length > 0) {
      if (data.brand.length === 1) {
        organization.brand = { '@type': 'Brand', name: data.brand[0] };
      } else {
        organization.brand = data.brand.map((brandName: string) => ({
          '@type': 'Brand',
          name: brandName,
        }));
      }
    }

    if (data.contactPhone) {
      organization.contactPoint = {
        '@type': 'ContactPoint',
        telephone: data.contactPhone,
        contactType: 'customer service',
        availableLanguage: ['English', 'Chinese', 'Spanish', 'German', 'French', 'Japanese', 'Korean', 'Russian', 'Arabic', 'Portuguese'],
      };
    }

    const searchUrlTemplate = `${baseUrl}/${locale}/search?q={search_term_string}`;
    const website = {
      '@type': 'WebSite',
      '@id': `${baseUrl}/#website`,
      url: baseUrl,
      name: siteName,
      publisher: { '@id': `${baseUrl}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: searchUrlTemplate,
        },
        'query-input': 'required name=search_term_string',
      },
    };

    return { '@graph': [organization, website] };
  },

  getTitle: (data: any) => data.seoTitle || data.siteName || 'Home',

  // ✅ 增加 fallback 描述
  getDescription: (data: any) => {
    if (data.seoDescription && data.seoDescription.trim() !== '') {
      return data.seoDescription;
    }
    return `${data.siteName || '网站'} - 首页`;
  },

  getImage: (data: any) => {
    if (data.socialShareImage && data.socialShareImage.trim() !== '') {
      return data.socialShareImage;
    }
    return data.logo?.imageUrl || '/default-og.jpg';
  },

  getNoindex: () => false,

  getCanonical: (data: any, baseUrl: string, locale: string) => {
    return `${baseUrl}/${locale}`;
  },
};