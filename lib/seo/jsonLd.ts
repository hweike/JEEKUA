import { PageType, StructuredDataMap, SeoInput } from './types';
import { getSiteSettings } from '@/lib/getSiteSettings';
import { getHeaderConfig, getFooterConfig } from '@/lib/config-loader';
import { getImageUrl } from '@/lib/files/url';
import { getBreadcrumbLabels } from './utils/seo-helpers';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://yourdomain.com';

// 获取站点配置（站点名称、Logo、社交媒体链接等）
async function getSiteConfig(locale: string) {
  const settings = await getSiteSettings();
  const header = await getHeaderConfig(locale);
  const footer = await getFooterConfig(locale);

  const siteName = settings.siteName || 'Site Name';
  const baseUrl = (settings.websiteUrl || BASE_URL).replace(/\/$/, '');
  
  let logoUrl = getImageUrl(header.logo?.imageUrl || 'logo.png');
  
  const sameAs: string[] = [];
  if (footer.social?.visible && footer.social.links) {
    for (const link of footer.social.links) {
      if (link.url) sameAs.push(link.url);
    }
  }
  
  return { siteName, logo: logoUrl, sameAs, baseUrl, settings, header, footer };
}

// 生成 Organization 对象（用于首页和博客文章）
async function getOrganization(locale: string) {
  const { siteName, logo, sameAs, baseUrl, settings } = await getSiteConfig(locale);
  
  const allowedPlatforms = [
    'facebook',
    'youtube',
    'linkedin',
    'tiktok',
    'twitter',
    'x',
    'instagram',
  ];
  const filteredSameAs = (sameAs || []).filter((url: string) => {
    try {
      const host = new URL(url).hostname.toLowerCase();
      return allowedPlatforms.some(platform => host.includes(platform));
    } catch {
      return false;
    }
  });

  const organization: any = {
    '@type': 'Organization',
    '@id': `${baseUrl}/#organization`,
    name: siteName,
    url: baseUrl,
    logo: {
      '@type': 'ImageObject',
      url: logo,
    },
  };
  if (filteredSameAs.length > 0) {
    organization.sameAs = filteredSameAs;
  }

  if (settings.brand && settings.brand.length > 0) {
    if (settings.brand.length === 1) {
      organization.brand = { '@type': 'Brand', name: settings.brand[0] };
    } else {
      organization.brand = settings.brand.map((brandName: string) => ({
        '@type': 'Brand',
        name: brandName,
      }));
    }
  }

  if (settings.contactPhone) {
    const contactPoint: any = {
      '@type': 'ContactPoint',
      telephone: settings.contactPhone,
      contactType: 'customer service',
      availableLanguage: ['English', 'Chinese', 'Spanish', 'German', 'French', 'Japanese', 'Korean', 'Russian', 'Arabic', 'Portuguese'],
    };
    contactPoint.hoursAvailable = {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '09:00',
      closes: '18:00',
    };
    organization.contactPoint = contactPoint;
  }

  const rawCity = settings.city || '';
  const rawRegion = settings.province || '';
  const rawCountry = settings.country || '';
  const rawStreet = settings.registeredAddress || '';
  const rawPostal = settings.postalCode || '';

  const city = rawCity.split(' ')[0] || rawCity;
  const region = rawRegion.replace(/ Province$/i, '');
  const country = rawCountry === 'China' ? 'CN' : rawCountry;

  if (rawCountry || city || region || rawStreet || rawPostal) {
    const address: any = {
      '@type': 'PostalAddress',
    };
    if (country) address.addressCountry = country;
    if (city) address.addressLocality = city;
    if (region) address.addressRegion = region;
    if (rawStreet) address.streetAddress = rawStreet;
    if (rawPostal) address.postalCode = rawPostal;
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
      const siteTitle = siteName;
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

    case 'productLine': {
      const structured = input.structuredData;
      const hasGraph = structured && (structured as any)['@graph'] && Array.isArray((structured as any)['@graph']);
      if (hasGraph) {
        results.push({
          '@context': 'https://schema.org',
          '@graph': (structured as any)['@graph'],
        });
        break;
      }
      const data = structured as any;
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
      results.push(collectionPage);
      break;
    }

    // 合并 productCollection 和 productCategory
    case 'productCollection':
    case 'productCategory': {
      const structured = input.structuredData;
      const hasGraph = structured && (structured as any)['@graph'] && Array.isArray((structured as any)['@graph']);
      if (hasGraph) {
        results.push({
          '@context': 'https://schema.org',
          '@graph': (structured as any)['@graph'],
        });
        break;
      }
      const data = structured as any;
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
      results.push(collectionPage);
      break;
    }
    
    case 'blogCategory':
    case 'blogCollection':
    case 'docLibrary':
    case 'videoCollection': {
      const data = input.structuredData as any;

      // ✅ 如果配置已生成完整的 @graph，直接使用（支持 blog.config.ts 的自定义结构）
      if (data && data['@graph'] && Array.isArray(data['@graph'])) {
        results.push({
          '@context': 'https://schema.org',
          '@graph': data['@graph'],
        });
        break;
      }

      // 否则，使用默认的 CollectionPage + ItemList 结构
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

      // 博客类型添加 isPartOf
      if (input.type === 'blogCategory' || input.type === 'blogCollection') {
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

    // ==================== 商品详情页（增强） ====================
    case 'product': {
      const data = input.structuredData as any;

      // 如果配置已生成完整的 @graph，直接使用
      if (data && data['@graph'] && Array.isArray(data['@graph'])) {
        results.push({
          '@context': 'https://schema.org',
          '@graph': data['@graph'],
        });
        break;
      }

      // ---- 工具函数 ----
      function parseAttributes(attrs: any): Record<string, string> {
        if (!attrs) return {};
        if (typeof attrs === 'string') {
          try { return JSON.parse(attrs); } catch { return {}; }
        }
        return attrs;
      }

      function getVariesBy(variants: any[]): string[] {
        if (!variants || variants.length <= 1) return [];
        const allKeys = new Set<string>();
        variants.forEach((v: any) => {
          const attrs = parseAttributes(v.attributes);
          Object.keys(attrs).forEach(k => allKeys.add(k));
        });
        const variesBy: string[] = [];
        allKeys.forEach(key => {
          const values = variants.map((v: any) => parseAttributes(v.attributes)[key]);
          const uniqueValues = new Set(values);
          if (uniqueValues.size > 1) {
            variesBy.push(key);
          }
        });
        return variesBy;
      }

      // ---- 基础信息 ----
      const org = await getOrganization(locale);
      const siteTitle = siteName;
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

      // ---- 面包屑（5层） ----
      const { home, products } = await getBreadcrumbLabels(locale);
      const breadcrumbItems: any[] = [
        { position: 1, name: home, item: `${baseUrl}/${locale}` },
        { position: 2, name: products, item: `${baseUrl}/${locale}/products` },
      ];
      const hasProductLine = data._productLine && data._productLine.name;
      const hasCategory = data._category && data._category.name;
      if (hasProductLine && hasCategory) {
        const pl = data._productLine;
        const cat = data._category;
        breadcrumbItems.push({ position: 3, name: pl.name, item: `${baseUrl}/${locale}/products/${pl.slug}` });
        if (data._series && data._series.name) {
          const series = data._series;
          breadcrumbItems.push({ position: 4, name: series.name, item: `${baseUrl}/${locale}/products/${pl.slug}/${series.slug}` });
          breadcrumbItems.push({ position: 5, name: data.product_name || data.name || 'Product', item: pageUrl });
        } else {
          breadcrumbItems.push({ position: 4, name: cat.name, item: `${baseUrl}/${locale}/products/${pl.slug}/${cat.slug}` });
          breadcrumbItems.push({ position: 5, name: data.product_name || data.name || 'Product', item: pageUrl });
        }
      } else {
        breadcrumbItems.push({ position: 3, name: data.product_name || data.name || 'Product', item: pageUrl });
      }
      const breadcrumbList = {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbItems,
      };

      // ---- 商品信息 ----
      const productName = data.product_name || data.name || '';
      // 描述：直接使用已有字段，不硬编码生成
      const productDescription = data.short_description || data.description || '';

      // ✅ 使用 getImageUrl 统一处理图片
      const productImage = data.image ? getImageUrl(data.image) : '';
      const productImageArray = productImage ? [productImage] : [];

      const productSku = data.sku || '';
      const productBrand = data.brand || '';

      // 价格和库存
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
      // 父级库存：默认有库存，除非明确标记为缺货
      const availability = data.availability !== 'out_of_stock'
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock';

      // ---- 变体处理 ----
      const variants = data.variants || [];
      const hasMultipleVariants = variants.length > 1;

      if (hasMultipleVariants) {
        const variesBy = getVariesBy(variants);

        const productGroup: any = {
          '@type': 'ProductGroup',
          '@id': `${pageUrl}#productgroup`,
          productGroupID: productSku,
          name: productName,
          description: productDescription,
          brand: productBrand ? { '@type': 'Brand', name: productBrand } : undefined,
          variesBy: variesBy,
          hasVariant: variants.map((v: any) => {
            const variantName = v.product_name || v.sku || productName;
            // ✅ 使用 getImageUrl 处理变体图片
            const variantImage = v.main_image_url ? getImageUrl(v.main_image_url) : productImage;
            let vPrice = v.price;
            if (vPrice === undefined || vPrice === null) {
              const vTiers = v.price_tiers || [];
              if (vTiers.length > 0 && vTiers[0].price !== undefined) {
                vPrice = vTiers[0].price;
              } else {
                vPrice = price;
              }
            }
            const vCurrency = v.currency || currency;
            // ✅ 变体库存：与父级逻辑一致，默认有库存
            const vAvailability = v.availability !== 'out_of_stock'
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock';
            return {
              '@type': 'Product',
              name: variantName,
              sku: v.sku || '',
              image: variantImage,
              offers: {
                '@type': 'Offer',
                price: vPrice.toString(),
                priceCurrency: vCurrency,
                availability: vAvailability,
              },
            };
          }),
        };
        if (data.aggregateRating && data.aggregateRating.ratingValue) {
          productGroup.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: data.aggregateRating.ratingValue,
            reviewCount: data.aggregateRating.reviewCount || 0,
            bestRating: 5,
          };
        }
        const graph: any[] = [org, website, breadcrumbList, productGroup];
        results.push({
          '@context': 'https://schema.org',
          '@graph': graph,
        });
      } else {
        // 单个产品
        const product: any = {
          '@type': 'Product',
          '@id': `${pageUrl}#product`,
          name: productName,
          image: productImageArray,
          description: productDescription,
          sku: productSku,
          mpn: productSku,
          brand: productBrand ? { '@type': 'Brand', name: productBrand } : undefined,
          offers: {
            '@type': 'Offer',
            url: pageUrl,
            price: price.toString(),
            priceCurrency: currency,
            availability: availability,
          },
        };
        if (data.aggregateRating && data.aggregateRating.ratingValue) {
          product.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: data.aggregateRating.ratingValue,
            reviewCount: data.aggregateRating.reviewCount || 0,
            bestRating: 5,
          };
        }
        const graph: any[] = [org, website, breadcrumbList, product];
        results.push({
          '@context': 'https://schema.org',
          '@graph': graph,
        });
      }
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
  return results.map(obj => JSON.stringify(obj));
}

export { getSiteConfig, getOrganization };