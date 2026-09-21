// app/[locale]/product/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { Suspense, cache } from 'react';
import { injectRuntimeDataSafe } from '@/lib/webbuilder/runtime-injector';
import { TemplateRenderer } from '@/components/webbuilder/TemplateRenderer';
import { getProductUrlPattern } from '@/lib/products/productSettings';
import { getProductSettings } from '@/lib/products/services/product-settings.service';
import { withDynamicLocale } from '@/lib/withPageLocale';
import { getSeoInput } from '@/lib/seo/getSeoInput';
import { generatePageMetadata } from '@/lib/seo';
import { getSiteSettings } from '@/lib/getSiteSettings';
import { getCachedProductPageData } from '@/lib/seo/utils/catalog-data';
import { getLayoutPageByTemplate } from '@/lib/pages/storage';
import ProductLoading from './loading';

const DEFAULT_PRODUCT_TEMPLATE_ID = 'default_product_published';

// ===== 缓存函数 =====
const getCachedUrlPattern = unstable_cache(
  async (locale: string) => getProductUrlPattern(locale),
  ['product-url-pattern'],
  { revalidate: 3600 }
);

const getCachedProductSettings = unstable_cache(
  async (locale: string) => getProductSettings(locale),
  ['product-settings'],
  { revalidate: 3600 }
);

// ===== SEO 数据获取（缓存 + React cache 去重） =====
async function fetchProductSeoData(locale: string, slug: string, preloadedData?: any) {
  try {
    const data = preloadedData || (await getCachedProductPageData(locale, slug));
    if (!data) return null;
    const productDataForSeo = {
      ...data.product,
      _productLine: data.productLine,
      _category: data.category,
      _series: data.series,
    };
    const seoInput = await getSeoInput('product', slug, locale, productDataForSeo);
    if (!seoInput) return null;
    const { metadata, jsonLdScripts } = await generatePageMetadata(seoInput, locale);
    return { seoInput, metadata, jsonLdScripts };
  } catch (error) {
    console.error('[SEO] fetchProductSeoData 失败:', error);
    return null;
  }
}

// ✅ React cache：同一请求内只执行一次
const fetchProductSeoDataOnce = cache(fetchProductSeoData);

// ===== generateMetadata =====
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const settings = await getSiteSettings();
  const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(
    /\/+$/,
    ''
  );
  const siteName = settings.siteName || 'Site Name';

  const canonical = `${baseUrl}/${locale}/product/${slug}`;
  const fallbackTitle = `${slug.replace(/-/g, ' ')} | ${siteName}`;
  const fallbackDescription = `Product details for ${slug.replace(/-/g, ' ')}`;

  const seoData = await fetchProductSeoDataOnce(locale, slug);
  if (!seoData) {
    return {
      title: fallbackTitle,
      description: fallbackDescription,
      robots: 'noindex, follow',
      alternates: { canonical },
      openGraph: {
        title: fallbackTitle,
        description: fallbackDescription,
        url: canonical,
        siteName,
        locale,
        type: 'website',
        images: [{ url: `${baseUrl}/default-og.jpg`, width: 1200, height: 630 }],
      },
      twitter: {
        card: 'summary_large_image',
        site: '@feismanpower',
        title: fallbackTitle,
        description: fallbackDescription,
        images: [`${baseUrl}/default-og.jpg`],
      },
    };
  }

  const { metadata, seoInput } = seoData;
  const canonicalPath = seoInput.canonical || seoInput.url || `/${locale}/product/${slug}`;
  const canonicalUrl = canonicalPath.startsWith('http')
    ? canonicalPath
    : `${baseUrl}${canonicalPath.startsWith('/') ? '' : '/'}${canonicalPath}`;

  return {
    ...metadata,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      ...metadata.openGraph,
      locale,
      url: metadata.openGraph?.url || canonicalUrl,
    },
  };
}

// ===== 内容组件 =====
interface ProductContentProps {
  locale: string;
  slug: string;
  productData: any;
  urlPattern: string;
  storeLinks: any[];
}

