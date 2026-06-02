import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getTemplateById } from '@/lib/webbuilder/template-manager';
import { TemplateRenderer } from '@/components/webbuilder/TemplateRenderer';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { PREVIEW_STYLES } from '@/lib/webbuilder/preview-styles';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const template = await getTemplateById(id);
  if (!template) return { title: '未命名页面' };
  return { title: template.name };
}

export default async function PreviewTemplatePage({ params }: Props) {
  const { id } = await params;
  const template = await getTemplateById(id);
  if (!template) notFound();

  const puckData = template.data || {
    root: { props: { title: template.name } },
    content: [],
    zones: {},
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PREVIEW_STYLES }} />
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <TemplateRenderer data={puckData} />
        </main>
        <Footer />
      </div>
    </>
  );
}