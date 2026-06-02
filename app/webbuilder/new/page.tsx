import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import WebBuilderClient from '@/components/webbuilder/WebBuilderClient';
import { createTemplate } from '@/lib/webbuilder/template-manager';

export const metadata: Metadata = {
  title: '网页模板构建器',
};

const DEFAULT_PUCK_DATA = {
  root: { props: { title: '新建页面' } },
  content: [],
  zones: {},
};

export default function NewTemplatePage() {
  async function handleSave(data: any) {
    'use server';
    const template = await createTemplate({
      name: '未命名模板',
      category: 'page',
      data,
    });
    redirect(`/webbuilder/${template.id}/edit`);
  }

  async function handlePublish(data: any) {
    'use server';
    const template = await createTemplate({
      name: '未命名模板',
      category: 'page',
      data,
    });
    redirect(`/webbuilder/${template.id}/edit`);
  }

  return (
    <WebBuilderClient
      data={DEFAULT_PUCK_DATA}
      initialTitle="未命名模板"
      initialCategory="page"
      onSave={handleSave}
      onPublish={handlePublish}
      readOnly={false}
    />
  );
}