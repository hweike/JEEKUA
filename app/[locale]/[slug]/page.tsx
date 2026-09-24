// app/[locale]/[slug]/page.tsx

import { notFound } from 'next/navigation';
import Script from 'next/script';
import { generatePageMetadata } from '@/lib/seo';
import { getSeoInput } from '@/lib/seo/getSeoInput';
import { TemplateRenderer } from '@/components/webbuilder/TemplateRenderer';
import { getCachedPageBySlug } from '@/lib/pages/pageService';
import { withStaticLocale } from '@/lib/withPageLocale';
import { getSiteSettings } from '@/lib/getSiteSettings';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

// ===== ISR 配置 =====
export const revalidate = 3600;

// ===== 判断内容是否为空（去除 HTML 标签、实体、空白） =====
function isContentEmpty(html: string | null | undefined): boolean {
  if (!html) return true;

  // 如果有图片/视频/iframe/svg，直接算有内容（按需保留或删除）
  if (/<(img|video|iframe|svg)/i.test(html)) return false;

  // 1. 去掉 HTML 标签
  const text = html.replace(/<[^>]*>/g, '');

  // 2. 解码常见 HTML 实体
  const decoded = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // 3. 去掉所有空白（空格、换行、制表符）
  const cleaned = decoded.replace(/\s+/g, '');

  return cleaned === '';
}

// ===== generateMetadata =====
export async function generateMetadata({ params }: PageProps) {
  // ✅ 防御性检查：构建时 Next.js 可能传入 undefined
  const resolvedParams = await params;
  if (!resolvedParams?.locale) {
    return {
      title: 'Page',
      robots: 'noindex, follow',
    };
  }

  const { locale, slug } = resolvedParams;

  const settings = await getSiteSettings();
  const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
  const siteName = settings.siteName || 'Site Name';

  const page = await getCachedPageBySlug(locale, slug);

  if (!page) {
    return {
      title: '页面未找到',
      robots: 'noindex, follow',
      alternates: { canonical: `${baseUrl}/${locale}/${slug}` },
    };
  }

  if (page.visible !== 'visible') {
    return {
      title: `${page.title} | ${siteName}`,
      robots: 'noindex, follow',
      alternates: { canonical: `${baseUrl}/${locale}/${slug}` },
    };
  }

  const seoData = {
    title: page.title,
    seo_title: page.seo_title,
    seo_description: page.seo_description,
    seo_keywords: page.seo_keywords,
    visible: page.visible,
    content: page.content,
    image: '',
    slug: page.slug,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  };

  const seoInput = await getSeoInput('page', slug, locale, seoData);

  if (!seoInput) {
    return {
      title: `${page.title} | ${siteName}`,
      description: page.seo_description || '',
      robots: page.visible === 'visible' ? 'index, follow' : 'noindex, follow',
      alternates: { canonical: `${baseUrl}/${locale}/${slug}` },
    };
  }

  const { metadata } = await generatePageMetadata(seoInput, locale);

  const canonicalPath = seoInput.canonical || seoInput.url || `/${locale}/${slug}`;
  const canonical = canonicalPath.startsWith('http')
    ? canonicalPath
    : `${baseUrl}${canonicalPath.startsWith('/') ? '' : '/'}${canonicalPath}`;

  const openGraph = {
    ...metadata.openGraph,
    locale,
    url: canonical,
    title: metadata.title,
  };

  return {
    ...metadata,
    alternates: { canonical },
    openGraph,
  };
}

// ===== 页面组件 =====
async function Page({ params }: PageProps) {
  // ✅ 防御性检查：构建时 Next.js 可能传入 undefined
  const resolvedParams = await params;
  if (!resolvedParams?.locale) {
    notFound();
  }

  const { locale, slug } = resolvedParams;

  const page = await getCachedPageBySlug(locale, slug);
  if (!page || page.visible !== 'visible') notFound();

  const seoData = {
    title: page.title,
    seo_title: page.seo_title,
    seo_description: page.seo_description,
    seo_keywords: page.seo_keywords,
    visible: page.visible,
    content: page.content,
    image: '',
    slug: page.slug,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  };

  const seoInput = await getSeoInput('page', slug, locale, seoData);
  let jsonLdScripts: string[] = [];
  if (seoInput?.structuredData) {
    const structured = seoInput.structuredData as any;
    if (structured['@graph'] && Array.isArray(structured['@graph'])) {
      jsonLdScripts = [JSON.stringify(structured)];
    } else {
      jsonLdScripts = [JSON.stringify(structured)];
    }
  }

  const runtime = {
    seoTitle: seoInput?.title || page.title || '',
    locale,
  };

  const templateData = page.templateData;

  // ✅ 用 isContentEmpty 判断，空 HTML 标签 / 纯空格 / 纯换行都算"空"
  const hasContent = !isContentEmpty(page.content);
  const hasTemplate = !!templateData;

  if (!hasContent && !hasTemplate) {
    notFound();
  }

  const narrowPageIds = [
    '10000002', '10000003', '10000004', '10000005',
    '10000006', '10000007', '10000008', '10000009', '10000010',
  ];
  const containerWidthClass = (page.id && narrowPageIds.includes(page.id))
    ? 'max-w-5xl'
    : 'max-w-7xl';

  const containerBg = 'var(--page-bg, var(--background, #ffffff))';
  const containerText = 'var(--page-text, var(--foreground, #0f172a))';
  const headingColor = 'var(--page-heading-color, var(--foreground, #0f172a))';
  const contentColor = 'var(--page-content-color, var(--foreground, #0f172a))';
  const linkColor = 'var(--page-link-color, var(--primary, #1e293b))';

  return (
    <>
      {jsonLdScripts.map((script, idx) => (
        <Script
          key={idx}
          id={`page-jsonld-${idx}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: script }}
          strategy="afterInteractive"
        />
      ))}

      <main
        className="flex-grow"
        style={{
          backgroundColor: containerBg,
          color: containerText,
        }}
      >
        <div className={`${containerWidthClass} mx-auto px-4 sm:px-6 lg:px-8 w-full`}>
          {hasContent && (
            <div
              style={{
                paddingTop: 'var(--spacing-8, 2rem)',
                paddingBottom: 'var(--spacing-8, 2rem)',
              }}
            >
              <div
                className="prose max-w-none"
                style={{
                  // @ts-ignore - 自定义属性
                  '--tw-prose-body': contentColor,
                  '--tw-prose-headings': headingColor,
                  '--tw-prose-links': linkColor,
                  '--tw-prose-bold': headingColor,
                }}
                dangerouslySetInnerHTML={{ __html: page.content || '' }}
              />
            </div>
          )}

          {hasTemplate && (
            <div
              style={{
                marginTop: hasContent ? 'var(--spacing-8, 2rem)' : 0,
              }}
            >
              <TemplateRenderer data={templateData} runtime={runtime} />
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export default withStaticLocale(Page);