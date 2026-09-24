// app/[locale]/video/[categorySlug]/[videoSlug]/page.tsx
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { getCachedVideoBySlug, getCachedVideoCategories, getAllPublishedVideos } from '@/lib/videosys';
import { withStaticLocale } from '@/lib/withPageLocale';
import { getSeoInput } from '@/lib/seo/getSeoInput';
import { getSiteSettings } from '@/lib/getSiteSettings';
import { getImageUrl } from '@/lib/files/url';
import VideoPlayer from '@/components/videosys-front/VideoPlayer';
import RelatedProducts from '@/components/front/RelatedProducts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import VideoDetailLoading from './loading';

type Params = Promise<{ locale: string; categorySlug: string; videoSlug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const resolvedParams = await params;
  if (!resolvedParams?.locale) {
    return {
      title: 'Video',
      robots: 'noindex, follow',
    };
  }

  const { locale, videoSlug } = resolvedParams;

  const settings = await getSiteSettings();
  const siteName = settings.siteName || 'Site Name';
  const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '');

  const video = await getCachedVideoBySlug(locale, videoSlug);
  if (!video) {
    return { title: 'Not Found' };
  }

  const title = video.seo_title || video.title || 'Video';
  const canonical = `${baseUrl}/${locale}/video/${video.categorySlug || video.category_key}/${video.slug}`;

  let description = video.seo_description || '';
  if (!description && video.content) {
    const plainText = video.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    description = plainText.slice(0, 200);
  }
  description = description || '';

  const image = video.thumbnail ? getImageUrl(video.thumbnail) : '';

  const openGraph: any = {
    title: `${title} | ${siteName}`,
    description,
    url: canonical,
    siteName,
    locale,
    type: 'website',
  };
  if (image && image.trim() !== '') {
    openGraph.images = [{ url: image, width: 1280, height: 720 }];
  }

  const twitter: any = {
    card: 'summary_large_image',
    site: '@feismanpower',
    title: `${title} | ${siteName}`,
    description,
  };
  if (image && image.trim() !== '') {
    twitter.images = [image];
  }

  return {
    title: `${title} | ${siteName}`,
    description,
    robots: 'index, follow',
    alternates: { canonical },
    openGraph,
    twitter,
  };
}

interface VideoDetailContentProps {
  locale: string;
  categorySlug: string;
  videoSlug: string;
}

