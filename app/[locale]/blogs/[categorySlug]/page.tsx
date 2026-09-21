// app/[locale]/blogs/[categorySlug]/page.tsx
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { injectRuntimeDataSafe } from '@/lib/webbuilder/runtime-injector';
import { TemplateRenderer } from '@/components/webbuilder/TemplateRenderer';
import { getCachedBlogCategories, getCachedBlogPostsByCategorySlug, getCachedBlogConfig } from '@/lib/blog';
import { supabase } from '@/lib/supabase/client';
import { extractAllTextIds } from '@/lib/webbuilder/text-utils';
import { withDynamicLocale } from '@/lib/withPageLocale';
import { getSeoInput } from '@/lib/seo/getSeoInput';
import { generatePageMetadata } from '@/lib/seo';
import { getSiteSettings } from '@/lib/getSiteSettings';
import CategoryLoading from './loading';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';
const DEFAULT_BLOG_TEMPLATE_ID = 'default_news_published';

// ===== 扩展类型定义 =====
interface StructuredDataWithGraph {
  '@context'?: string;
  '@graph'?: Array<Record<string, any>>;
  name: string;
  description?: string;
  itemList?: { url: string }[];
  [key: string]: any; // 允许其他属性
}

// ===== 缓存：布局查询 =====
const getCachedLayout = unstable_cache(
  async (templateId: string) => {
    return supabase
      .from('site_pages')
      .select('id, template, template_data, template_hash, content, type')
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('locale', 'base')
      .eq('template', templateId)
      .maybeSingle();
  },
  ['blog-category-layout'],
  { revalidate: 3600 }
);

// ===== 缓存：翻译文本 =====
const getCachedTexts = unstable_cache(
  async (templateId: string, locale: string, textIds: string[]) => {
    if (textIds.length === 0) return {};
    const { data, error } = await supabase
      .from('component_texts')
      .select('text_id, text')
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('template_id', templateId)
      .eq('locale', locale)
      .in('text_id', textIds);
    if (error) {
      console.error('[Texts] 查询失败:', error);
      return {};
    }
    return data.reduce((acc, row) => ({ ...acc, [row.text_id]: row.text }), {});
  },
  ['blog-category-texts'],
  { revalidate: 3600 }
);

// ===== generateMetadata =====
export async function generateMetadata({ params }: { params: Promise<{ locale: string; categorySlug: string }> }) {
  const { locale, categorySlug } = await params;
  const settings = await getSiteSettings();
  const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
  const siteName = settings.siteName || 'Site Name';

  // 获取完整数据（与 getDataFetcher 逻辑一致）
  const t = await getTranslations({ locale, namespace: 'Blog' });
  const [blogConfig, categories, posts] = await Promise.all([
    getCachedBlogConfig(locale),
    getCachedBlogCategories(locale),
    getCachedBlogPostsByCategorySlug(locale, categorySlug),
  ]);
  const category = categories.find((c) => c.slug === categorySlug);

  if (!category) {
    return {
      title: `${categorySlug.replace(/-/g, ' ')} | ${siteName}`,
      robots: 'noindex, follow',
    };
  }

  const data = { blogConfig, category, posts, siteName, baseUrl, t };
  const seoInput = await getSeoInput('blogCollection', categorySlug, locale, data);
  if (!seoInput) {
    return {
      title: `${category.name} | ${siteName}`,
      robots: 'index, follow',
    };
  }

  const { metadata } = await generatePageMetadata(seoInput, locale);
  return {
    ...metadata,
    alternates: {
      canonical: seoInput.canonical || `${baseUrl}/${locale}/blogs/${categorySlug}`,
    },
  };
}

// ===== 内容组件（用于 Suspense） =====
interface CategoryContentProps {
  locale: string;
  categorySlug: string;
}

async function CategoryContent({ locale, categorySlug }: CategoryContentProps) {
  // 1. 获取所有数据和翻译
  const settings = await getSiteSettings();
  const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
  const siteName = settings.siteName || 'Site Name';
  const t = await getTranslations({ locale, namespace: 'Blog' });
  const [blogConfig, categories, posts] = await Promise.all([
    getCachedBlogConfig(locale),
    getCachedBlogCategories(locale),
    getCachedBlogPostsByCategorySlug(locale, categorySlug),
  ]);
  const category = categories.find((c) => c.slug === categorySlug);
  if (!category) notFound();

  // 2. 获取模板 ID
  const templateId = category.template || DEFAULT_BLOG_TEMPLATE_ID;

  // 3. 查询布局（缓存）
  const { data: layoutPage, error: layoutError } = await getCachedLayout(templateId);
  if (layoutError) {
    console.error('[CategoryContent] 查询布局失败:', layoutError);
    return <div className="p-8 text-center text-red-500">加载布局失败，请重试</div>;
  }

  let layoutPageData = layoutPage;
  let finalTemplateId = templateId;

  if (!layoutPage && templateId !== DEFAULT_BLOG_TEMPLATE_ID) {
    console.warn(`[CategoryContent] 模板 ${templateId} 不存在，回退到默认模板`);
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
        <h1 className="text-2xl font-semibold text-gray-700 mb-2">该频道尚未配置模板</h1>
        <p className="text-gray-500">模板 ID: {finalTemplateId}</p>
      </div>
    );
  }

  const actualTemplateId = layoutPageData.template || finalTemplateId;

  // 4. 提取翻译文本（缓存）
  const textIds = extractAllTextIds(templateData);
  const texts = await getCachedTexts(actualTemplateId, locale, textIds);

  // 5. 构建运行时数据
  const runtimeData = {
    entityType: 'blog-collection',
    categories,
    posts,
    currentCategorySlug: categorySlug,
    locale,
    basePath: `/${locale}/blogs/post`,
  };
  const finalRuntime = { ...runtimeData, texts, locale };

  // 6. 注入运行时数据
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

  // 7. 生成 JSON-LD（使用完整数据）
  const seoData = { blogConfig, category, posts, siteName, baseUrl, t };
  const seoInput = await getSeoInput('blogCollection', categorySlug, locale, seoData);
  let jsonLdScripts: string[] = [];

  if (seoInput?.structuredData) {
    // 使用类型断言将 structuredData 转为扩展类型
    const data = seoInput.structuredData as StructuredDataWithGraph;
    
    // 检查是否包含 @graph 属性
    if (data['@graph'] && Array.isArray(data['@graph'])) {
      // 直接序列化整个对象（包含 @context 和 @graph）
      jsonLdScripts = [JSON.stringify(data)];
    } else {
      // 否则按照标准结构包装（兼容旧逻辑）
      jsonLdScripts = [JSON.stringify(data)];
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
interface BlogCategoryPageProps {
  params: Promise<{ locale: string; categorySlug: string }>;
}

async function BlogCategoryPage({ params }: BlogCategoryPageProps) {
  const { locale, categorySlug } = await params;
  return (
    <Suspense fallback={<CategoryLoading />}>
      <CategoryContent locale={locale} categorySlug={categorySlug} />
    </Suspense>
  );
}

// ===== 移除 generateStaticParams，依赖 ISR =====
export async function generateStaticParams() {
  return [];
}

export const revalidate = 3600;
export default withDynamicLocale(BlogCategoryPage);