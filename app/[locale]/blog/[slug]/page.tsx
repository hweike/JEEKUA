// app/[locale]/blog/[slug]/page.tsx
import { getBlogPost } from '@/lib/blog';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import VideoEmbed from '@/components/VideoEmbed';
import RelatedProducts from '@/components/front/RelatedProducts';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const post = getBlogPost(locale, decodedSlug);
  if (!post) return { title: 'Not Found' };
  return {
    title: post.seo?.title || post.title,
    description: post.seo?.description || post.excerpt,
    keywords: post.seo?.keywords,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const post = getBlogPost(locale, decodedSlug);
  if (!post) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-2">{post.title}</h1>
      <div className="text-sm text-muted-foreground mb-8">
        {new Date(post.date).toLocaleDateString(locale)}
        {post.author && <span className="ml-4">作者：{post.author}</span>}
      </div>
      {post.videoUrl && (
        <div className="mb-8">
          <VideoEmbed url={post.videoUrl} />
        </div>
      )}
      <div className="prose max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-a:text-primary">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
          {post.content}
        </ReactMarkdown>
      </div>

      {/* 标签区域：仅当有标签时显示 */}
      {post.tags && post.tags.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-2">标签</h3>
          <div className="flex flex-wrap gap-2">
            {post.tags.map(tag => (
              <span key={tag} className="px-2 py-1 bg-muted rounded-md text-sm text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 相关产品区域：组件自身判断无产品时不显示任何内容 */}
      <RelatedProducts resourceType="blog" resourceId={post.id} />
    </div>
  );
}