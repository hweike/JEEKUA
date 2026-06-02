// app/webbuilder/[id]/edit/page.tsx
import WebBuilderClient from '@/components/webbuilder/WebBuilderClient';
import { getTemplateById, updateTemplate } from '@/lib/webbuilder/template-manager';

export default async function EditPage({ params }: { params: { id: string } }) {
  const template = await getTemplateById(params.id);
  
  async function handleSave(data: any) {
    'use server';
    const pageTitle = data?.root?.props?.title || template.name;
    await updateTemplate(params.id, { name: pageTitle, data });
    return { success: true };
  }

  async function handlePublish(data: any) {
    'use server';
    const pageTitle = data?.root?.props?.title || template.name;
    await updateTemplate(params.id, { name: pageTitle, data });
    return { success: true };
  }

  return (
    <WebBuilderClient
      data={template.data}
      initialTitle={template.name}
      initialCategory={template.category}
      onSave={handleSave}
      onPublish={handlePublish}
    />
  );
}