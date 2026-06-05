import { notFound, redirect } from 'next/navigation';
import { getVideoBySlug, getVideoCategories } from '@/lib/videosys';
import { Metadata } from 'next';
import VideoPlayer from '@/components/videosys-front/VideoPlayer';
import RelatedProducts from '@/components/front/RelatedProducts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { withDynamicLocale } from '@/lib/withPageLocale';

// 辅助函数：安全获取可能不存在的 description 字段
function getVideoDescription(video: any): string | null {
  return video.description ?? null;
}

type Params = Promise<{ locale: string; categorySlug: string; videoSlug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, videoSlug } = await params;
  const video = await getVideoBySlug(videoSlug, locale);
  if (!video) return {};
  return {
    title: video.seo_title || video.title,
    description: video.seo_description || '',
  };
}

async function VideoDetailPage({ params }: { params: Params }) {
  const { locale, categorySlug, videoSlug } = await params;
  const video = await getVideoBySlug(videoSlug, locale);
  if (!video) notFound();

  // 验证分类 slug 是否匹配
  const categories = await getVideoCategories(locale);
  const category = categories.find(c => c.slug === categorySlug);
  const actualCategorySlug = category?.slug || video.category_key;
  if (categorySlug !== actualCategorySlug) {
    redirect(`/${locale}/video/${actualCategorySlug}/${videoSlug}`);
  }

  // 视频标签（从视频数据中读取 tags 字段，若无则使用分类名称作为默认标签）
  const tags = video.tags ? video.tags.split(',').map((t: string) => t.trim()) : [category?.name];

  const videoDescription = getVideoDescription(video);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3">
            {video.title}
          </h1>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6 pb-4 border-b border-border">
            <span>更新于 {new Date(video.updated_at).toLocaleDateString(locale)}</span>
            {video.category_key && <span>分类：{category?.name}</span>}
          </div>

          <div className="aspect-video w-full mb-8 bg-black rounded-lg overflow-hidden">
            <VideoPlayer source={video.source_type} videoId={video.video_id} title={video.title} />
          </div>

          {tags.length > 0 && (
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-muted rounded-full text-sm text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {videoDescription && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-3">简介</h2>
              <div className="prose max-w-none text-muted-foreground">
                <p>{videoDescription}</p>
              </div>
            </div>
          )}

          {video.content && (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">详情</h2>
              <div className="prose max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-a:text-primary">
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
  );
}

export default withDynamicLocale(VideoDetailPage);