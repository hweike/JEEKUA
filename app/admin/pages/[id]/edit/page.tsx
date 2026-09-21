// app/admin/pages/[id]/edit/page.tsx
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import PageForm from '@/components/pages/PageForm';
import { readPageFresh } from '@/lib/pages/storage';
import { getLanguageDisplayName } from '@/lib/languages/config';

// ✅ 禁用 Next.js 路由缓存
export const dynamic = 'force-dynamic';

// ✅ 禁用增量静态再生
export const revalidate = 0;

interface EditPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ locale?: string }>;
}

export default async function EditPage({ params, searchParams }: EditPageProps) {
  // ✅ 禁用 Server Component 缓存
  noStore();

  const { id: pageId } = await params;
  const { locale = 'zh' } = await searchParams;

  // ✅ 用无缓存版本读取，保证拿到最新数据
  const pageData = await readPageFresh(locale, pageId);
  if (!pageData) {
    notFound();
  }

  const siteName = getLanguageDisplayName(locale, 'zh');

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">编辑页面（{siteName}站）</h1>
      <Suspense fallback={<div>加载中...</div>}>
        <PageForm
          initialData={pageData}
          pageId={pageId}
          locale={locale}
          isEditing
          pageType={pageData.type}
        />
      </Suspense>
    </div>
  );
}