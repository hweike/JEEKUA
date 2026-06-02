// lib/seo/types.ts
export type PageType =
  | 'home'
  | 'productLine'
  | 'productCollection'
  | 'product'
  | 'page'
  | 'blogList'
  | 'blogCollection'
  | 'blogPost'
  | 'docLibrary'
  | 'doc'
  | 'videoCollection'
  | 'video'
  | 'inquiry'
  | 'policy';

// 结构化数据专用字段（按页面类型扩展）
export interface StructuredDataMap {
  home: {
    sameAs?: string[];
    contactPoint?: { telephone: string; contactType: string; availableLanguage: string[] };
  };
  productLine: {
    name: string;
    description?: string;
    numberOfItems?: number;
    itemList?: { url: string }[];
  };
  productCollection: {
    name: string;
    description?: string;
    numberOfItems?: number;
    itemList?: { url: string }[];
  };
  product: {
    name: string;
    image: string | string[];
    description: string;
    sku?: string;
    brand?: string;
    offers?: {
      price: number;
      priceCurrency: string;
      availability: string;
      priceValidUntil?: string;
      shippingDetails?: {
        shippingRate?: { value: number; currency: string };
        deliveryTime?: {
          businessDays?: string[];
          cutoffTime?: string;
          handlingTime?: { min: number; max: number };
          transitTime?: { min: number; max: number };
        };
      };
      hasMerchantReturnPolicy?: {
        applicableCountry?: string;
        returnPolicyCategory?: string;
        merchantReturnDays?: number;
        returnMethod?: string;
        returnFees?: string;
      };
    };
    aggregateRating?: {
      ratingValue: number;
      ratingCount: number;
    };
  };
  blogList: {
    name: string;
    description?: string;
    itemList?: { url: string }[];
  };
  blogCollection: {
    name: string;
    description?: string;
    itemList?: { url: string }[];
  };
  blogPost: {
    headline: string;
    image: string;
    author: string | { name: string };
    datePublished: string;
    dateModified?: string;
    publisher?: { name: string; logo?: string };
  };
  docLibrary: {
    name: string;
    description?: string;
    itemList?: { url: string }[];
  };
  doc: {
    headline: string;
    description?: string;
    author?: string | { name: string };
    datePublished?: string;
    dateModified?: string;
  };
  videoCollection: {
    name: string;
    description?: string;
    itemList?: { url: string }[];
  };
  video: {
    name: string;
    description: string;
    thumbnailUrl: string;
    uploadDate: string;
    duration?: string;   // ISO 8601 格式，如 "PT3M20S"
    contentUrl?: string;
    embedUrl?: string;
  };
  inquiry: {
    name: string;
    description?: string;
    actionUrl: string;
  };
  policy: {
    name: string;
    description?: string;
  };
  page: {
    name: string;
    description?: string;
  };
}

export interface SeoInput<T extends PageType = PageType> {
  type: T;
  title: string;
  description: string;
  url: string;
  image?: string;
  noindex?: boolean;
  canonical?: string;
  structuredData?: StructuredDataMap[T];
}