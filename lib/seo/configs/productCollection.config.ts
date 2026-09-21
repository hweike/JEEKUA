// lib/seo/configs/productCollection.config.ts

import { PageTypeConfig } from '../types';
import { getCategoryPageData } from '../utils/catalog-data';
import { getOrganization } from '../jsonLd';
import { getBreadcrumbLabels, generateCollectionDescription } from '../utils/seo-helpers';
import { getSiteSettings } from '@/lib/getSiteSettings';
import { getImageUrl } from '@/lib/files/url'; // ✅ 导入统一的图片URL工具

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

export const productCollectionConfig: PageTypeConfig<'productCollection'> = {
  type: 'productCollection',
  getDataFetcher: () => async (slug, locale) => {
    return getCategoryPageData(locale, slug, { page: 1, pageSize: 20 });
  },
  mapToStructuredData: async (data, locale) => {
    if (!data || !data.category) {
      return {};
    }

    const { home, collections } = await getBreadcrumbLabels(locale);

    const settings = await getSiteSettings();
    const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
    const category = data.category;
    const productList = data.products || [];
    const totalProducts = data.totalProducts || 0;

    const org = await getOrganization(locale);
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

    const breadcrumbList = {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: home, item: `${baseUrl}/${locale}` },
        { '@type': 'ListItem', position: 2, name: collections, item: `${baseUrl}/${locale}/collections` },
        { '@type': 'ListItem', position: 3, name: category.name, item: `${baseUrl}/${locale}/collections/${category.slug}` },
      ],
    };

    // ========== 构建 ItemList ==========
    const itemList = {
      '@type': 'ItemList',
      '@id': `${baseUrl}/${locale}/collections/${category.slug}#itemlist`,
      numberOfItems: totalProducts,
      itemListElement: productList.slice(0, 20).map((product: any, index: number) => {
        const item: any = {
          '@type': 'Product',
          name: product.product_name || product.name,
          url: `${baseUrl}/${locale}/product/${product.slug || product.productId}`,
          sku: product.sku || '',
        };

        // ✅ 使用 getImageUrl 统一处理图片路径，保证与前台一致
        const rawImage = product.main_image_url || product.image || '';
        if (rawImage) {
          const imageUrl = getImageUrl(rawImage); // 替换了原来的 toAbsoluteUrl
          if (imageUrl) {
            item.image = imageUrl;
          }
        }

        // ✅ 品牌（如果有）
        if (product.brand) {
          item.brand = { '@type': 'Brand', name: product.brand };
        }

        // ✅ 价格和库存（从 price_tiers 取第一级价格）
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

        return {
          '@type': 'ListItem',
          position: index + 1,
          item,
        };
      }),
    };

    // ========== CollectionPage 描述 ==========
    const description = generateCollectionDescription(data, locale);

    const collectionPage = {
      '@type': 'CollectionPage',
      '@id': `${baseUrl}/${locale}/collections/${category.slug}#collectionpage`,
      name: category.seoTitle || category.name,
      description,
      url: `${baseUrl}/${locale}/collections/${category.slug}`,
      mainEntity: itemList,
    };

    return {
      '@context': 'https://schema.org',
      '@graph': [org, website, breadcrumbList, collectionPage],
    };
  },

  // ========== getTitle 增强 fallback ==========
  getTitle: (data, locale) => {
    if (!data || !data.category) return '';
    const cat = data.category;
    if (cat.seoTitle && cat.seoTitle.trim() !== '') {
      return cat.seoTitle;
    }
    const brand = data.productLine?.brand || '';
    return `${cat.name} - ${brand} | ${brand} Official Site`;
  },

  // ========== getDescription 增强 fallback ==========
  getDescription: (data, locale) => {
    if (!data || !data.category) return '';
    const cat = data.category;
    if (cat.seoDescription && cat.seoDescription.trim() !== '') {
      return cat.seoDescription;
    }
    const specs = cat.description?.match(/(\d+-\d+W|\d+W)/)?.[0] || '';
    const name = cat.name || '';
    let desc = `${name}${specs ? '，功率范围' + specs : ''}，适用于工业控制、LED照明、安防等领域。浏览完整产品规格。`;
    return desc.length > 160 ? desc.substring(0, 157) + '...' : desc;
  },

  getImage: (data) => data?.category?.image || '',

  getCanonical: (data, baseUrl, locale) => {
    if (!data || !data.category) return undefined;
    return `${baseUrl}/${locale}/collections/${data.category.slug}`;
  },
};