// app/[locale]/blog/page.tsx
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { injectRuntimeDataSafe } from '@/lib/webbuilder/runtime-injector';
import { TemplateRenderer } from '@/components/webbuilder/TemplateRenderer';
import { getCachedBlogConfig, getCachedBlogCategories, getCachedBlogPosts } from '@/lib/blog';
import sql from '@/lib/db/admin';
import { extractAllTextIds } from '@/lib/webbuilder/text-utils';
import { withDynamicLocale } from '@/lib/withPageLocale';
import { getSeoInput } from '@/lib/seo/getSeoInput';
import { generatePageMetadata } from '@/lib/seo';
import { getSiteSettings } from '@/lib/getSiteSettings';
import BlogLoading from './loading';

// ===== 类型定义 =====
interface Category {
  id: string;
  slug: string;
  name: string;
  template?: string;
  [key: string]: any;
}

interface StructuredDataWithGraph {
  '@graph'?: Array<Record<string, any>>;
  '@context'?: string;
  name: string;
  description?: string;
  numberOfItems?: number;
  itemList?: { url: string }[];
  [key: string]: any;
}

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';
const DEFAULT_BLOG_TEMPLATE_ID = 'default_blog_published';

// ===== 缓存：布局查询（已迁移到直连）=====
const getCachedLayout = unstable_cache(
  async (templateId: string) => {
    try {
      const rows = await sql<any[]>`
        SELECT id, template, template_data, template_hash, content, type
        FROM public.site_pages
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND locale = 'base'
          AND template = ${templateId}
        LIMIT 1
      `;
      return { data: rows[0] ?? null, error: null };
    } catch (error: any) {
      console.error('[getCachedLayout] 查询失败:', error);
      return { data: null, error };
    }
  },
  ['blog-home-layout'],
  { revalidate: 3600 }
);

// ===== generateMetadata =====
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const resolvedParams = await params;
  if (!resolvedParams?.locale) {
    return { title: 'Blog', robots: 'noindex, follow' };
  }

  const { locale } = resolvedParams;
  const resolvedSearchParams = await searchParams;
  const { category: selectedCategory } = resolvedSearchParams || {};

  const settings = await getSiteSettings();
  const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
  const siteName = settings.siteName || 'Site Name';

  const t = await getTranslations({ locale, namespace: 'Blog' });
  const [blogConfig, categories, posts] = await Promise.all([
    getCachedBlogConfig(locale),
    getCachedBlogCategories(locale),
    getCachedBlogPosts(locale),
  ]);

  let category: Category | null = null;
  if (selectedCategory) {
    category = categories.find((c) => c.slug === selectedCategory) || null;
    if (!category) {
      return {
        title: `${selectedCategory.replace(/-/g, ' ')} | ${siteName}`,
        robots: 'noindex, follow',
      };
    }
  }

  const data = { blogConfig, categories, posts, siteName, baseUrl, t };
  const seoInput = await getSeoInput('blogCategory', 'home', locale, data);
  if (!seoInput) {
    return { title: blogConfig.name || 'Blog', robots: 'index, follow' };
  }

  const { metadata } = await generatePageMetadata(seoInput, locale);
  return {
    ...metadata,
    alternates: {
      canonical: seoInput.canonical || `${baseUrl}/${locale}/blog`,
    },
  };
}

// ===== 内容组件 =====
interface BlogHomeContentProps {
  locale: string;
  selectedCategorySlug?: string | null;
}

async function BlogHomeContent({ locale, selectedCategorySlug }: BlogHomeContentProps) {
  const settings = await getSiteSettings();
  const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
  const siteName = settings.siteName || 'Site Name';
  const t = await getTranslations({ locale, namespace: 'Blog' });

  const [blogConfig, categories, allPosts] = await Promise.all([
    getCachedBlogConfig(locale),
    getCachedBlogCategories(locale),
    getCachedBlogPosts(locale),
  ]);

  let currentCategory: Category | null = null;
  let posts = allPosts;
  if (selectedCategorySlug) {
    currentCategory = categories.find((c) => c.slug === selectedCategorySlug) || null;
    if (currentCategory) {
      posts = allPosts.filter((p) => p.category === currentCategory.id);
    }
  }

  const templateId = currentCategory?.template || DEFAULT_BLOG_TEMPLATE_ID;

  const { data: layoutPage, error: layoutError } = await getCachedLayout(templateId);
  if (layoutError) {
    console.error('[BlogHomeContent] 查询布局失败:', layoutError);
    return <div className="p-8 text-center text-red-500">加载布局失败，请重试</div>;
  }

  let layoutPageData = layoutPage;
  let finalTemplateId = templateId;

  if (!layoutPage && templateId !== DEFAULT_BLOG_TEMPLATE_ID) {
    console.warn(`[BlogHomeContent] 模板 ${templateId} 不存在，回退到默认模板`);
    const { data: fallbackData, error: fallbackError } = await getCachedLayout(DEFAULT_BLOG_TEMPLATE_ID);
    if (!fallbackError && fallbackData) {
      layoutPageData = fallbackData;
      finalTemplateId = DEFAULT_BLOG_TEMPLATE_ID;
    }
  }

  const templateData = layoutPageData?.template_data;
  const hasValidTemplate = templateData && Array.isArray(templateData.content) && templateData.content.length > 0;

  if (!layoutPageData || !hasValidTemplate) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-4">📄</div>
        <h1 className="text-2xl font-semibold text-gray-700 mb-2">博客列表页尚未配置模板</h1>
        <p className="text-gray-500">模板 ID: {finalTemplateId}</p>
      </div>
    );
  }

  const actualTemplateId = layoutPageData.template || finalTemplateId;

  // ✅ component_texts 表已废弃，texts 恒为空对象
  const texts: Record<string, string> = {};

  const runtimeData = {
    entityType: 'blog',
    categories,
    posts,
    currentCategorySlug: selectedCategorySlug || null,
    locale,
    basePath: `/${locale}/blog`,
  };
  const finalRuntime = { ...runtimeData, texts, locale };

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

  const seoData = { blogConfig, categories, posts, siteName, baseUrl, t };
  const seoInput = await getSeoInput('blogCategory', 'home', locale, seoData);
  let jsonLdScripts: string[] = [];
  if (seoInput?.structuredData) {
    const data = seoInput.structuredData as StructuredDataWithGraph;
    jsonLdScripts = [JSON.stringify(data)];
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
interface BlogIndexPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
}

async function BlogIndexPage({ params, searchParams }: BlogIndexPageProps) {
  const resolvedParams = await params;
  if (!resolvedParams?.locale) {
    notFound();
  }

  const { locale } = resolvedParams;
  const resolvedSearchParams = await searchParams;
  const { category: selectedCategory } = resolvedSearchParams || {};

  return (
    <Suspense fallback={<BlogLoading />}>
      <BlogHomeContent locale={locale} selectedCategorySlug={selectedCategory || null} />
    </Suspense>
  );
}

export async function generateStaticParams() {
  return [];
}

export const revalidate = 3600;
export default withDynamicLocale(BlogIndexPage);