// lib/seo/configs/productCategory.config.ts

import { PageTypeConfig } from '../types';
import { getCategoryPageData } from '../utils/catalog-data';
import { getOrganization } from '../jsonLd';
import { getBreadcrumbLabels, generateCategoryDescription } from '../utils/seo-helpers';
import { getSiteSettings } from '@/lib/getSiteSettings';
import { getImageUrl } from '@/lib/files/url';

/**
 * 从 price_tiers 中提取第一个价格
 */
function getFirstPrice(priceTiers: any[]): number | null {
  if (!Array.isArray(priceTiers) || priceTiers.length === 0) return null;
  const first = priceTiers[0];
  if (typeof first === 'object' && first.price !== undefined) {
    return typeof first.price === 'number' ? first.price : parseFloat(first.price);
  }
  return null;
}

export const productCategoryConfig: PageTypeConfig<'productCategory', any> = {
  type: 'productCategory',
  getDataFetcher: () => async (slug, locale) => {
    // 获取第一页产品（最多20个）用于结构化数据
    return getCategoryPageData(locale, slug, { page: 1, pageSize: 20 });
  },
  mapToStructuredData: async (data, locale) => {
    if (!data || !data.category || !data.productLine) {
      return {};
    }

    const { home, products } = await getBreadcrumbLabels(locale);

    const settings = await getSiteSettings();
    const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
    const category = data.category;
    const productLine = data.productLine;
    const productList = data.products || [];
    const totalProducts = data.totalProducts || 0;

    // Organization（复用首页配置）
    const org = await getOrganization(locale);

    // WebSite（使用站点名称）
    const searchUrlTemplate = `${baseUrl}/${locale}/search?q={search_term_string}`;
    const website = {
      '@type': 'WebSite',
      '@id': `${baseUrl}/#website`,
      url: baseUrl,
      name: settings.siteName || 'Site Name',
      publisher: { '@id': `${baseUrl}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: searchUrlTemplate },
        'query-input': 'required name=search_term_string',
      },
    };

    // BreadcrumbList（4层）
    const breadcrumbList = {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: home, item: `${baseUrl}/${locale}` },
        { '@type': 'ListItem', position: 2, name: products, item: `${baseUrl}/${locale}/products` },
        {
          '@type': 'ListItem',
          position: 3,
          name: productLine.name,
          item: `${baseUrl}/${locale}/products/${productLine.slug}`,
        },
        {
          '@type': 'ListItem',
          position: 4,
          name: category.name,
          item: `${baseUrl}/${locale}/products/${productLine.slug}/${category.slug}`,
        },
      ],
    };

    // ItemList（产品列表，最多20个）
    const itemList = {
      '@type': 'ItemList',
      '@id': `${baseUrl}/${locale}/products/${productLine.slug}/${category.slug}#itemlist`,
      numberOfItems: totalProducts,
      itemListElement: productList.slice(0, 20).map((product: any, index: number) => {
        const item: any = {
          '@type': 'Product',
          name: product.product_name || product.name,
          url: `${baseUrl}/${locale}/product/${product.slug || product.productId}`,
          sku: product.sku || '',
        };

        // 图片处理：仅当有图片时添加，并转换为绝对路径
        const rawImage = product.main_image_url || product.image || '';
        if (rawImage) {
          const imageUrl = getImageUrl(rawImage);
          if (imageUrl) {
            item.image = imageUrl;
          }
        }

        // 品牌
        if (product.brand) {
          item.brand = { '@type': 'Brand', name: product.brand };
        }

        // 价格和库存（从 price_tiers 取第一级价格）
        const firstPrice = getFirstPrice(product.price_tiers);
        const availability = product.availability === 'in_stock'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock';

        if (firstPrice !== null) {
          item.offers = {
            '@type': 'Offer',
            price: firstPrice,
            priceCurrency: product.currency || 'USD',
            availability: availability,
          };
        } else {
          // 数据缺失时记录警告（生产环境可移除）
          console.warn(
            `[SEO] 产品 ${product.productId || product.id} 缺少价格数据（price_tiers为空），无法生成 offers。`
          );
        }

        return { '@type': 'ListItem', position: index + 1, item };
      }),
    };

    // CollectionPage
    const description = generateCategoryDescription(data, locale);
    const collectionPage = {
      '@type': 'CollectionPage',
      '@id': `${baseUrl}/${locale}/products/${productLine.slug}/${category.slug}#collectionpage`,
      name: category.seoTitle || `${category.name} - ${productLine.name}`,
      description,
      url: `${baseUrl}/${locale}/products/${productLine.slug}/${category.slug}`,
      mainEntity: itemList,
    };

    return {
      '@context': 'https://schema.org',
      '@graph': [org, website, breadcrumbList, collectionPage],
    };
  },

  // getTitle 增强 fallback
  getTitle: (data, locale) => {
    if (!data || !data.category) return '';
    const cat = data.category;
    if (cat.seoTitle && cat.seoTitle.trim() !== '') {
      return cat.seoTitle;
    }
    const productLineName = data.productLine?.name || '';
    return productLineName ? `${cat.name} - ${productLineName}` : cat.name;
  },

  // getDescription 使用工具函数（已包含 fallback）
  getDescription: (data, locale) => generateCategoryDescription(data, locale),

  // getImage 统一使用 getImageUrl
  getImage: (data) => {
    if (!data || !data.category) return '';
    return getImageUrl(data.category.image || '');
  },

  getCanonical: (data, baseUrl, locale) => {
    if (!data || !data.category || !data.productLine) return undefined;
    return `${baseUrl}/${locale}/products/${data.productLine.slug}/${data.category.slug}`;
  },
};