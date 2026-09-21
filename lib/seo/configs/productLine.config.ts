// lib/seo/configs/productLine.config.ts

import { PageTypeConfig } from '../types';
import { getProductLinePageData } from '../utils/catalog-data';
import { getOrganization } from '../jsonLd';
import { getBreadcrumbLabels, getItemDescription } from '../utils/seo-helpers';
import { getSiteSettings } from '@/lib/getSiteSettings';

export const productLineConfig: PageTypeConfig<'productLine'> = {
  type: 'productLine',
  getDataFetcher: () => async (slug, locale) => {
    return getProductLinePageData(locale, slug);
  },
  mapToStructuredData: async (data, locale) => {
    if (!data || !data.productLine) {
      return {};
    }

    const { home, products } = await getBreadcrumbLabels(locale);

    const settings = await getSiteSettings();
    const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
    const productLine = data.productLine;
    const categories = data.categories || [];

    const org = await getOrganization(locale);
    const siteTitle = productLine.seoTitle || productLine.name || settings.siteName || 'Site Name';
    const searchUrlTemplate = `${baseUrl}/${locale}/search?q={search_term_string}`;
    const website = {
      '@type': 'WebSite',
      '@id': `${baseUrl}/#website`,
      url: baseUrl,
      name: siteTitle,
      publisher: { '@id': `${baseUrl}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: searchUrlTemplate },
        'query-input': 'required name=search_term_string',
      },
    };

    const breadcrumbList = {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: home, item: `${baseUrl}/${locale}` },
        { '@type': 'ListItem', position: 2, name: products, item: `${baseUrl}/${locale}/products` },
        { '@type': 'ListItem', position: 3, name: productLine.name, item: `${baseUrl}/${locale}/products/${productLine.slug}` },
      ],
    };

    const itemList = {
      '@type': 'ItemList',
      '@id': `${baseUrl}/${locale}/products/${productLine.slug}#itemlist`,
      numberOfItems: categories.length,
      itemListElement: categories.slice(0, 15).map((cat: any, index: number) => {
        const item: any = {
          '@type': 'Product',
          name: cat.name,
          url: `${baseUrl}/${locale}/products/${productLine.slug}/${cat.slug}`,
        };
        if (cat.image && cat.image.trim() !== '') {
          item.image = cat.image;
        }
        const description = getItemDescription(cat);
        if (description) {
          item.description = description;
        }
        return {
          '@type': 'ListItem',
          position: index + 1,
          item,
        };
      }),
    };

    const description = (() => {
      if (productLine.seoDescription && productLine.seoDescription.trim() !== '') {
        return productLine.seoDescription;
      }
      const name = productLine.name || '';
      const categoryNames = (data.categories || []).slice(0, 5).map((c: any) => c.name).join(', ');
      if (categoryNames) {
        return `${name} product line includes ${categoryNames}. Browse full range.`;
      }
      return `${name} product line. Browse full range.`;
    })();

    const collectionPage = {
      '@type': 'CollectionPage',
      '@id': `${baseUrl}/${locale}/products/${productLine.slug}#collectionpage`,
      name: productLine.seoTitle || productLine.name,
      description,
      url: `${baseUrl}/${locale}/products/${productLine.slug}`,
      mainEntity: itemList,
    };

    return {
      '@context': 'https://schema.org',
      '@graph': [org, website, breadcrumbList, collectionPage],
    };
  },
  getTitle: (data) => {
    if (!data || !data.productLine) return '';
    return data.productLine.seoTitle || data.productLine.name || '';
  },
  getDescription: (data) => {
    if (!data || !data.productLine) return '';
    if (data.productLine.seoDescription && data.productLine.seoDescription.trim() !== '') {
      return data.productLine.seoDescription;
    }
    const name = data.productLine.name || '';
    const categoryNames = (data.categories || []).slice(0, 5).map((c: any) => c.name).join(', ');
    if (categoryNames) {
      return `${name} product line includes ${categoryNames}. Browse full range.`;
    }
    return `${name} product line. Browse full range.`;
  },
  getImage: (data) => {
    if (!data || !data.productLine) return '';
    if (data.categories && data.categories.length > 0) {
      const firstCat = data.categories[0];
      if (firstCat.image && firstCat.image.trim() !== '') {
        return firstCat.image;
      }
    }
    return '';
  },
  getCanonical: (data, baseUrl, locale) => {
    if (!data || !data.productLine) return undefined;
    return `${baseUrl}/${locale}/products/${data.productLine.slug}`;
  },
};