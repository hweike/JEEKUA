// app/[locale]/search/page.tsx

import { notFound } from 'next/navigation';
import Script from 'next/script';
import { getTranslations } from 'next-intl/server';
import { getSiteSettings } from '@/lib/getSiteSettings';
import { getFooterConfig } from '@/lib/config-loader';
import { withDynamicLocale } from '@/lib/withPageLocale';
import SearchForm from '@/components/SearchForm';
import SearchResults from '@/components/SearchResults';
import SearchPagination from '@/components/SearchPagination';

interface SearchPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}

export const revalidate = 3600;

export async function generateMetadata({ params, searchParams }: SearchPageProps) {
  // ✅ 防御性检查
  const resolvedParams = await params;
  if (!resolvedParams?.locale) {
    return {
      title: 'Search',
      robots: 'noindex, follow',
    };
  }

  const { locale } = resolvedParams;
  const resolvedSearchParams = await searchParams;
  const { q } = resolvedSearchParams || {};

  const settings = await getSiteSettings();
  const footerConfig = await getFooterConfig(locale);
  const siteName = settings.siteName || 'Site Name';
  const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
  const t = await getTranslations({ locale, namespace: 'Search' });

  let twitterSite = '@feismanpower';
  if (footerConfig.social?.visible && footerConfig.social.links) {
    const twitterLink = footerConfig.social.links.find(
      (link) => link.platform === 'twitter'
    );
    if (twitterLink && twitterLink.url) {
      const match = twitterLink.url.match(/(?:twitter|x)\.com\/([^/?]+)/);
      if (match) twitterSite = `@${match[1]}`;
    }
  }

  const searchTerm = q || null;
  const hasQuery = searchTerm && searchTerm.trim() !== '';

  let title: string;
  if (hasQuery) {
    title = t('meta_title_with_query', { query: searchTerm }) || `${searchTerm} - 搜索 | ${siteName}`;
  } else {
    title = t('meta_title') || `搜索 | ${siteName}`;
  }

  let description: string;
  if (hasQuery) {
    description = t('meta_description_with_query', { query: searchTerm }) || `搜索 "${searchTerm}" 的相关结果`;
  } else {
    description = t('meta_description') || `搜索 ${siteName} 网站中的产品、文档和文章`;
  }

  const robots = hasQuery ? 'noindex, follow' : 'index, follow';
  const canonical = `${baseUrl}/${locale}/search`;
  const image = settings.socialShareImage || '';

  return {
    title,
    description,
    robots,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName,
      locale,
      images: image ? [{ url: image, width: 1200, height: 630 }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      site: twitterSite,
      title,
      description,
      images: image ? [image] : [],
    },
  };
}

