// app/[locale]/blogs/page.tsx
import { redirect } from 'next/navigation';
import { getCachedBlogCategories } from '@/lib/blog';

export default async function BlogsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const categories = await getCachedBlogCategories(locale);
  
  if (!categories || categories.length === 0) {
    redirect(`/${locale}`);
  }
  
  // 302 重定向到第一个分类（浏览器会自动跳转）
  redirect(`/${locale}/blogs/${categories[0].slug}`);
}

export const revalidate = 3600;