// app/[locale]/products/page.tsx
import { redirect } from 'next/navigation';
import { getAllCategories } from '@/lib/products/categories';
import { withStaticLocale } from '@/lib/withPageLocale';

// 设置 revalidate 配合缓存
export const revalidate = 600; // 10 分钟

async function ProductsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { productLines, categories } = await getAllCategories(locale);

  // 优先跳转到第一个产品线
  if (productLines && productLines.length > 0) {
    const firstSlug = productLines[0].slug;
    redirect(`/${locale}/products/${encodeURIComponent(firstSlug)}`);
  }

  // 降级：跳转到第一个分类
  if (categories && categories.length > 0) {
    const firstSlug = categories[0].slug;
    redirect(`/${locale}/products/${encodeURIComponent(firstSlug)}`);
  }

  return <div className="p-8 text-center">暂无产品数据</div>;
}

export default withStaticLocale(ProductsPage);