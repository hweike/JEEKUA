// app/[locale]/blog/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { Suspense, cache } from 'react';
import { getTranslations } from 'next-intl/server';
import { getCachedBlogPost, getCachedBlogCategories } from '@/lib/blog';
import { withDynamicLocale } from '@/lib/withPageLocale';
import { getSeoInput } from '@/lib/seo/getSeoInput';
import { generatePageMetadata } from '@/lib/seo';
import { getSiteSettings } from '@/lib/getSiteSettings';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import VideoEmbed from '@/components/VideoEmbed';
import RelatedProducts from '@/components/front/RelatedProducts';
import BlogPostLoading from './loading';

// ============================================================
// ✅ React cache：同一请求内只执行一次，消除 generateMetadata
//    与 BlogPostContent 之间的重复查询
// ============================================================
const getPostOnce = cache(getCachedBlogPost);
const getCategoriesOnce = cache(getCachedBlogCategories);
const getSeoInputOnce = cache(getSeoInput);
const getSiteSettingsOnce = cache(getSiteSettings);

// ===== generateMetadata =====
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const settings = await getSiteSettingsOnce();
  const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
  const siteName = settings.siteName || 'Site Name';

  const t = await getTranslations({ locale, namespace: 'Blog' });
  const post = await getPostOnce(locale, slug);
  if (!post) {
    return {
      title: 'Not Found',
      robots: 'noindex, follow',
    };
  }

  const categories = await getCategoriesOnce(locale);
  const category = categories.find((c) => c.id === post.category) || null;

  const data = {
    post,
    category,
    siteName,
    baseUrl,
    t,
  };

  const seoInput = await getSeoInputOnce('blogPost', slug, locale, data);
  if (!seoInput) {
    return {
      title: post.title || 'Article',
      robots: 'index, follow',
    };
  }

  const { metadata } = await generatePageMetadata(seoInput, locale);
  return {
    ...metadata,
    alternates: {
      canonical: seoInput.canonical || `${baseUrl}/${locale}/blog/${slug}`,
    },
  };
}

// ===== 内容组件（用于 Suspense） =====
interface BlogPostContentProps {
  locale: string;
  slug: string;
}

async function BlogPostContent({ locale, slug }: BlogPostContentProps) {
  const settings = await getSiteSettingsOnce();
  const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
  const siteName = settings.siteName || 'Site Name';
  const t = await getTranslations({ locale, namespace: 'Blog' });

  const post = await getPostOnce(locale, slug);
  if (!post) notFound();

  const categories = await getCategoriesOnce(locale);
  const category = categories.find((c) => c.id === post.category) || null;

  // 生成 JSON-LD
  const data = { post, category, siteName, baseUrl, t };
  const seoInput = await getSeoInputOnce('blogPost', slug, locale, data);
  let jsonLdScripts: string[] = [];
  if (seoInput?.structuredData) {
    jsonLdScripts = [JSON.stringify(seoInput.structuredData)];
  }

  // ============================================================
  // ✅ 博客详情页专属 CSS 变量（带最终 fallback）
  // ============================================================
  const containerBg = 'var(--blog-detail-bg, var(--background, #ffffff))';
  const containerText = 'var(--blog-detail-text, var(--foreground, #0f172a))';
  const titleColor = 'var(--blog-detail-title-color, var(--foreground, #0f172a))';
  const metaColor = 'var(--blog-detail-meta-color, var(--muted-foreground, #64748b))';
  const headingColor = 'var(--blog-detail-heading-color, var(--foreground, #0f172a))';
  const contentColor = 'var(--blog-detail-content-color, var(--foreground, #0f172a))';
  const linkColor = 'var(--blog-detail-link-color, var(--primary, #1e293b))';
  const tagBg = 'var(--blog-detail-tag-bg, var(--muted, #f1f5f9))';
  const tagText = 'var(--blog-detail-tag-text, var(--muted-foreground, #64748b))';
  const videoRadius = 'var(--blog-detail-video-radius, var(--radius, 0.625rem))';

  return (
    <>
      {jsonLdScripts.map((script, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: script }}
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
          {post.title}
        </h1>
        <div
          style={{
            fontSize: 'var(--font-size-sm, 0.875rem)',
            marginBottom: 'var(--spacing-8, 2rem)',
            color: metaColor,
          }}
        >
          {new Date(post.date).toLocaleDateString(locale)}
          {post.author && (
            <span style={{ marginLeft: 'var(--spacing-4, 1rem)' }}>
              {t('authorPrefix')}{post.author}
            </span>
          )}
        </div>

        {post.videoUrl && (
          <div
            className="overflow-hidden"
            style={{
              marginBottom: 'var(--spacing-8, 2rem)',
              borderRadius: videoRadius,
            }}
          >
            <VideoEmbed url={post.videoUrl} />
          </div>
        )}

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
            {post.content}
          </ReactMarkdown>
        </div>

        {post.tags && post.tags.length > 0 && (
          <div style={{ marginTop: 'var(--spacing-8, 2rem)' }}>
            <h3
              style={{
                fontSize: 'var(--font-size-lg, 1.125rem)',
                fontWeight: 'var(--font-weight-semibold, 600)',
                marginBottom: 'var(--spacing-2, 0.5rem)',
                color: headingColor,
              }}
            >
              {t('tags')}
            </h3>
            <div
              className="flex flex-wrap"
              style={{ gap: 'var(--spacing-2, 0.5rem)' }}
            >
              {post.tags.map((tag: string) => (
                <span
                  key={tag}
                  style={{
                    paddingLeft: 'var(--spacing-2, 0.5rem)',
                    paddingRight: 'var(--spacing-2, 0.5rem)',
                    paddingTop: 'var(--spacing-1, 0.25rem)',
                    paddingBottom: 'var(--spacing-1, 0.25rem)',
                    borderRadius: 'var(--radius-md, 0.625rem)',
                    fontSize: 'var(--font-size-sm, 0.875rem)',
                    backgroundColor: tagBg,
                    color: tagText,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <RelatedProducts resourceType="blog" resourceId={post.id} />
      </div>
    </>
  );
}

// ===== 页面组件 =====
interface BlogPostPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

async function BlogPostPage({ params }: BlogPostPageProps) {
  const { locale, slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  return (
    <Suspense fallback={<BlogPostLoading />}>
      <BlogPostContent locale={locale} slug={decodedSlug} />
    </Suspense>
  );
}

export async function generateStaticParams() {
  return [];
}

export const revalidate = 3600;
export default withDynamicLocale(BlogPostPage);