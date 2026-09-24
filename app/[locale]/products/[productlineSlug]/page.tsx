// app/[locale]/products/[productlineSlug]/page.tsx

import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { Suspense, cache } from 'react';
import { injectRuntimeDataSafe } from '@/lib/webbuilder/runtime-injector';
import { TemplateRenderer } from '@/components/webbuilder/TemplateRenderer';
import { fetchProductLineRuntime } from '@/lib/webbuilder/product-line-helpers';
import { withDynamicLocale } from '@/lib/withPageLocale';
import { getSeoInput } from '@/lib/seo/getSeoInput';
import { generatePageMetadata } from '@/lib/seo';
import { getSiteSettings } from '@/lib/getSiteSettings';
import { getLayoutPageByTemplate } from '@/lib/pages/storage';
import ProductLineLoading from './loading';

const DEFAULT_PRODUCT_LINE_TEMPLATE_ID = 'default_product_line_published';

// ===== 缓存：产品线运行时数据 =====
const getCachedProductLineRuntime = unstable_cache(
  async (
    locale: string,
    slug: string,
    page: number,
    pageSize: number,
    includeChildren: boolean
  ) => {
    return fetchProductLineRuntime(locale, slug, {
      page,
      pageSize,
      includeChildren,
    });
  },
  ['productline-runtime'],
  { revalidate: 3600 }
);

// ===== SEO 缓存 =====
const getProductLineSeoData = unstable_cache(
  async (locale: string, slug: string) => {
    const seoInput = await getSeoInput('productLine', slug, locale);
    if (!seoInput) return null;
    const { metadata, jsonLdScripts } = await generatePageMetadata(seoInput, locale);
    return { seoInput, metadata, jsonLdScripts };
  },
  ['productline-seo-data'],
  { revalidate: 3600 }
);

// ✅ React cache：同一请求内只执行一次
const getProductLineSeoDataOnce = cache(getProductLineSeoData);

// ===== generateMetadata =====
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; productlineSlug: string }>;
}) {
  // ✅ 防御性检查：构建时 Next.js 可能传入 undefined
  const resolvedParams = await params;
  if (!resolvedParams?.locale) {
    return {
      title: 'Product Line',
      robots: 'noindex, follow',
    };
  }

  const { locale, productlineSlug } = resolvedParams;

  const settings = await getSiteSettings();
  const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '');

  const seoData = await getProductLineSeoDataOnce(locale, productlineSlug);
  if (!seoData) {
    return {
      robots: 'noindex, follow',
      alternates: { canonical: `${baseUrl}/${locale}/products/${productlineSlug}` },
      openGraph: { locale },
    };
  }

  const { metadata, seoInput } = seoData;
  const canonicalPath =
    seoInput.canonical || seoInput.url || `/${locale}/products/${productlineSlug}`;
  const canonical = canonicalPath.startsWith('http')
    ? canonicalPath
    : `${baseUrl}${canonicalPath.startsWith('/') ? '' : '/'}${canonicalPath}`;

  return {
    ...metadata,
    alternates: { canonical },
    openGraph: {
      ...metadata.openGraph,
      locale,
      url: metadata.openGraph?.url || canonical,
    },
  };
}

// ===== 内容组件 =====
interface ProductLineContentProps {
  locale: string;
  productlineSlug: string;
  currentPage: number;
}

async function ProductLineContent({
  locale,
  productlineSlug,
  currentPage,
}: ProductLineContentProps) {
  const decodedSlug = decodeURIComponent(productlineSlug);

  // ===== 并行获取数据 =====
  const [runtimeData, seoData] = await Promise.all([
    getCachedProductLineRuntime(locale, decodedSlug, currentPage, 15, true),
    getProductLineSeoDataOnce(locale, decodedSlug),
  ]);

  if (!runtimeData) notFound();

  const seoTitle = seoData?.seoInput?.title || runtimeData.productLine?.name || '';
  const jsonLdScripts = seoData?.jsonLdScripts || [];

  const templateId =
    runtimeData.productLine?.templateId || DEFAULT_PRODUCT_LINE_TEMPLATE_ID;

  let layoutPage = await getLayoutPageByTemplate('base', templateId);

  if (!layoutPage && templateId !== DEFAULT_PRODUCT_LINE_TEMPLATE_ID) {
    console.warn(`[ProductLineContent] 模板 ${templateId} 不存在，回退到默认模板`);
    layoutPage = await getLayoutPageByTemplate('base', DEFAULT_PRODUCT_LINE_TEMPLATE_ID);
  }

  const templateData = layoutPage?.templateData;
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
          产品线页尚未配置模板
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

  const finalRuntime = { ...runtimeData, locale, seoTitle };

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
      {jsonLdScripts.map((script, idx) => (
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
interface Props {
  params: Promise<{ locale: string; productlineSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}

async function ProductLinePage({ params, searchParams }: Props) {
  // ✅ 防御性检查：构建时 Next.js 可能传入 undefined
  const resolvedParams = await params;
  if (!resolvedParams?.locale) {
    notFound();
  }

  const { locale, productlineSlug } = resolvedParams;
  const resolvedSearchParams = await searchParams;
  const { page } = resolvedSearchParams || {};
  const currentPage = page ? parseInt(page, 10) || 1 : 1;

  return (
    <Suspense fallback={<ProductLineLoading />}>
      <ProductLineContent
        locale={locale}
        productlineSlug={productlineSlug}
        currentPage={currentPage}
      />
    </Suspense>
  );
}

export const revalidate = 3600;
export default withDynamicLocale(ProductLinePage);