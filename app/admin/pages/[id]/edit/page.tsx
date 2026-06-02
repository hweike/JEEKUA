import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import PageForm from '@/components/pages/PageForm';
import { readPage } from '@/lib/pages/storage';

interface EditPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ locale?: string }>;
}

export default async function EditPage({ params, searchParams }: EditPageProps) {
  const { id: pageId } = await params;
  const { locale = 'zh' } = await searchParams;
  
  const pageData = await readPage(locale, pageId);
  if (!pageData) {
    notFound();
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">编辑页面</h1>
      <Suspense fallback={<div>加载中...</div>}>
        <PageForm
          initialData={pageData}
          pageId={pageId}
          locale={locale}
          isEditing
        />
      </Suspense>
    </div>
  );
}