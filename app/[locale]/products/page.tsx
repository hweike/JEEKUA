import { redirect } from 'next/navigation';
import { getAllCategories } from '@/lib/products/categories';

export default async function ProductsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { productLines } = await getAllCategories(locale);

  if (!productLines || productLines.length === 0) {
    return <div className="p-8 text-center">暂无产品线</div>;
  }

  // 重定向到第一个产品线
  const firstSlug = productLines[0].slug || productLines[0].name;
  redirect(`/${locale}/products/${encodeURIComponent(firstSlug)}`);
}