import { redirect, notFound } from 'next/navigation';
import { getDocsLibs, getDocsTree } from '@/lib/docs';

export default async function DocsRootPage({ params }: { params: { locale: string } }) {
  const { locale } = await params;
  const libs = await getDocsLibs(locale);
  if (!libs.length) {
    return <div className="p-8 text-center">暂无文档库</div>;
  }

  // 按 sortOrder 排序，取第一个文档库
  const firstLib = libs.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))[0];
  const tree = await getDocsTree(locale, firstLib.id);
  if (!tree.length) {
    return <div className="p-8 text-center">该文档库暂无文档</div>;
  }

  // 获取第一个文档的 slug（优先取根节点的第一个子文档，否则取根节点自身）
  const firstNode = tree[0];
  const firstDocSlug = firstNode.children?.length ? firstNode.children[0].slug : firstNode.slug;
  if (!firstDocSlug) {
    return <div className="p-8 text-center">该文档库没有可用的文档</div>;
  }

  redirect(`/${locale}/docs/${firstLib.slug}/${firstDocSlug}`);
}