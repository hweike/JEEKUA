// lib/seo/page-type-registry.ts
import { PageType } from './types';
import { getPageIdBySlug, readPage } from '@/lib/pages/storage';
import { getSiteSettings } from '@/lib/getSiteSettings';
import { getHeaderConfig, getFooterConfig } from '@/lib/config-loader';
// import { getProductLineBySlug } from '@/lib/productLines/storage';
// import { getCategoryBySlug } from '@/lib/products/categories';
// import { getProductBySlug } from '@/lib/products/storage';
// import { getBlogIndex, getBlogPostBySlug } from '@/lib/blog/storage';
// import { getDocBySlug } from '@/lib/docs/storage';
// import { getVideoBySlug } from '@/lib/videos/storage';
// 
// 注意：以下模块暂时不存在于项目中，需要根据实际业务创建
// 为保持结构完整，暂时提供空实现，并在运行时抛出错误或返回 null
// 如果不需要这些功能，可以注释或删除对应的注册条目

// 博客分类功能（暂不可用）
async function getBlogCategoryBySlug(locale: string, slug: string) {
  console.warn(`[SEO] getBlogCategoryBySlug not implemented for slug: ${slug}`);
  return null;
}

// 文档库功能（暂不可用）
async function getDocLibraryBySlug(locale: string, slug: string) {
  console.warn(`[SEO] getDocLibraryBySlug not implemented for slug: ${slug}`);
  return null;
}

// 视频合集功能（暂不可用）
async function getVideoCollectionBySlug(locale: string, slug: string) {
  console.warn(`[SEO] getVideoCollectionBySlug not implemented for slug: ${slug}`);
  return null;
}

export type PageDataFetcher<T = any> = (slug: string, locale: string) => Promise<T | null>;

export interface PageTypeConfig<T = any> {
  type: PageType;
  getDataFetcher: () => PageDataFetcher<T>;
  mapToStructuredData: (data: T, locale: string) => any;
  getTitle?: (data: T, locale: string) => string;
  getDescription?: (data: T, locale: string) => string;
  getImage?: (data: T, locale: string) => string;
  getNoindex?: (data: T) => boolean;
  getCanonical?: (data: T, baseUrl: string, locale: string) => string | undefined;
}

// 辅助函数：从 pages 存储中获取页面数据（包含 SEO 字段）
async function getPageDataFromStorage(locale: string, slug: string) {
  const pageId = await getPageIdBySlug(locale, slug);
  if (!pageId) return null;
  return await readPage(locale, pageId);
}

