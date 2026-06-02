// app/[locale]/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { generatePageMetadata } from '@/lib/seo';
import { getSeoInput } from '@/lib/seo/getSeoInput';
import { getTemplateById } from '@/lib/webbuilder/template-manager';
import { TemplateRenderer } from '@/components/webbuilder/TemplateRenderer';
import { getPageIdBySlug, readPage } from '@/lib/pages/storage';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

// 生成 Metadata 和 JSON-LD 脚本
export async function generateMetadata({ params }: PageProps) {
  const { locale, slug } = await params;
  const seoInput = await getSeoInput('page', slug, locale);
  if (!seoInput) return {};
  const { metadata } = await generatePageMetadata(seoInput, locale);
  return metadata;
}

export default async function Page({ params }: PageProps) {
  const { locale, slug } = await params;

  // 获取页面数据
  const pageId = await getPageIdBySlug(locale, slug);
  if (!pageId) notFound();
  const page = await readPage(locale, pageId);
  if (!page || page.visible !== 'visible') notFound();

  // 获取 SEO 数据（用于注入 JSON-LD 脚本）
  const seoInput = await getSeoInput('page', slug, locale);
  let jsonLdScripts: string[] = [];
  if (seoInput) {
    const { jsonLdScripts: scripts } = await generatePageMetadata(seoInput, locale);
    jsonLdScripts = scripts;
  }

  // 尝试加载页面关联的模板（如果存在）
  let template = null;
  if (page.template) {
    template = await getTemplateById(page.template);
  }

  // 如果模板不存在，回退到 Markdown 渲染
  const hasTemplate = template && template.data;

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
          {hasTemplate ? (
            // 使用 webbuilder 模板渲染
            <TemplateRenderer data={template.data} />
          ) : (
            // 回退到传统 Markdown 渲染（保持对齐和样式）
            <article className="prose max-w-none">
              <h1>{page.title}</h1>
              <div dangerouslySetInnerHTML={{ __html: page.content }} />
            </article>
          )}
        </div>
      </main>
    </>
  );
}