async function ProductContent({
  locale,
  slug,
  productData,
  urlPattern,
  storeLinks,
}: ProductContentProps) {
  const { product, productLine, category, series } = productData;

  const fullProduct = {
    ...product,
    templateId: product.templateId || DEFAULT_PRODUCT_TEMPLATE_ID,
    _indexData: {
      status: product.status || 'published',
      updatedAt: product.updatedAt || new Date().toISOString(),
    },
  };

  const templateId = fullProduct.templateId || DEFAULT_PRODUCT_TEMPLATE_ID;

  // ✅ 用 getLayoutPageByTemplate 替代本地 getCachedLayout
  let layoutPage = await getLayoutPageByTemplate('base', templateId);

  if (!layoutPage && templateId !== DEFAULT_PRODUCT_TEMPLATE_ID) {
    console.warn(`[ProductContent] 模板 ${templateId} 不存在，回退到默认模板`);
    layoutPage = await getLayoutPageByTemplate('base', DEFAULT_PRODUCT_TEMPLATE_ID);
  }

  const templateData = layoutPage?.templateData; // ✅ 驼峰
  const hasValidTemplate =
    templateData && Array.isArray(templateData.content) && templateData.content.length > 0;

  if (!layoutPage || !hasValidTemplate) {
    return (
      <div
        className="text-center"
        style={{
          maxWidth: '1280px',
          marginLeft: 'auto',
          marginRight: 'auto',
          paddingLeft: 'var(--spacing-4, 1rem)',
          paddingRight: 'var(--spacing-4, 1rem)',
          paddingTop: 'var(--spacing-12, 3rem)',
          paddingBottom: 'var(--spacing-12, 3rem)',
        }}
      >
        <div
          style={{
            fontSize: 'var(--font-size-4xl, 2.25rem)',
            marginBottom: 'var(--spacing-4, 1rem)',
          }}
        >
          📄
        </div>
        <h1
          style={{
            fontSize: 'var(--font-size-2xl, 1.5rem)',
            fontWeight: 'var(--font-weight-semibold, 600)',
            color: 'var(--foreground, #0f172a)',
            marginBottom: 'var(--spacing-2, 0.5rem)',
          }}
        >
          产品详情页尚未配置模板
        </h1>
        <p
          style={{
            color: 'var(--muted-foreground, #64748b)',
            fontSize: 'var(--font-size-base, 1rem)',
          }}
        >
          模板 ID: {templateId}
        </p>
      </div>
    );
  }

  // ✅ 移除 texts 相关；SEO 用 Once 版本（同请求内只算一次）
  const seoData = await fetchProductSeoDataOnce(locale, slug, productData);
  const jsonLdScripts = seoData?.jsonLdScripts || [];
  const seoTitle = seoData?.seoInput?.title || product.product_name || '';

  const runtimeData = {
    product: fullProduct,
    productLine,
    category,
    series,
    locale,
    urlPattern,
    storeLinks,
    seoTitle,
  };
  const finalRuntime = { ...runtimeData, locale }; // ✅ 去掉 texts

  let finalData = injectRuntimeDataSafe(templateData, finalRuntime);
  if (!finalData.__runtime) {
    (finalData as any).__runtime = finalRuntime;
    if (finalData.content && Array.isArray(finalData.content)) {
      finalData.content = finalData.content.map((node: any) => ({
        ...node,
        __runtime: finalRuntime,
        props: { ...node.props, __runtime: finalRuntime },
      }));
    }
  }

  return (
    <>
      {jsonLdScripts.length > 0 &&
        jsonLdScripts.map((script, idx) => (
          <script
            key={idx}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: script }}
          />
        ))}
      <TemplateRenderer data={finalData} runtime={finalRuntime} />
    </>
  );
}

// ===== 页面组件 =====
interface ProductDetailPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { locale, slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const productData = await getCachedProductPageData(locale, decodedSlug);
  if (!productData) {
    notFound();
  }

  const [urlPattern, productSettings] = await Promise.all([
    getCachedUrlPattern(locale),
    getCachedProductSettings(locale),
  ]);

  const storeLinks = productSettings?.defaultSettings?.storeLinks || [];

  return (
    <Suspense fallback={<ProductLoading />}>
      <ProductContent
        locale={locale}
        slug={decodedSlug}
        productData={productData}
        urlPattern={urlPattern}
        storeLinks={storeLinks}
      />
    </Suspense>
  );
}

export const revalidate = 3600;
export default withDynamicLocale(ProductDetailPage);