export const pageTypeRegistry: Record<string, PageTypeConfig> = {
  // ==================== 首页 ====================
  home: {
    type: 'home',
    getDataFetcher: () => async (slug, locale) => {
      const pageData = await getPageDataFromStorage(locale, 'home');
      const settings = await getSiteSettings();
      const header = await getHeaderConfig(locale);
      const footer = await getFooterConfig(locale);

      const seoTitle = pageData?.seo_title || settings.homeSeoTitle || settings.siteName;
      const seoDescription = pageData?.seo_description || settings.homeSeoDescription || `${settings.siteName} - 官方网站`;
      const seoKeywords = pageData?.seo_keywords || settings.homeSeoKeywords || '';

      return {
        title: pageData?.title || '首页',
        seoTitle,
        seoDescription,
        seoKeywords,
        siteName: settings.siteName,
        websiteUrl: settings.websiteUrl,
        contactPhone: settings.contactPhone,
        companyName: settings.companyName,
        country: settings.country,
        registeredAddress: settings.registeredAddress,
        city: settings.city,
        province: settings.province,
        postalCode: settings.postalCode,
        brand: settings.brand || [],
        logo: header.logo,
        sameAs: (footer.social?.links || [])
          .filter((link: any) => link.url && link.url.trim() !== '')
          .map((link: any) => link.url),
      };
    },
    mapToStructuredData: (data, locale) => ({
      siteName: data.siteName,
      websiteUrl: data.websiteUrl,
      contactPhone: data.contactPhone,
      companyName: data.companyName,
      country: data.country,
      registeredAddress: data.registeredAddress,
      city: data.city,
      province: data.province,
      postalCode: data.postalCode,
      brand: data.brand,
      logo: data.logo,
      sameAs: data.sameAs,
      locale,
    }),
    getTitle: (data) => data.seoTitle,
    getDescription: (data) => data.seoDescription,
    getImage: (data) => data.logo?.imageUrl || '/default-og.jpg',
  },

  // ==================== 普通页面 ====================
  page: {
    type: 'page',
    getDataFetcher: () => async (slug, locale) => {
      const pageData = await getPageDataFromStorage(locale, slug);
      if (!pageData) return null;
      return {
        title: pageData.title,
        seoTitle: pageData.seo_title || pageData.title,
        seoDescription: pageData.seo_description || '',
        seoKeywords: pageData.seo_keywords || '',
        noindex: pageData.visible !== 'visible',
        canonical: pageData.canonical_url,
        image: pageData.image,
      };
    },
    mapToStructuredData: () => ({}),
    getTitle: (data) => data.seoTitle,
    getDescription: (data) => data.seoDescription,
    getImage: (data) => data.image,
    getNoindex: (data) => data.noindex,
    getCanonical: (data) => data.canonical,
  },

  // ==================== 政策页面 ====================
  policy: {
    type: 'policy',
    getDataFetcher: () => async (slug, locale) => {
      const pageData = await getPageDataFromStorage(locale, slug);
      if (!pageData) return null;
      return {
        title: pageData.title,
        seoTitle: pageData.seo_title || pageData.title,
        seoDescription: pageData.seo_description || '',
        seoKeywords: pageData.seo_keywords || '',
        noindex: pageData.visible !== 'visible',
        canonical: pageData.canonical_url,
        image: pageData.image,
      };
    },
    mapToStructuredData: () => ({}),
    getTitle: (data) => data.seoTitle,
    getDescription: (data) => data.seoDescription,
    getImage: (data) => data.image,
    getNoindex: (data) => data.noindex,
    getCanonical: (data) => data.canonical,
  },

  // ==================== 产品线落地页 ====================
  productLine: {
    type: 'productLine',
    getDataFetcher: () => async (slug, locale) => {
      return getProductLineBySlug(locale, slug);
    },
    mapToStructuredData: (productLine) => ({
      name: productLine.name,
      description: productLine.description,
      numberOfItems: productLine.productCount,
      itemList: productLine.products?.map((p: any) => ({ url: p.url })) || [],
    }),
    getTitle: (productLine) => productLine.seo_title || productLine.name,
    getDescription: (productLine) => productLine.seo_description || productLine.description,
    getImage: (productLine) => productLine.image,
  },

  // ==================== 产品合集（分类页） ====================
  productCollection: {
    type: 'productCollection',
    getDataFetcher: () => async (slug, locale) => {
      return getCategoryBySlug(locale, slug);
    },
    mapToStructuredData: (category) => ({
      name: category.name,
      description: category.description,
      numberOfItems: category.productCount,
      itemList: category.products?.map((p: any) => ({ url: p.url })) || [],
    }),
    getTitle: (category) => category.seo_title || category.name,
    getDescription: (category) => category.seo_description || category.description,
    getImage: (category) => category.image,
  },

  // ==================== 产品详情页 ====================
  product: {
    type: 'product',
    getDataFetcher: () => async (slug, locale) => {
      return getProductBySlug(locale, slug);
    },
    mapToStructuredData: (product) => {
      const structured: any = {
        name: product.product_name,
        image: product.main_image_url,
        description: product.description || product.short_description,
        sku: product.sku,
        brand: product.brand,
        offers: product.price
          ? {
              price: product.price,
              priceCurrency: product.currency,
              availability: product.availability === 'in_stock'
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
              priceValidUntil: product.priceValidUntil,
              shippingDetails: product.shippingDetails,
              hasMerchantReturnPolicy: product.returnPolicy,
            }
          : undefined,
        aggregateRating: product.aggregateRating,
      };
      return structured;
    },
    getTitle: (product) => product.seo_title || product.product_name,
    getDescription: (product) => product.seo_description || product.short_description,
    getImage: (product) => product.main_image_url,
    getNoindex: (product) => product.noindex,
    getCanonical: (product) => product.canonical_url,
  },

  // ==================== 博客落地页（博客首页） ====================
  blogList: {
    type: 'blogList',
    getDataFetcher: () => async (slug, locale) => {
      return getBlogIndex(locale, slug);
    },
    mapToStructuredData: (blogIndex) => ({
      name: blogIndex.name,
      description: blogIndex.description,
      itemList: blogIndex.posts?.map((post: any) => ({ url: post.url })) || [],
    }),
    getTitle: (blogIndex) => blogIndex.seo_title || blogIndex.name,
    getDescription: (blogIndex) => blogIndex.seo_description || blogIndex.description,
    getImage: (blogIndex) => blogIndex.image,
  },

  // ==================== 博客合集（分类/标签页） ====================
  // 注意：getBlogCategoryBySlug 为临时空实现，请根据实际业务替换
  blogCollection: {
    type: 'blogCollection',
    getDataFetcher: () => async (slug, locale) => {
      const category = await getBlogCategoryBySlug(locale, slug);
      if (!category) return null;
      return category;
    },
    mapToStructuredData: (category) => ({
      name: category.name,
      description: category.description,
      itemList: category.posts?.map((post: any) => ({ url: post.url })) || [],
    }),
    getTitle: (category) => category.seo_title || category.name,
    getDescription: (category) => category.seo_description || category.description,
    getImage: (category) => category.image,
  },

  // ==================== 博客文章 ====================
  blogPost: {
    type: 'blogPost',
    getDataFetcher: () => async (slug, locale) => {
      return getBlogPostBySlug(locale, slug);
    },
    mapToStructuredData: (post) => ({
      headline: post.title,
      image: post.featured_image,
      author: post.author,
      datePublished: post.created_at,
      dateModified: post.updated_at,
      publisher: post.publisher,
    }),
    getTitle: (post) => post.seo_title || post.title,
    getDescription: (post) => post.seo_description || post.excerpt,
    getImage: (post) => post.featured_image,
    getNoindex: (post) => post.noindex,
    getCanonical: (post) => post.canonical_url,
  },

  // ==================== 文档库 ====================
  docLibrary: {
    type: 'docLibrary',
    getDataFetcher: () => async (slug, locale) => {
      return getDocLibraryBySlug(locale, slug);
    },
    mapToStructuredData: (library) => ({
      name: library.name,
      description: library.description,
      itemList: library.docs?.map((doc: any) => ({ url: doc.url })) || [],
    }),
    getTitle: (library) => library.seo_title || library.name,
    getDescription: (library) => library.seo_description || library.description,
    getImage: (library) => library.image,
  },

  // ==================== 文档页面（技术文章） ====================
  doc: {
    type: 'doc',
    getDataFetcher: () => async (slug, locale) => {
      return getDocBySlug(locale, slug);
    },
    mapToStructuredData: (doc) => ({
      headline: doc.title,
      description: doc.description,
      author: doc.author,
      datePublished: doc.published_at,
      dateModified: doc.updated_at,
    }),
    getTitle: (doc) => doc.seo_title || doc.title,
    getDescription: (doc) => doc.seo_description || doc.description,
    getImage: (doc) => doc.image,
    getNoindex: (doc) => doc.noindex,
    getCanonical: (doc) => doc.canonical_url,
  },

  // ==================== 视频合集 ====================
  videoCollection: {
    type: 'videoCollection',
    getDataFetcher: () => async (slug, locale) => {
      return getVideoCollectionBySlug(locale, slug);
    },
    mapToStructuredData: (collection) => ({
      name: collection.name,
      description: collection.description,
      itemList: collection.videos?.map((video: any) => ({ url: video.url })) || [],
    }),
    getTitle: (collection) => collection.seo_title || collection.name,
    getDescription: (collection) => collection.seo_description || collection.description,
    getImage: (collection) => collection.thumbnail,
  },

  // ==================== 视频页面 ====================
  video: {
    type: 'video',
    getDataFetcher: () => async (slug, locale) => {
      return getVideoBySlug(locale, slug);
    },
    mapToStructuredData: (video) => ({
      name: video.title,
      description: video.description,
      thumbnailUrl: video.thumbnail,
      uploadDate: video.upload_date,
      duration: video.duration,
      contentUrl: video.content_url,
      embedUrl: video.embed_url,
    }),
    getTitle: (video) => video.seo_title || video.title,
    getDescription: (video) => video.seo_description || video.description,
    getImage: (video) => video.thumbnail,
    getNoindex: (video) => video.noindex,
    getCanonical: (video) => video.canonical_url,
  },

  // ==================== 询盘表单页 ====================
  inquiry: {
    type: 'inquiry',
    getDataFetcher: () => async (_slug, locale) => {
      const settings = await getSiteSettings();
      return {
        name: '联系我们',
        description: '填写表单获取产品报价与技术支持',
        actionUrl: `${settings.websiteUrl}/api/inquiry`,
      };
    },
    mapToStructuredData: (data) => ({
      name: data.name,
      description: data.description,
      actionUrl: data.actionUrl,
    }),
    getTitle: () => '联系我们 - 询价与咨询',
    getDescription: () => '填写在线表单，获取产品或服务的专业报价及咨询。我们将在24小时内回复您。',
    getImage: () => '/contact-og.jpg',
  },
};