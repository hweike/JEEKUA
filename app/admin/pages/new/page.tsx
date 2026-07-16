import { Suspense } from 'react';
import PageForm from '@/components/pages/PageForm';

interface NewPageProps {
  searchParams: Promise<{ locale?: string; id?: string }>;
}

export default async function NewPage({ searchParams }: NewPageProps) {
  const { locale = 'zh', id = '' } = await searchParams;
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">新建页面</h1>
      <Suspense fallback={<div>加载中...</div>}>
        <PageForm locale={locale} initialId={id} />
      </Suspense>
    </div>
  );
}