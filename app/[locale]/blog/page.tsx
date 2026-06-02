import { notFound } from 'next/navigation';
import { getTemplateById } from '@/lib/webbuilder/template-manager';
import { injectRuntimeDataSafe } from '@/lib/webbuilder/runtime-injector';
import { getBlogCategories, getBlogPosts } from '@/lib/blog';
import { getSiteSettings } from '@/lib/getSiteSettings';
import WebBuilderClientWrapper from '@/components/webbuilder/WebBuilderClientWrapper';

export default async function BlogIndexPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { locale } = await params;
  const { category: selectedCategory } = await searchParams;

  // 1. 获取博客数据
  const categories = getBlogCategories(locale);
  const allPosts = getBlogPosts(locale);
  const posts = selectedCategory
    ? allPosts.filter((p) => p.category === selectedCategory)
    : allPosts;

  // 2. 获取博客模板 ID（可从站点设置读取，或使用默认值）
  const siteSettings = await getSiteSettings();
  const templateId = siteSettings.blogTemplateId || 'default_blog_published';
  const template = await getTemplateById(templateId);


  if (!template) {
    return <div className="p-8 text-center">博客模板不存在，请联系管理员</div>;
  }

  // 3. 准备运行时数据
  const runtime = {
    entityType: 'blog',
    categories: categories.map((cat) => ({ slug: cat.slug, name: cat.name })),
    posts,
    currentCategorySlug: selectedCategory || null,
    locale,
    basePath: `/${locale}/blog`,
  };

  // 4. 注入数据并渲染
  const finalData = injectRuntimeDataSafe(template.data, runtime);

  return <WebBuilderClientWrapper data={finalData} />;
}