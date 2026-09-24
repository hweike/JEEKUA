// app/[locale]/video/page.tsx

import { notFound } from 'next/navigation';
import { Suspense, cache } from 'react';
import { getTranslations } from 'next-intl/server';
import { injectRuntimeDataSafe } from '@/lib/webbuilder/runtime-injector';
import { TemplateRenderer } from '@/components/webbuilder/TemplateRenderer';
import {
  getCachedVideoConfig,
  getCachedVideoCategories,
  getCachedVideos,
} from '@/lib/videosys';
import { withDynamicLocale } from '@/lib/withPageLocale';
import { getSeoInput } from '@/lib/seo/getSeoInput';
import { generatePageMetadata } from '@/lib/seo';
import { getSiteSettings } from '@/lib/getSiteSettings';
import { getLayoutPageByTemplate } from '@/lib/pages/storage';
import VideoLoading from './loading';

const DEFAULT_VIDEO_TEMPLATE_ID = 'default_video_category_published';

// ===== 用 React cache 包裹所有重复查询 =====
const getSiteSettingsCached = cache(getSiteSettings);
const getVideoConfigCached = cache(getCachedVideoConfig);
const getVideoCategoriesCached = cache(getCachedVideoCategories);
const getVideosCached = cache(getCachedVideos);
const getSeoInputCached = cache(getSeoInput);
const getTranslationsCached = cache(getTranslations);

// ===== 合并首页数据获取 =====
const getVideoHomeData = cache(async (locale: string) => {
  const [config, categories, videosResult] = await Promise.all([
    getVideoConfigCached(locale),
    getVideoCategoriesCached(locale),
    getVideosCached(locale, undefined, 1, 15),
  ]);
  return {
    config,
    categories,
    videos: videosResult.items || [],
  };
});

// ===== generateMetadata =====
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  // ✅ 防御性检查：构建时 Next.js 可能传入 undefined
  const resolvedParams = await params;
  if (!resolvedParams?.locale) {
    return {
      title: 'Video',
      robots: 'noindex, follow',
    };
  }

  const { locale } = resolvedParams;

  const [settings, t, homeData] = await Promise.all([
    getSiteSettingsCached(),
    getTranslationsCached({ locale, namespace: 'Video' }),
    getVideoHomeData(locale),
  ]);

  const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
  const siteName = settings.siteName || 'Site Name';

  const { config, categories, videos } = homeData;
  const data = { config, categories, videos, siteName, baseUrl, t };

  const seoInput = await getSeoInputCached('videoCategory', 'home', locale, data);
  if (!seoInput) {
    return {
      title: config.name || 'Video',
      robots: 'index, follow',
    };
  }

  const { metadata } = await generatePageMetadata(seoInput, locale);
  return {
    ...metadata,
    alternates: {
      canonical: seoInput.canonical || `${baseUrl}/${locale}/video`,
    },
  };
}

// ===== 内容组件 =====
interface VideoHomeContentProps {
  locale: string;
}

async function VideoHomeContent({ locale }: VideoHomeContentProps) {
  const [settings, t, homeData] = await Promise.all([
    getSiteSettingsCached(),
    getTranslationsCached({ locale, namespace: 'Video' }),
    getVideoHomeData(locale),
  ]);

  const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
  const siteName = settings.siteName || 'Site Name';

  const { config, categories, videos } = homeData;

  const categoryKeyToSlug = new Map<string, string>();
  categories.forEach((cat) => {
    if (cat.key && cat.slug) {
      categoryKeyToSlug.set(cat.key, cat.slug);
    }
  });

  const videosWithSlug = videos.map((v: any) => ({
    ...v,
    categorySlug: categoryKeyToSlug.get(v.category_key) || '',
  }));

  const templateId = DEFAULT_VIDEO_TEMPLATE_ID;

  // ✅ 用 getLayoutPageByTemplate 替代本地 getCachedLayout
  let layoutPage = await getLayoutPageByTemplate('base', templateId);

  if (!layoutPage && templateId !== DEFAULT_VIDEO_TEMPLATE_ID) {
    console.warn(`[VideoHomeContent] 模板 ${templateId} 不存在，回退到默认模板`);
    layoutPage = await getLayoutPageByTemplate('base', DEFAULT_VIDEO_TEMPLATE_ID);
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
        <div style={{ fontSize: 'var(--font-size-4xl, 2.25rem)', marginBottom: 'var(--spacing-4, 1rem)' }}>
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
          视频列表页尚未配置模板
        </h1>
        <p style={{ color: 'var(--muted-foreground, #64748b)', fontSize: 'var(--font-size-base, 1rem)' }}>
          模板 ID: {templateId}
        </p>
      </div>
    );
  }

  // ✅ 移除 texts 相关
  const runtimeData = {
    entityType: 'video',
    categories: categories.map((c: any) => ({ key: c.key, slug: c.slug, name: c.name })),
    videos: videosWithSlug,
    currentCategorySlug: null,
    locale,
    basePath: `/${locale}/video`,
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

  const seoData = { config, categories, videos, siteName, baseUrl, t };
  const seoInput = await getSeoInputCached('videoCategory', 'home', locale, seoData);
  let jsonLdScripts: string[] = [];
  if (seoInput?.structuredData) {
    jsonLdScripts = [JSON.stringify(seoInput.structuredData)];
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
interface VideoIndexPageProps {
  params: Promise<{ locale: string }>;
}

async function VideoIndexPage({ params }: VideoIndexPageProps) {
  // ✅ 防御性检查：构建时 Next.js 可能传入 undefined
  const resolvedParams = await params;
  if (!resolvedParams?.locale) {
    notFound();
  }

  const { locale } = resolvedParams;

  return (
    <Suspense fallback={<VideoLoading />}>
      <VideoHomeContent locale={locale} />
    </Suspense>
  );
}

export const revalidate = 3600;
export default withDynamicLocale(VideoIndexPage);