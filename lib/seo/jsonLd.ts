// lib/seo/jsonLd.ts
import { PageType, StructuredDataMap, SeoInput } from './types';
import { getSiteSettings } from '@/lib/getSiteSettings';
import { getHeaderConfig, getFooterConfig } from '@/lib/config-loader';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://yourdomain.com';

// 获取站点配置（站点名称、Logo、社交媒体链接等）
async function getSiteConfig(locale: string) {
  const settings = await getSiteSettings();
  const header = await getHeaderConfig(locale);
  const footer = await getFooterConfig(locale);

  const siteName = settings.siteName || 'Site Name';
  const baseUrl = (settings.websiteUrl || BASE_URL).replace(/\/$/, '');
  
  let logoUrl = `${baseUrl}/logo.png`;
  let logoWidth: number | undefined;
  let logoHeight: number | undefined;
  
  if (header.logo?.imageUrl) {
    logoUrl = header.logo.imageUrl.startsWith('http')
      ? header.logo.imageUrl
      : `${baseUrl}${header.logo.imageUrl}`;
    logoWidth = header.logo.width;
    logoHeight = header.logo.height;
  }
  
  const sameAs: string[] = [];
  if (footer.social?.visible && footer.social.links) {
    for (const link of footer.social.links) {
      if (link.url) sameAs.push(link.url);
    }
  }
  
  return { siteName, logo: logoUrl, logoWidth, logoHeight, sameAs, baseUrl, settings, header, footer };
}

// 生成 Organization 对象（用于首页和博客文章）
async function getOrganization(locale: string) {
  const { siteName, logo, logoWidth, logoHeight, sameAs, baseUrl, settings } = await getSiteConfig(locale);
  
  const organization: any = {
  '@type': 'Organization',
  '@id': `${baseUrl}/#organization`,
  name: siteName,
  url: baseUrl,
  logo: (() => {
    const logoObj: any = {
      '@type': 'ImageObject',
      url: logo,
    };
    if (logoWidth !== undefined) logoObj.width = logoWidth;
    if (logoHeight !== undefined) logoObj.height = logoHeight;
    return logoObj;
  })(),
  sameAs: sameAs,
  };
  
  // 添加品牌（支持多个品牌）
  if (settings.brand && settings.brand.length > 0) {
    if (settings.brand.length === 1) {
      organization.brand = {
        '@type': 'Brand',
        name: settings.brand[0],
      };
    } else {
      organization.brand = settings.brand.map((brandName: string) => ({
        '@type': 'Brand',
        name: brandName,
      }));
    }
  }
  
  // 添加联系信息
  if (settings.contactPhone) {
    const contactPoint: any = {
      '@type': 'ContactPoint',
      telephone: settings.contactPhone,
      contactType: 'customer service',
      availableLanguage: ['English', 'Chinese', 'Spanish', 'German', 'French', 'Japanese', 'Korean', 'Russian', 'Arabic', 'Portuguese'],
    };
    
    // 添加工作时间（可根据实际需求调整）
    contactPoint.hoursAvailable = {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '09:00',
      closes: '18:00',
    };
    
    organization.contactPoint = contactPoint;
  }
  
  // 添加地址信息
  if (settings.country || settings.city || settings.registeredAddress) {
    const address: any = {
      '@type': 'PostalAddress',
    };
    if (settings.country) address.addressCountry = settings.country;
    if (settings.city) address.addressLocality = settings.city;
    if (settings.province) address.addressRegion = settings.province;
    if (settings.registeredAddress) address.streetAddress = settings.registeredAddress;
    if (settings.postalCode) address.postalCode = settings.postalCode;
    organization.address = address;
  }
  
  return organization;
}

