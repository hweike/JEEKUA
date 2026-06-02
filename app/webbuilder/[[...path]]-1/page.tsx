import { notFound } from 'next/navigation';
import WebBuilderPageClient from './page.client';

// 动态生成标题
export async function generateMetadata({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  const pathSegments = path || [];

  // 判断是否为编辑模式：路径为 /new 或 /[id]/edit 或 空路径
  const isEdit =
    pathSegments.length === 0 ||
    pathSegments[0] === 'new' ||
    pathSegments[pathSegments.length - 1] === 'edit';

  if (isEdit) {
    return { title: '网页模板构建器' };
  }

  // 预览模式：路径为 /[id]
  const id = pathSegments[0];
  if (!id) return { title: '未命名页面' };

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/templates/${id}?version=published`);
    if (!res.ok) throw new Error();
    const template = await res.json();
    return { title: template.title || '未命名页面' };
  } catch {
    return { title: '未命名页面' };
  }
}

// 服务端组件
export default async function WebBuilderPage({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  const pathSegments = path || [];

  // 编辑模式：/webbuilder 、 /webbuilder/new 、 /webbuilder/[id]/edit
  const isEdit =
    pathSegments.length === 0 ||
    pathSegments[0] === 'new' ||
    pathSegments[pathSegments.length - 1] === 'edit';

  let templateId: string | null = null;
  let initialData: any = null;
  let initialTitle = '未命名模板';
  let initialCategory = 'page';

  if (!isEdit) {
    // 预览模式：/webbuilder/[id]
    const id = pathSegments[0];
    if (!id) notFound();
    templateId = id;

    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const res = await fetch(`${baseUrl}/api/templates/${id}?version=published`);
      if (!res.ok) notFound();
      const template = await res.json();
      initialData = template.data;
      initialTitle = template.title || '未命名模板';
      initialCategory = template.category || 'page';
    } catch {
      notFound();
    }
  } else {
    // 编辑模式：提取模板 ID（如果有）
    if (pathSegments.length >= 2 && pathSegments[1] === 'edit') {
      templateId = pathSegments[0]; // /[id]/edit 形式
    } else if (pathSegments.length === 1 && pathSegments[0] !== 'new') {
      // 兼容可能的 /webbuilder/[id] 作为编辑模式（根据业务决定）
      templateId = pathSegments[0];
    }
    // 否则 templateId 为 null（新建）
  }

  return (
    <WebBuilderPageClient
      isEdit={isEdit}
      templateId={templateId}
      initialData={initialData}
      initialTitle={initialTitle}
      initialCategory={initialCategory as any}
    />
  );
}