async function SearchPage({ params, searchParams }: SearchPageProps) {
  // ✅ 防御性检查：构建时 Next.js 可能传入 undefined
  const resolvedParams = await params;
  if (!resolvedParams?.locale) {
    notFound();
  }

  const { locale } = resolvedParams;
  const resolvedSearchParams = await searchParams;
  const { q, page } = resolvedSearchParams || {};

  const settings = await getSiteSettings();
  const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
  const t = await getTranslations({ locale, namespace: 'Search' });

  const searchTerm = q || '';
  const currentPage = page ? parseInt(page, 10) || 1 : 1;

  let results: any[] = [];
  let totalResults = 0;
  let totalPages = 0;

  if (searchTerm.trim()) {
    try {
      const origin = baseUrl || `http://localhost:${process.env.PORT || 3000}`;
      const searchUrl = new URL('/api/search', origin);
      searchUrl.searchParams.set('q', searchTerm);
      searchUrl.searchParams.set('locale', locale);
      searchUrl.searchParams.set('page', String(currentPage));

      const res = await fetch(searchUrl.toString(), { next: { revalidate: 60 } });
      if (res.ok) {
        const data = await res.json();
        results = data.results || [];
        totalResults = data.total || results.length;
        totalPages = data.totalPages || 0;
      }
    } catch (error) {
      console.error('Search fetch error:', error);
    }
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': `${baseUrl}/#organization` },
      { '@type': 'WebSite', '@id': `${baseUrl}/#website` },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: t('breadcrumb_home') || '首页', item: `${baseUrl}/${locale}` },
          { '@type': 'ListItem', position: 2, name: t('breadcrumb_search') || '搜索', item: `${baseUrl}/${locale}/search` },
        ],
      },
      {
        '@type': 'WebPage',
        '@id': `${baseUrl}/${locale}/search#webpage`,
        name: searchTerm.trim() ? `${searchTerm} - 搜索` : t('meta_title') || '搜索',
        description: searchTerm.trim() ? `搜索 "${searchTerm}" 的相关结果` : t('meta_description') || '站内搜索',
        url: `${baseUrl}/${locale}/search`,
        inLanguage: locale,
        isPartOf: { '@id': `${baseUrl}/#website` },
        about: { '@type': 'Thing', name: '站内搜索' },
      },
    ],
  };

  const containerBg = 'var(--background, #ffffff)';
  const containerText = 'var(--foreground, #0f172a)';
  const titleColor = 'var(--foreground, #0f172a)';
  const subtitleColor = 'var(--muted-foreground, #64748b)';

  const resultCardBg = 'var(--card, #ffffff)';
  const resultCardBorder = 'var(--border, #e2e8f0)';
  const resultCardText = 'var(--card-foreground, #0f172a)';
  const resultCardHoverBg = 'var(--muted, #f1f5f9)';
  const resultTitleColor = 'var(--foreground, #0f172a)';
  const resultTitleHover = 'var(--primary, #1e293b)';
  const resultMetaColor = 'var(--muted-foreground, #64748b)';
  const resultExcerptColor = 'var(--foreground, #0f172a)';
  const dividerColor = 'var(--border, #e2e8f0)';

  const countColor = 'var(--muted-foreground, #64748b)';
  const emptyTextColor = 'var(--muted-foreground, #64748b)';
  const emptyHintColor = 'var(--muted-foreground, #64748b)';

  return (
    <>
      <Script
        id="search-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        strategy="afterInteractive"
      />

      <div
        className="mx-auto"
        style={{
          maxWidth: '56rem',
          marginLeft: 'auto',
          marginRight: 'auto',
          paddingLeft: 'var(--spacing-4, 1rem)',
          paddingRight: 'var(--spacing-4, 1rem)',
          paddingTop: 'var(--spacing-12, 3rem)',
          paddingBottom: 'var(--spacing-12, 3rem)',
          backgroundColor: containerBg,
          color: containerText,
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <h1
          style={{
            fontSize: 'var(--font-size-3xl, 1.875rem)',
            fontWeight: 'var(--font-weight-bold, 700)',
            color: titleColor,
            marginBottom: 'var(--spacing-2, 0.5rem)',
          }}
        >
          {t('title')}
        </h1>
        <p
          style={{
            color: subtitleColor,
            marginBottom: 'var(--spacing-8, 2rem)',
            fontSize: 'var(--font-size-base, 1rem)',
          }}
        >
          {t('subtitle')}
        </p>

        <SearchForm initialValue={searchTerm} locale={locale} />

        {searchTerm.trim() && (
          <div style={{ marginTop: 'var(--spacing-10, 2.5rem)' }}>
            <p
              style={{
                fontSize: 'var(--font-size-sm, 0.875rem)',
                color: countColor,
                marginBottom: 'var(--spacing-4, 1rem)',
              }}
            >
              {t('result_count', { count: totalResults, term: searchTerm })}
            </p>
            <div
              className="search-results-container"
              style={{
                '--search-result-bg': resultCardBg,
                '--search-result-border': resultCardBorder,
                '--search-result-text': resultCardText,
                '--search-result-hover-bg': resultCardHoverBg,
                '--search-result-title': resultTitleColor,
                '--search-result-title-hover': resultTitleHover,
                '--search-result-meta': resultMetaColor,
                '--search-result-excerpt': resultExcerptColor,
                '--search-divider': dividerColor,
              } as React.CSSProperties}
            >
              <SearchResults results={results} locale={locale} />
            </div>

            {totalPages > 1 && (
              <SearchPagination
                currentPage={currentPage}
                totalPages={totalPages}
                searchTerm={searchTerm}
                locale={locale}
              />
            )}
          </div>
        )}

        {searchTerm.trim() && results.length === 0 && (
          <div
            className="text-center"
            style={{
              marginTop: 'var(--spacing-10, 2.5rem)',
              paddingTop: 'var(--spacing-12, 3rem)',
              paddingBottom: 'var(--spacing-12, 3rem)',
            }}
          >
            <p
              style={{
                fontSize: 'var(--font-size-lg, 1.125rem)',
                color: emptyTextColor,
                marginBottom: 'var(--spacing-2, 0.5rem)',
              }}
            >
              {t('no_results')}
            </p>
            <p
              style={{
                fontSize: 'var(--font-size-sm, 0.875rem)',
                color: emptyHintColor,
              }}
            >
              {t('no_results_hint')}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

export default withDynamicLocale(SearchPage);