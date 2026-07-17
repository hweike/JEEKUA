// app/[locale]/page.tsx
import { notFound } from 'next/navigation';
import { readPage, getHomePageId } from '@/lib/pages/storage';
import { TemplateRenderer } from '@/components/webbuilder/TemplateRenderer';
import { generatePageMetadata } from '@/lib/seo';
import { getSeoInput } from '@/lib/seo/getSeoInput';
import { withStaticLocale } from '@/lib/withPageLocale';
import { getSiteSettings } from '@/lib/getSiteSettings';

// ===== ISR 配置 =====
export const revalidate = 3600; // 1小时

export async function generateStaticParams() {
  return [{ locale: 'zh' }, { locale: 'en' }];
}
// ===================

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: HomePageProps) {
  const { locale } = await params;

  const settings = await getSiteSettings();
  const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '');

  const seoInput = await getSeoInput('home', 'home', locale);

  if (!seoInput) {
    return {
      alternates: {
        canonical: `${baseUrl}/${locale}`,
      },
      openGraph: {
        locale: locale,
      },
    };
  }

  const { metadata } = await generatePageMetadata(seoInput, locale);

  const canonicalPath = seoInput.canonical || seoInput.url || `/${locale}`;
  const canonical = canonicalPath.startsWith('http')
    ? canonicalPath
    : `${baseUrl}${canonicalPath.startsWith('/') ? '' : '/'}${canonicalPath}`;

  const openGraph = {
    ...metadata.openGraph,
    locale: locale,
    url: metadata.openGraph?.url || canonical,
  };

  return {
    ...metadata,
    alternates: {
      canonical,
    },
    openGraph,
  };
}

async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

  const pageId = await getHomePageId(locale);
  if (!pageId) notFound();

  const page = await readPage(locale, pageId);
  if (!page) notFound();

  const templateData = page.templateData;
  if (!templateData) notFound();

  const seoInput = await getSeoInput('home', 'home', locale);
  const seoTitle = seoInput?.title || page.title || '';

  const runtime = {
    seoTitle: seoTitle,
    locale: locale,
  };

  let jsonLdScripts: string[] = [];
  if (seoInput) {
    const { jsonLdScripts: scripts } = await generatePageMetadata(seoInput, locale);
    jsonLdScripts = scripts;
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
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <TemplateRenderer data={templateData} runtime={runtime} />
        </div>
      </main>
    </>
  );
}

export default withStaticLocale(HomePage);