// app/[locale]/docs/[libSlug]/[docSlug]/page.tsx

import { notFound } from 'next/navigation';
import Script from 'next/script';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { getTranslations } from 'next-intl/server';
import { withDynamicLocale } from '@/lib/withPageLocale';
import { getSeoInput } from '@/lib/seo/getSeoInput';
import { generatePageMetadata } from '@/lib/seo';
import { getSiteSettings } from '@/lib/getSiteSettings';
import {
  getCachedDocsLibBySlug,
  getCachedDocBySlug,
  getCachedDocsTree,
} from '@/lib/docs';

type Props = {
  params: Promise<{ locale: string; libSlug: string; docSlug: string }>;
};

// ===== generateMetadata =====
export async function generateMetadata({ params }: Props) {
  const { locale, libSlug, docSlug } = await params;

  const settings = await getSiteSettings();
  const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const siteName = settings.siteName || 'Site Name';

  const library = await getCachedDocsLibBySlug(libSlug, locale);
  if (!library) {
    return { title: '文档库未找到', robots: 'noindex, follow' };
  }

  const doc = await getCachedDocBySlug(locale, library.id, docSlug);
  if (!doc) {
    return { title: '文档未找到', robots: 'noindex, follow' };
  }

  const docTree = await getCachedDocsTree(locale, library.id);

  const seoData = {
    library,
    doc,
    docTree,
    siteName,
    baseUrl,
  };

  const seoInput = await getSeoInput('doc', docSlug, locale, seoData);
  if (!seoInput) {
    return {
      title: `${doc.title} | ${siteName}`,
      description: doc.seo_description || doc.content?.slice(0, 160) || '',
      robots: 'index, follow',
      alternates: {
        canonical: `${baseUrl}/${locale}/docs/${libSlug}/${docSlug}`,
      },
    };
  }

  const { metadata } = await generatePageMetadata(seoInput, locale);
  return metadata;
}

// ===== 页面组件 =====
async function DocPage({ params }: Props) {
  const { locale, libSlug, docSlug } = await params;
  const t = await getTranslations('Docs');

  const library = await getCachedDocsLibBySlug(libSlug, locale);
  if (!library) notFound();

  const docData = await getCachedDocBySlug(locale, library.id, docSlug);
  if (!docData) notFound();

  const doc = docData;
  const content = docData.content;

  const docTree = await getCachedDocsTree(locale, library.id);

  // 生成 JSON-LD
  const settings = await getSiteSettings();
  const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const siteName = settings.siteName || 'Site Name';

  const seoData = { library, doc, docTree, siteName, baseUrl };
  const seoInput = await getSeoInput('doc', docSlug, locale, seoData);
  let jsonLdScripts: string[] = [];
  if (seoInput?.structuredData) {
    const structured = seoInput.structuredData as any;
    if (structured['@graph'] && Array.isArray(structured['@graph'])) {
      jsonLdScripts = [JSON.stringify(structured)];
    } else {
      jsonLdScripts = [JSON.stringify(structured)];
    }
  }

  // ============================================================
  // ✅ 文档详情页专属 CSS 变量（带最终 fallback）
  // ============================================================
  const containerBg = 'var(--doc-detail-bg, var(--background, #ffffff))';
  const containerText = 'var(--doc-detail-text, var(--foreground, #0f172a))';
  const titleColor = 'var(--doc-detail-title-color, var(--foreground, #0f172a))';
  const headingColor = 'var(--doc-detail-heading-color, var(--foreground, #0f172a))';
  const contentColor = 'var(--doc-detail-content-color, var(--foreground, #0f172a))';
  const linkColor = 'var(--doc-detail-link-color, var(--primary, #1e293b))';

  return (
    <>
      {jsonLdScripts.map((script, idx) => (
        <Script
          key={idx}
          id={`doc-jsonld-${idx}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: script }}
          strategy="afterInteractive"
        />
      ))}
      <div
        className="max-w-3xl mx-auto"
        style={{
          backgroundColor: containerBg,
          color: containerText,
          paddingLeft: 'var(--spacing-4, 1rem)',
          paddingRight: 'var(--spacing-4, 1rem)',
          paddingTop: 'var(--spacing-12, 3rem)',
          paddingBottom: 'var(--spacing-12, 3rem)',
        }}
      >
        <h1
          style={{
            fontSize: 'var(--font-size-4xl, 2.25rem)',
            fontWeight: 'var(--font-weight-bold, 700)',
            marginBottom: 'var(--spacing-2, 0.5rem)',
            color: titleColor,
          }}
        >
          {doc.title}
        </h1>

        <div
          className="prose max-w-none"
          style={{
            // @ts-ignore - 自定义属性
            '--tw-prose-body': contentColor,
            '--tw-prose-headings': headingColor,
            '--tw-prose-links': linkColor,
            '--tw-prose-bold': headingColor,
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
            {content || t('noContent')}
          </ReactMarkdown>
        </div>
      </div>
    </>
  );
}

export const revalidate = 3600;
export default withDynamicLocale(DocPage);