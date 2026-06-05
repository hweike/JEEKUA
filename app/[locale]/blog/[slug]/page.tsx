import { getBlogPost } from '@/lib/blog';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import VideoEmbed from '@/components/VideoEmbed';
import RelatedProducts from '@/components/front/RelatedProducts';
import { withDynamicLocale } from '@/lib/withPageLocale';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const post = await getBlogPost(locale, decodedSlug);
  if (!post) return { title: 'Not Found' };
  return {
    title: post.seo?.title || post.title,
    description: post.seo?.description || post.excerpt,
    keywords: post.seo?.keywords,
  };
}

async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const post = await getBlogPost(locale, decodedSlug);
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

      {post.tags && post.tags.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-2">标签</h3>
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag: string) => (
              <span key={tag} className="px-2 py-1 bg-muted rounded-md text-sm text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <RelatedProducts resourceType="blog" resourceId={post.id} />
    </div>
  );
}

export default withDynamicLocale(BlogPostPage);