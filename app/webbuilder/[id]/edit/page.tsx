// app/webbuilder/[id]/edit/page.tsx
import { notFound } from 'next/navigation';
import WebBuilderClient from '@/components/webbuilder/WebBuilderClient';
import { getTemplateById, updateTemplate } from '@/lib/webbuilder/template-manager';

export default async function EditPage({ params }: { params: { id: string } }) {
  const template = await getTemplateById(params.id);
  
  if (!template) {
    notFound();
  }
  
  // 将已验证的非空 template 赋值给常量，用于闭包
  const safeTemplate = template;
  
  async function handleSave(data: any) {
    'use server';
    const pageTitle = data?.root?.props?.title || safeTemplate.name;
    await updateTemplate(params.id, { name: pageTitle, data });
    return { success: true };
  }

  async function handlePublish(data: any) {
    'use server';
    const pageTitle = data?.root?.props?.title || safeTemplate.name;
    await updateTemplate(params.id, { name: pageTitle, data });
    return { success: true };
  }

  return (
    <WebBuilderClient
      data={safeTemplate.data}
      initialTitle={safeTemplate.name}
      initialCategory={safeTemplate.category}
      onSave={handleSave}
      onPublish={handlePublish}
    />
  );
}