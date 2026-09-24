// app/[locale]/collections/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { Suspense, cache } from 'react';
import { injectRuntimeDataSafe } from '@/lib/webbuilder/runtime-injector';
import { TemplateRenderer } from '@/components/webbuilder/TemplateRenderer';
import { fetchCollectionRuntime } from '@/lib/webbuilder/collection-helpers';
import { withDynamicLocale } from '@/lib/withPageLocale';
import { getSeoInput } from '@/lib/seo/getSeoInput';
import { generatePageMetadata } from '@/lib/seo';
import { getSiteSettings } from '@/lib/getSiteSettings';
import { getLayoutPageByTemplate } from '@/lib/pages/storage';
import CollectionLoading from './loading';

const PAGE_SIZE = 15;
const DEFAULT_COLLECTION_TEMPLATE_ID = 'default_product_category_published';

// ===== 缓存：集合运行时数据 =====
const getCachedCollectionRuntime = unstable_cache(
  async (locale: string, slug: string, page: number, pageSize: number) => {
    return fetchCollectionRuntime(locale, slug, page, pageSize);
  },
  ['collection-runtime'],
  { revalidate: 3600 }
);

// ===== SEO 缓存 =====
const getCollectionSeoData = unstable_cache(
  async (locale: string, slug: string) => {
    const seoInput = await getSeoInput('productCollection', slug, locale);
    if (!seoInput) return null;
    const { metadata, jsonLdScripts } = await generatePageMetadata(seoInput, locale);
    return { seoInput, metadata, jsonLdScripts };
  },
  ['collection-seo-data'],
  { revalidate: 3600 }
);

// ✅ React cache：同一请求内只执行一次
const getCollectionSeoDataOnce = cache(getCollectionSeoData);

// ===== generateMetadata =====
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  // ✅ 防御性检查：构建时 Next.js 可能传入 undefined
  const resolvedParams = await params;
  if (!resolvedParams?.locale) {
    return {
      title: 'Collection',
      robots: 'noindex, follow',
    };
  }

  const { locale, slug } = resolvedParams;

  const settings = await getSiteSettings();
  const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(
    /\/+$/,
    ''
  );
  const siteName = settings.siteName || 'Site Name';

  const seoData = await getCollectionSeoDataOnce(locale, slug);

  if (!seoData) {
    const fallbackTitle = `${slug.replace(/-/g, ' ')} | ${siteName}`;
    const fallbackDescription = `Browse products in ${slug.replace(/-/g, ' ')} collection.`;
    return {
      title: fallbackTitle,
      description: fallbackDescription,
      robots: 'index, follow',
      alternates: { canonical: `${baseUrl}/${locale}/collections/${slug}` },
      openGraph: {
        title: fallbackTitle,
        description: fallbackDescription,
        locale,
        url: `${baseUrl}/${locale}/collections/${slug}`,
      },
    };
  }

  const { metadata, seoInput } = seoData;
  const canonicalPath =
    seoInput.canonical || seoInput.url || `/${locale}/collections/${slug}`;
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

// ===== 内容组件（用于 Suspense） =====
interface CollectionContentProps {
  locale: string;
  slug: string;
  page: number;
}

async function CollectionContent({ locale, slug, page }: CollectionContentProps) {
  const decodedSlug = decodeURIComponent(slug);

  const runtimeData = await getCachedCollectionRuntime(locale, decodedSlug, page, PAGE_SIZE);
  if (!runtimeData) notFound();

  const seoData = await getCollectionSeoDataOnce(locale, decodedSlug);
  const seoTitle = seoData?.seoInput?.title || runtimeData.collection?.name || '';
  const jsonLdScripts = seoData?.jsonLdScripts || [];

  const templateId = runtimeData.collection?.template || DEFAULT_COLLECTION_TEMPLATE_ID;

  let layoutPage = await getLayoutPageByTemplate('base', templateId);

  if (!layoutPage && templateId !== DEFAULT_COLLECTION_TEMPLATE_ID) {
    console.warn(`[CollectionContent] 模板 ${templateId} 不存在，回退到默认模板`);
    layoutPage = await getLayoutPageByTemplate('base', DEFAULT_COLLECTION_TEMPLATE_ID);
  }

  const templateData = layoutPage?.templateData;
  const hasValidTemplate =
    templateData && Array.isArray(templateData.content) && templateData.content.length > 0;

  if (!layoutPage || !hasValidTemplate) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-4">📄</div>
        <h1 className="text-2xl font-semibold text-gray-700 mb-2">分类页尚未配置模板</h1>
        <p className="text-gray-500">模板 ID: {templateId}</p>
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
interface CollectionsPageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams?: Promise<{ page?: string }>;
}

async function CollectionsPage({ params, searchParams }: CollectionsPageProps) {
  // ✅ 防御性检查：构建时 Next.js 可能传入 undefined
  const resolvedParams = await params;
  if (!resolvedParams?.locale) {
    notFound();
  }

  const { locale, slug } = resolvedParams;
  const resolvedSearchParams = await searchParams;
  const page = parseInt(resolvedSearchParams?.page || '1', 10) || 1;

  return (
    <Suspense fallback={<CollectionLoading />}>
      <CollectionContent locale={locale} slug={slug} page={page} />
    </Suspense>
  );
}

export async function generateStaticParams() {
  return [];
}

export const revalidate = 3600;
export default withDynamicLocale(CollectionsPage);