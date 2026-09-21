// lib/seo/types.ts

export type PageType =
  | 'home'
  | 'productLine'
  | 'productCategory'
  | 'productCollection'
  | 'product'
  | 'page'
  | 'blogCategory'
  | 'blogList'
  | 'blogCollection'
  | 'blogPost'
  | 'videoCategory'   // ✅ 新增
  | 'videoCollection' // ✅ 新增
  | 'videoDetail'     // ✅ 新增
  | 'docLibrary'
  | 'doc'
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
  productCategory: {
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
  blogCategory: {        // 新增：博客首页结构化数据
    name: string;
    description?: string;
    numberOfItems?: number;
    itemList?: { url: string }[];
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
    duration?: string;
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

export interface ExtendedSiteSettings {
  siteName?: string;
  websiteUrl?: string;
  contactPhone?: string;
  companyName?: string;
  country?: string;
  registeredAddress?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  brand?: any[];
  homeSeoTitle?: string;
  homeSeoDescription?: string;
  homeSeoKeywords?: string;
  socialShareImage?: string;
  [key: string]: any;
}

export interface ExtendedPageData {
  title?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  visible?: string;
  canonical_url?: string;
  image?: string;
  [key: string]: any;
}

// 数据获取器：返回特定数据结构
export type PageDataFetcher<TData = any> = (slug: string, locale: string) => Promise<TData | null>;

// 页面配置：页面类型和数据对象类型分离
export interface PageTypeConfig<TPage extends PageType = PageType, TData = any> {
  type: TPage;
  getDataFetcher: () => PageDataFetcher<TData>;
  mapToStructuredData: (data: TData, locale: string) => any;
  getTitle?: (data: TData, locale: string) => string;
  getDescription?: (data: TData, locale: string) => string;
  getImage?: (data: TData, locale: string) => string;
  getNoindex?: (data: TData) => boolean;
  getCanonical?: (data: TData, baseUrl: string, locale: string) => string | undefined;
}