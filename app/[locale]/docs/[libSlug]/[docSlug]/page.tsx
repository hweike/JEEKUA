import { notFound } from 'next/navigation';
import { getTemplateById } from '@/lib/webbuilder/template-manager';
import { injectRuntimeDataSafe } from '@/lib/webbuilder/runtime-injector';
import { getDocsLibBySlug, getDocsTree, getDocBySlug } from '@/lib/docs';
import WebBuilderClientWrapper from '@/components/webbuilder/WebBuilderClientWrapper';

export default async function DocPage({ params }: { params: { locale: string; libSlug: string; docSlug: string } }) {
  const { locale, libSlug, docSlug } = await params;

  // 1. 获取文档库
  const library = await getDocsLibBySlug(locale, libSlug);
  if (!library) notFound();

  // 2. 获取当前文档及内容（注意第二个参数是 library.slug，不是 id）
  const docData = await getDocBySlug(locale, library.slug, docSlug);
  if (!docData) notFound();
  const { doc, content } = docData;

  // 3. 获取文档树
  const docTree = await getDocsTree(locale, library.id);

  // 4. 获取文档库关联的模板
  const templateId = library.templateId || 'default_document_library_published';
  const template = await getTemplateById(templateId);
  if (!template) {
    return <div className="p-8 text-center">文档模板不存在，请联系管理员。</div>;
  }

  // 5. 准备运行时数据
  const runtime = {
    entityType: 'document',
    library: {
      id: library.id,
      name: library.name,
      slug: library.slug,
    },
    docTree,
    currentDoc: {
      id: doc.id,
      title: doc.title,
      slug: doc.slug,
      content,
    },
    locale,
  };

  const finalData = injectRuntimeDataSafe(template.data, runtime);
  return <WebBuilderClientWrapper data={finalData} />;
}