// app/[locale]/products/[productlineSlug]/[categorySlug]/page.tsx

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
import CategoryLoading from './loading';

const DEFAULT_PRODUCT_LINE_TEMPLATE_ID = 'default_product_line_published';

// ===== 缓存：分类页面运行时数据 =====
const getCachedCategoryRuntime = unstable_cache(
  async (
    locale: string,
    productlineSlug: string,
    categorySlug: string,
    page: number,
    pageSize: number,
    includeChildren: boolean
  ) => {
    return fetchProductLineRuntime(locale, productlineSlug, {
      categorySlug,
      page,
      pageSize,
      includeChildren,
    });
  },
  ['category-runtime'],
  { revalidate: 3600 }
);

// ===== SEO 缓存 =====
const getCategorySeoData = unstable_cache(
  async (locale: string, categorySlug: string) => {
    const seoInput = await getSeoInput('productCategory', categorySlug, locale);
    if (!seoInput) return null;
    const { metadata, jsonLdScripts } = await generatePageMetadata(seoInput, locale);
    return { seoInput, metadata, jsonLdScripts };
  },
  ['category-seo-data'],
  { revalidate: 3600 }
);

// ✅ React cache：同一请求内只执行一次
const getCategorySeoDataOnce = cache(getCategorySeoData);

// ===== generateMetadata =====
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; productlineSlug: string; categorySlug: string }>;
}) {
  const { locale, productlineSlug, categorySlug } = await params;
  const settings = await getSiteSettings();
  const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(
    /\/+$/,
    ''
  );
  const siteName = settings.siteName || 'Site Name';

  const seoData = await getCategorySeoDataOnce(locale, categorySlug);

  if (!seoData) {
    const fallbackTitle = `${categorySlug.replace(/-/g, ' ')} | ${siteName}`;
    const fallbackDescription = `Browse products in ${categorySlug.replace(/-/g, ' ')} category.`;
    return {
      title: fallbackTitle,
      description: fallbackDescription,
      robots: 'index, follow',
      alternates: {
        canonical: `${baseUrl}/${locale}/products/${productlineSlug}/${categorySlug}`,
      },
      openGraph: {
        title: fallbackTitle,
        description: fallbackDescription,
        locale,
        url: `${baseUrl}/${locale}/products/${productlineSlug}/${categorySlug}`,
      },
    };
  }

  const { metadata, seoInput } = seoData;
  const canonicalPath =
    seoInput.canonical ||
    seoInput.url ||
    `/${locale}/products/${productlineSlug}/${categorySlug}`;
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
interface CategoryContentProps {
  locale: string;
  productlineSlug: string;
  categorySlug: string;
  currentPage: number;
}

async function CategoryContent({
  locale,
  productlineSlug,
  categorySlug,
  currentPage,
}: CategoryContentProps) {
  const decodedProductLineSlug = decodeURIComponent(productlineSlug);
  const decodedCategorySlug = decodeURIComponent(categorySlug);

  // ===== 并行获取数据 =====
  const [runtimeData, seoData] = await Promise.all([
    getCachedCategoryRuntime(
      locale,
      decodedProductLineSlug,
      decodedCategorySlug,
      currentPage,
      15,
      true
    ),
    getCategorySeoDataOnce(locale, decodedCategorySlug),
  ]);

  if (!runtimeData) notFound();

  const seoTitle = seoData?.seoInput?.title || runtimeData.productLine?.name || '';
  const jsonLdScripts = seoData?.jsonLdScripts || [];

  const templateId =
    runtimeData.productLine?.templateId || DEFAULT_PRODUCT_LINE_TEMPLATE_ID;

  // ✅ 用 getLayoutPageByTemplate 替代本地 getCachedLayout
  let layoutPage = await getLayoutPageByTemplate('base', templateId);

  if (!layoutPage && templateId !== DEFAULT_PRODUCT_LINE_TEMPLATE_ID) {
    console.warn(`[CategoryContent] 模板 ${templateId} 不存在，回退到默认模板`);
    layoutPage = await getLayoutPageByTemplate('base', DEFAULT_PRODUCT_LINE_TEMPLATE_ID);
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
          产品分类页尚未配置模板
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

  // ✅ 移除 texts 相关
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
  params: Promise<{ locale: string; productlineSlug: string; categorySlug: string }>;
  searchParams: Promise<{ page?: string }>;
}

async function CategoryPage({ params, searchParams }: Props) {
  const { locale, productlineSlug, categorySlug } = await params;
  const { page } = await searchParams;
  const currentPage = page ? parseInt(page, 10) || 1 : 1;

  return (
    <Suspense fallback={<CategoryLoading />}>
      <CategoryContent
        locale={locale}
        productlineSlug={productlineSlug}
        categorySlug={categorySlug}
        currentPage={currentPage}
      />
    </Suspense>
  );
}

// 保持现有策略：不预生成，依赖 ISR
export async function generateStaticParams() {
  return [];
}

export const revalidate = 3600;
export default withDynamicLocale(CategoryPage);