async function VideoDetailContent({ locale, categorySlug, videoSlug }: VideoDetailContentProps) {
  const settings = await getSiteSettings();
  const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
  const siteName = settings.siteName || 'Site Name';
  const t = await getTranslations({ locale, namespace: 'Video' });

  const video = await getCachedVideoBySlug(locale, videoSlug);
  if (!video) notFound();

  const categories = await getCachedVideoCategories(locale);
  const category = categories.find((c) => c.slug === categorySlug);
  const actualCategorySlug = category?.slug || video.category_key;
  if (categorySlug !== actualCategorySlug) {
    redirect(`/${locale}/video/${actualCategorySlug}/${videoSlug}`);
  }

  const tags = video.tags
    ? video.tags.split(',').map((t: string) => t.trim()).filter(t => t && t !== '[]')
    : [];

  const videoDescription = video.seo_description || video.content?.slice(0, 200) || null;

  const data = { video, category, siteName, baseUrl, t };
  const seoInput = await getSeoInput('videoDetail', videoSlug, locale, data);
  let jsonLdScripts: string[] = [];
  if (seoInput?.structuredData) {
    const structuredData = seoInput.structuredData as any;
    if (structuredData && structuredData['@graph'] && Array.isArray(structuredData['@graph'])) {
      jsonLdScripts = [JSON.stringify(structuredData)];
    } else {
      jsonLdScripts = [JSON.stringify(structuredData)];
    }
  }

  const containerBg = 'var(--video-detail-bg, var(--background, #ffffff))';
  const containerText = 'var(--video-detail-text, var(--foreground, #0f172a))';
  const titleColor = 'var(--video-detail-title-color, var(--foreground, #0f172a))';
  const metaColor = 'var(--video-detail-meta-color, var(--muted-foreground, #64748b))';
  const dividerColor = 'var(--video-detail-divider, var(--border, #e2e8f0))';
  const tagBg = 'var(--video-detail-tag-bg, var(--muted, #f1f5f9))';
  const tagText = 'var(--video-detail-tag-text, var(--muted-foreground, #64748b))';
  const headingColor = 'var(--video-detail-heading-color, var(--foreground, #0f172a))';
  const contentColor = 'var(--video-detail-content-color, var(--foreground, #0f172a))';
  const linkColor = 'var(--video-detail-link-color, var(--primary, #1e293b))';
  const playerRadius = 'var(--video-detail-player-radius, var(--radius, 0.625rem))';

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
        className="mx-auto"
        style={{
          maxWidth: '1280px',
          marginLeft: 'auto',
          marginRight: 'auto',
          paddingLeft: 'var(--spacing-4, 1rem)',
          paddingRight: 'var(--spacing-4, 1rem)',
          paddingTop: 'var(--spacing-8, 2rem)',
          paddingBottom: 'var(--spacing-8, 2rem)',
          backgroundColor: containerBg,
          color: containerText,
        }}
      >
        <div
          className="flex flex-col lg:flex-row"
          style={{ gap: 'var(--spacing-8, 2rem)' }}
        >
          <div className="flex-1 min-w-0">
            <h1
              className="font-bold"
              style={{
                fontSize: 'var(--font-size-2xl, 1.5rem)',
                fontWeight: 'var(--font-weight-bold, 700)',
                color: titleColor,
                marginBottom: 'var(--spacing-3, 0.75rem)',
              }}
            >
              {video.title}
            </h1>

            <div
              className="flex items-center"
              style={{
                gap: 'var(--spacing-4, 1rem)',
                fontSize: 'var(--font-size-sm, 0.875rem)',
                color: metaColor,
                marginBottom: 'var(--spacing-6, 1.5rem)',
                paddingBottom: 'var(--spacing-4, 1rem)',
                borderBottom: `1px solid ${dividerColor}`,
              }}
            >
              <span>{t('updatedOn')} {new Date(video.updated_at).toLocaleDateString(locale)}</span>
              {video.category_key && category && (
                <span>{t('categoryLabel')}{category.name}</span>
              )}
            </div>

            <div
              className="aspect-video w-full bg-black overflow-hidden"
              style={{
                marginBottom: 'var(--spacing-8, 2rem)',
                borderRadius: playerRadius,
              }}
            >
              <VideoPlayer source={video.source_type} videoId={video.video_id} title={video.title} />
            </div>

            {tags.length > 0 && (
              <div style={{ marginBottom: 'var(--spacing-6, 1.5rem)' }}>
                <div
                  className="flex flex-wrap"
                  style={{ gap: 'var(--spacing-2, 0.5rem)' }}
                >
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className="rounded-full"
                      style={{
                        paddingLeft: 'var(--spacing-3, 0.75rem)',
                        paddingRight: 'var(--spacing-3, 0.75rem)',
                        paddingTop: 'var(--spacing-1, 0.25rem)',
                        paddingBottom: 'var(--spacing-1, 0.25rem)',
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

            {videoDescription && (
              <div style={{ marginBottom: 'var(--spacing-8, 2rem)' }}>
                <h2
                  style={{
                    fontSize: 'var(--font-size-lg, 1.125rem)',
                    fontWeight: 'var(--font-weight-semibold, 600)',
                    color: headingColor,
                    marginBottom: 'var(--spacing-3, 0.75rem)',
                  }}
                >
                  {t('introduction')}
                </h2>
                <div className="prose max-w-none" style={{ color: contentColor }}>
                  <p>{videoDescription}</p>
                </div>
              </div>
            )}

            {video.content && (
              <div>
                <div
                  className="prose max-w-none"
                  style={{
                    '--tw-prose-body': contentColor,
                    '--tw-prose-headings': headingColor,
                    '--tw-prose-links': linkColor,
                    '--tw-prose-bold': headingColor,
                  } as React.CSSProperties}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                    {video.content}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>

          <aside className="w-full lg:w-80 flex-shrink-0">
            <div className="sticky top-24">
              <RelatedProducts resourceType="video" resourceId={video.id} />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

async function VideoDetailPage({ params }: { params: Params }) {
  const resolvedParams = await params;
  if (!resolvedParams?.locale) {
    notFound();
  }

  const { locale, categorySlug, videoSlug } = resolvedParams;
  const decodedVideoSlug = decodeURIComponent(videoSlug);

  return (
    <Suspense fallback={<VideoDetailLoading />}>
      <VideoDetailContent
        locale={locale}
        categorySlug={categorySlug}
        videoSlug={decodedVideoSlug}
      />
    </Suspense>
  );
}

// ============================================================
// ✅ ISR 预生成：为所有已发布视频生成静态 HTML，访问最快
// ============================================================
export async function generateStaticParams() {
  const t0 = Date.now();
  const callsite = new Error().stack?.split('\n')[2]?.trim() || 'unknown';
  console.log(`[video/[categorySlug]/[videoSlug]] generateStaticParams 开始（调用来源: ${callsite}）`);

  try {
    const videos = await getAllPublishedVideos();
    const elapsed = Date.now() - t0;
    console.log(`[video/[categorySlug]/[videoSlug]] generateStaticParams: ${videos.length} 个视频，总耗时 ${elapsed}ms`);

    return videos.map((v) => ({
      locale: v.locale,
      categorySlug: v.categorySlug,
      videoSlug: v.videoSlug,
    }));
  } catch (err) {
    const elapsed = Date.now() - t0;
    console.error(`[video/[categorySlug]/[videoSlug]] generateStaticParams 失败（耗时 ${elapsed}ms）:`, err);
    return [];
  }
}

// ✅ 预生成所有视频（构建时），新增视频由 dynamicParams 按需生成
export const dynamicParams = true;
export const revalidate = 3600;
export default withStaticLocale(VideoDetailPage);