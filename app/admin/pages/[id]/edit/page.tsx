import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import PageForm from '@/components/pages/PageForm';
import { readPage, writePage } from '@/lib/pages/storage';
import { getTemplateById } from '@/lib/webbuilder/template-manager';
import { createHash } from 'crypto';

function computeTemplateHash(data: any): string {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

interface EditPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ locale?: string }>;
}

export default async function EditPage({ params, searchParams }: EditPageProps) {
  const { id: pageId } = await params;
  const { locale = 'zh' } = await searchParams;

  let pageData = await readPage(locale, pageId);
  if (!pageData) {
    notFound();
  }

  // 如果页面缺少 templateData 且有关联模板，则自动补全并保存
  if (pageData.template && !pageData.templateData) {
    const template = await getTemplateById(pageData.template);
    if (template && template.data) {
      const templateData = template.data;
      const templateHash = template.hash || computeTemplateHash(templateData);
      pageData = {
        ...pageData,
        templateData,
        templateHash,
        updatedAt: new Date().toISOString(),
      };
      // 写入文件（同时更新 MD 文件和数据库元数据）
      await writePage(locale, pageData);
    }
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