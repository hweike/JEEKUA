// lib/seo/configs/product.config.ts
import { PageTypeConfig } from '../types';
import { getProductPageData } from '../utils/catalog-data';
import { getImageUrl } from '@/lib/files/url';

// ---------- 图片 URL 缓存 ----------
// 使用 Map 缓存已转换的图片 URL，避免相同原始路径重复转换
const imageUrlCache = new Map<string, string>();

/**
 * 获取缓存后的图片完整 URL
 * @param rawUrl - 原始图片路径（可能为相对路径或已完整）
 * @returns 完整 URL
 */
function getCachedImageUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  if (imageUrlCache.has(rawUrl)) {
    return imageUrlCache.get(rawUrl)!;
  }
  const result = getImageUrl(rawUrl);
  imageUrlCache.set(rawUrl, result);
  return result;
}

// ---------- 产品 SEO 配置 ----------
export const productConfig: PageTypeConfig<'product', any> = {
  type: 'product',
  getDataFetcher: () => async (slug, locale) => {
    const result = await getProductPageData(locale, slug);
    if (!result) return null;
    return {
      ...result.product,
      _productLine: result.productLine,
      _category: result.category,
      _series: result.series,
    };
  },
  mapToStructuredData: (data) => {
    if (!data) return {};

    // 提取价格：优先使用 data.price，否则从 price_tiers 取第一个
    let price = data.price;
    if (price === undefined || price === null) {
      const tiers = data.price_tiers || [];
      if (tiers.length > 0 && tiers[0].price !== undefined) {
        price = tiers[0].price;
      } else {
        price = 0;
      }
    }
    const currency = data.currency || 'USD';

    // 库存状态（当前硬编码为有库存）
    const availability = 'in_stock';

    // ---------- 图片处理（使用缓存） ----------
    const imageUrl = data.main_image_url ? getCachedImageUrl(data.main_image_url) : '';

    // 处理变体图片，同样使用缓存
    const variants = (data.variants || []).map((v: any) => ({
      ...v,
      main_image_url: v.main_image_url ? getCachedImageUrl(v.main_image_url) : '',
    }));

    // 构建结构化数据对象
    const structured: any = {
      name: data.product_name || data.name || '',
      image: imageUrl,
      description: data.short_description || data.description || '',
      sku: data.sku || '',
      brand: data.brand || '',
      price,
      currency,
      availability,
      variants,
      aggregateRating: data.aggregateRating || undefined,
      _productLine: data._productLine,
      _category: data._category,
      _series: data._series,
    };

    if (price !== undefined && price !== null) {
      structured.offers = {
        '@type': 'Offer',
        price: price.toString(),
        priceCurrency: currency,
        availability: availability === 'in_stock'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      };
    }

    if (data.aggregateRating && data.aggregateRating.ratingValue) {
      structured.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: data.aggregateRating.ratingValue,
        reviewCount: data.aggregateRating.reviewCount || 0,
        bestRating: 5,
      };
    }

    return structured;
  },
  getTitle: (data) => {
    if (!data) return '';
    return data.seo_title || data.product_name || '';
  },
  getDescription: (data) => {
    if (!data) return '';
    return data.seo_description || data.short_description || '';
  },
  getImage: (data) => {
    if (!data) return '';
    return data.main_image_url || '';
  },
  getNoindex: (data) => data?.noindex || false,
  getCanonical: (data, baseUrl, locale) => {
    if (!data || !data.slug) return undefined;
    return `${baseUrl}/${locale}/product/${data.slug}`;
  },
};