// 主生成函数
export async function generateJsonLd<T extends PageType>(
  input: SeoInput<T>,
  locale: string
): Promise<string[]> {
  const results: any[] = [];
  const pageUrl = input.canonical || input.url;
  const { baseUrl, siteName, settings } = await getSiteConfig(locale);

  switch (input.type) {
    case 'home': {
      const org = await getOrganization(locale);
      
      // 获取站点名称（优先使用 SeoInput 中的标题）
      const siteTitle = input.title || siteName;
      
      // 构建搜索 URL 模板（支持多语言）
      const searchUrlTemplate = `${baseUrl}/${locale}/search?q={search_term_string}`;
      
      const website = {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        url: baseUrl,
        name: siteTitle,
        publisher: {
          '@id': `${baseUrl}/#organization`,
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: searchUrlTemplate,
          },
          'query-input': 'required name=search_term_string',
        },
      };
      
      results.push({
        '@context': 'https://schema.org',
        '@graph': [org, website],
      });
      break;
    }

    case 'productLine':
    case 'productCollection':
    case 'blogList':
    case 'blogCollection':
    case 'docLibrary':
    case 'videoCollection': {
      const data = input.structuredData as any;
      const itemList = data?.itemList?.length
        ? {
            '@type': 'ItemList',
            '@id': `${pageUrl}#itemlist`,
            numberOfItems: data.numberOfItems || data.itemList.length,
            itemListElement: data.itemList.map((item: any, idx: number) => ({
              '@type': 'ListItem',
              position: idx + 1,
              url: item.url,
            })),
          }
        : undefined;

      const collectionPage: any = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        '@id': `${pageUrl}#collectionpage`,
        name: input.title,
        description: input.description,
        url: pageUrl,
      };
      if (itemList) collectionPage.mainEntity = itemList;

      // 博客集合页额外关联 Blog 对象
      if (input.type === 'blogList' || input.type === 'blogCollection') {
        collectionPage.isPartOf = {
          '@type': 'Blog',
          '@id': `${baseUrl}/blog#blog`,
          name: `${siteName} 博客`,
          url: `${baseUrl}/blog`,
        };
      }
      results.push(collectionPage);
      break;
    }

    case 'product': {
      const data = input.structuredData as StructuredDataMap['product'];
      const product: any = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: data.name,
        image: Array.isArray(data.image) ? data.image : [data.image],
        description: data.description,
        sku: data.sku,
        brand: data.brand ? { '@type': 'Brand', name: data.brand } : undefined,
      };
      if (data.offers) {
        const offer: any = {
          '@type': 'Offer',
          url: pageUrl,
          priceCurrency: data.offers.priceCurrency,
          price: data.offers.price,
          priceValidUntil: data.offers.priceValidUntil,
          availability: data.offers.availability,
        };
        // 可选：配送信息
        if (data.offers.shippingDetails) {
          offer.shippingDetails = {
            '@type': 'OfferShippingDetails',
            shippingRate: data.offers.shippingDetails.shippingRate
              ? {
                  '@type': 'MonetaryAmount',
                  value: data.offers.shippingDetails.shippingRate.value,
                  currency: data.offers.shippingDetails.shippingRate.currency,
                }
              : undefined,
            deliveryTime: data.offers.shippingDetails.deliveryTime
              ? {
                  '@type': 'ShippingDeliveryTime',
                  businessDays: data.offers.shippingDetails.deliveryTime.businessDays
                    ? {
                        '@type': 'OpeningHoursSpecification',
                        dayOfWeek: data.offers.shippingDetails.deliveryTime.businessDays,
                      }
                    : undefined,
                  cutoffTime: data.offers.shippingDetails.deliveryTime.cutoffTime,
                  handlingTime: data.offers.shippingDetails.deliveryTime.handlingTime
                    ? {
                        min: data.offers.shippingDetails.deliveryTime.handlingTime.min,
                        max: data.offers.shippingDetails.deliveryTime.handlingTime.max,
                      }
                    : undefined,
                  transitTime: data.offers.shippingDetails.deliveryTime.transitTime
                    ? {
                        min: data.offers.shippingDetails.deliveryTime.transitTime.min,
                        max: data.offers.shippingDetails.deliveryTime.transitTime.max,
                      }
                    : undefined,
                }
              : undefined,
          };
        }
        if (data.offers.hasMerchantReturnPolicy) {
          offer.hasMerchantReturnPolicy = {
            '@type': 'MerchantReturnPolicy',
            applicableCountry: data.offers.hasMerchantReturnPolicy.applicableCountry,
            returnPolicyCategory: data.offers.hasMerchantReturnPolicy.returnPolicyCategory,
            merchantReturnDays: data.offers.hasMerchantReturnPolicy.merchantReturnDays,
            returnMethod: data.offers.hasMerchantReturnPolicy.returnMethod,
            returnFees: data.offers.hasMerchantReturnPolicy.returnFees,
          };
        }
        product.offers = offer;
      }
      if (data.aggregateRating) {
        product.aggregateRating = {
          '@type': 'AggregateRating',
          ratingValue: data.aggregateRating.ratingValue,
          ratingCount: data.aggregateRating.ratingCount,
        };
      }
      results.push(product);
      break;
    }

    case 'blogPost': {
      const data = input.structuredData as StructuredDataMap['blogPost'];
      const org = await getOrganization(locale);
      const publisher = data.publisher || {
        name: org.name,
        logo: org.logo,
      };
      results.push({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: data.headline,
        description: input.description,
        image: data.image,
        author:
          typeof data.author === 'string'
            ? { '@type': 'Person', name: data.author }
            : data.author,
        publisher: {
          '@type': 'Organization',
          name: publisher.name,
          logo: publisher.logo,
        },
        datePublished: data.datePublished,
        dateModified: data.dateModified || data.datePublished,
      });
      break;
    }

    case 'doc': {
      const data = input.structuredData as StructuredDataMap['doc'];
      const author = data.author
        ? typeof data.author === 'string'
          ? { '@type': 'Organization', name: data.author }
          : data.author
        : await getOrganization(locale);
      results.push({
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: data.headline,
        description: data.description || input.description,
        author,
        datePublished: data.datePublished,
        dateModified: data.dateModified,
      });
      break;
    }

    case 'video': {
      const data = input.structuredData as StructuredDataMap['video'];
      const videoObj: any = {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: data.name,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl,
        uploadDate: data.uploadDate,
      };
      if (data.duration) videoObj.duration = data.duration;
      if (data.contentUrl) videoObj.contentUrl = data.contentUrl;
      if (data.embedUrl) videoObj.embedUrl = data.embedUrl;
      results.push(videoObj);
      break;
    }

    case 'inquiry': {
      const data = input.structuredData as StructuredDataMap['inquiry'];
      results.push({
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        name: data.name,
        description: data.description || input.description,
        url: pageUrl,
        potentialAction: {
          '@type': 'SendAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: data.actionUrl,
            actionPlatform: ['http://schema.org/DesktopWebPlatform', 'http://schema.org/MobileWebPlatform'],
          },
        },
      });
      break;
    }

    case 'policy':
    case 'page':
    default: {
      const pageType = input.type === 'policy' ? 'WebPage' : 'WebPage';
      results.push({
        '@context': 'https://schema.org',
        '@type': pageType,
        name: input.title,
        description: input.description,
        url: pageUrl,
      });
      break;
    }
  }
  // 返回字符串数组，每个元素为完整的 JSON 字符串
  return results.map(obj => JSON.stringify(obj));
}