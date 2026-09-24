// app/[locale]/page.tsx

import { notFound } from 'next/navigation';
import Script from 'next/script';
import { cache } from 'react';
import { readPage, getHomePageId } from '@/lib/pages/storage';
import { TemplateRenderer } from '@/components/webbuilder/TemplateRenderer';
import { generatePageMetadata } from '@/lib/seo';
import { getSeoInput } from '@/lib/seo/getSeoInput';
import { withStaticLocale } from '@/lib/withPageLocale';
import { getSiteSettings } from '@/lib/getSiteSettings';
import { getEnabledLanguages } from '@/lib/languages/settings';

export const revalidate = 3600;

export async function generateStaticParams() {
  const enabled = await getEnabledLanguages();
  return enabled.map((locale) => ({ locale }));
}

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

// ✅ 去掉 unstable_cache，直接用 readPage（它内部有 NodeCache 5 分钟）
// 用 React cache 包一层：同一次请求内 generateMetadata 和 HomePage 只查一次
const getHomePageDataOnce = cache(async (locale: string) => {
  const pageId = await getHomePageId(locale);
  if (!pageId) return null;
  return readPage(locale, pageId);
});

// ===== 生成 SEO 数据 =====
async function getHomeSeoData(locale: string, page: any) {
  const seoData = {
    title: page?.title || '',
    seo_title: page?.seo_title || '',
    seo_description: page?.seo_description || '',
    seo_keywords: page?.seo_keywords || '',
    visible: page?.visible || 'visible',
    content: page?.content || '',
    image: '',
    slug: '',
    createdAt: page?.createdAt || '',
    updatedAt: page?.updatedAt || '',
  };

  const seoInput = await getSeoInput('home', 'home', locale, seoData);
  if (!seoInput) return null;

  const { metadata, jsonLdScripts } = await generatePageMetadata(seoInput, locale);
  return { seoInput, metadata, jsonLdScripts };
}

export async function generateMetadata({ params }: HomePageProps) {
  // ✅ 防御性检查：构建时 Next.js 可能传入 undefined
  const resolvedParams = await params;
  if (!resolvedParams?.locale) {
    return {
      title: 'Home',
      robots: 'noindex, follow',
    };
  }

  const { locale } = resolvedParams;

  const settings = await getSiteSettings();
  const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '');

  // ✅ 用 Once 版本
  const page = await getHomePageDataOnce(locale);
  if (!page) {
    return {
      robots: 'noindex, follow',
      alternates: { canonical: `${baseUrl}/${locale}` },
      openGraph: { locale },
    };
  }

  const seoData = await getHomeSeoData(locale, page);
  if (!seoData) {
    return {
      title: page.title || '首页',
      robots: 'index, follow',
      alternates: { canonical: `${baseUrl}/${locale}` },
    };
  }

  const { metadata, seoInput } = seoData;
  const canonicalPath = seoInput.canonical || seoInput.url || `/${locale}`;
  const canonical = canonicalPath.startsWith('http')
    ? canonicalPath
    : `${baseUrl}${canonicalPath.startsWith('/') ? '' : '/'}${canonicalPath}`;

  return {
    ...metadata,
    alternates: { canonical },
    openGraph: {
      ...metadata.openGraph,
      locale,
      url: canonical,
      title: metadata.title,
    },
    twitter: {
      ...metadata.twitter,
      title: metadata.title,
    },
  };
}

async function HomePage({ params }: HomePageProps) {
  // ✅ 防御性检查：构建时 Next.js 可能传入 undefined
  const resolvedParams = await params;
  if (!resolvedParams?.locale) {
    notFound();
  }

  const { locale } = resolvedParams;

  // ✅ 用 Once 版本（与 generateMetadata 共享同一次查询）
  const page = await getHomePageDataOnce(locale);
  if (!page) notFound();

  const templateData = page.templateData;
  if (!templateData) notFound();

  const seoData = await getHomeSeoData(locale, page);
  const seoTitle = seoData?.seoInput?.title || page.title || '';
  const jsonLdScripts = seoData?.jsonLdScripts || [];

  return (
    <>
      {jsonLdScripts.map((script, idx) => (
        <Script
          key={idx}
          id={`json-ld-${idx}`}
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: script }}
        />
      ))}

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <TemplateRenderer data={templateData} runtime={{ seoTitle, locale }} />
        </div>
      </main>
    </>
  );
}

export default withStaticLocale(HomePage);