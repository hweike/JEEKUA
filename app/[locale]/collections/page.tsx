// app/[locale]/collections/page.tsx
import { redirect } from 'next/navigation';
import { getAllCategories } from '@/lib/products/categories';
import { withStaticLocale } from '@/lib/withPageLocale';

async function CollectionsIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { categories } = await getAllCategories(locale);

  // 如果没有分类，显示提示信息
  if (!categories || categories.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-4">📂</div>
        <h1 className="text-2xl font-semibold text-gray-700 mb-2">暂无分类</h1>
        <p className="text-gray-500">请先在后台创建产品分类。</p>
      </div>
    );
  }

  // 获取第一个分类的 slug
  const firstCategory = categories.sort((a: any, b: any) => (a.order || 0) - (b.order || 0))[0];
  const firstSlug = firstCategory.slug;

  // 重定向到第一个分类
  redirect(`/${locale}/collections/${encodeURIComponent(firstSlug)}`);
}

export default withStaticLocale(CollectionsIndexPage);