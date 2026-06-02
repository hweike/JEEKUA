// app/[locale]/blogs/[categorySlug]/page.tsx
import { notFound } from 'next/navigation';
import fs from 'fs';
import path from 'path';
import { getBlogCategories, getBlogPosts } from '@/lib/blog';
import { getTemplateById } from '@/lib/webbuilder/template-manager';
import { injectRuntimeDataSafe } from '@/lib/webbuilder/runtime-injector';
import WebBuilderClientWrapper from '@/components/webbuilder/WebBuilderClientWrapper';

export default async function BlogCategoryPage({
  params,
}: {
  params: Promise<{ locale: string; categorySlug: string }>;
}) {
  const { locale, categorySlug } = await params;

  // 1. 获取全部分类（用于左侧显示）
  const categories = getBlogCategories(locale);
  const categoryExists = categories.some((c) => c.slug === categorySlug);
  if (!categoryExists) notFound();

  // 2. 读取完整分类信息（获取 template 字段和 id）
  const categoriesPath = path.join(process.cwd(), 'data', 'blog', locale, 'categories.json');
  const fullCategories = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));
  const category = fullCategories.find((c: any) => c.slug === categorySlug);
  const templateId = category?.template || 'default_blogcollection_published';

  // 构建 slug -> id 映射（用于文章过滤）
  const slugToIdMap = new Map<string, string>();
  fullCategories.forEach((c: any) => slugToIdMap.set(c.slug, c.id));
  const targetCategoryId = slugToIdMap.get(categorySlug);

  // 3. 获取当前分类下的文章（通过 category ID 匹配）
  const allPosts = getBlogPosts(locale);
  const filteredPosts = allPosts.filter((post) => post.category === targetCategoryId);

  // 4. 获取模板
  const template = await getTemplateById(templateId);
  if (!template) {
    return (
      <div className="p-8 text-center text-red-500">
        模板不存在（ID: {templateId}），请检查。
      </div>
    );
  }

  // 5. 准备运行时数据（basePath 指向 /blogs/post）
  const runtime = {
    entityType: 'blog-collection',
    categories: categories.map((c) => ({ slug: c.slug, name: c.name })),
    posts: filteredPosts,
    currentCategorySlug: categorySlug,
    locale,
    basePath: `/${locale}/blogs/post`,
  };

  const finalData = injectRuntimeDataSafe(template.data, runtime);
  return <WebBuilderClientWrapper data={finalData} />;
}