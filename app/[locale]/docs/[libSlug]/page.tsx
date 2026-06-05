import { redirect, notFound } from 'next/navigation';
import { getDocsLibBySlug, getDocsTree } from '@/lib/docs';
import { withDynamicLocale } from '@/lib/withPageLocale';

interface DocsLibRedirectPageProps {
  params: Promise<{ locale: string; libSlug: string }>;
}

async function DocsLibRedirectPage({ params }: DocsLibRedirectPageProps) {
  const { locale, libSlug } = await params;
  // setRequestLocale 由 withDynamicLocale 自动处理

  const lib = await getDocsLibBySlug(locale, libSlug);
  if (!lib) notFound();

  const tree = await getDocsTree(locale, lib.id);
  let firstSlug: string | null = null;
  if (tree.length > 0) {
    const firstNode = tree[0];
    firstSlug = firstNode.children?.length ? firstNode.children[0].slug : firstNode.slug;
  }
  if (!firstSlug) {
    return <div className="p-8 text-center">该文档库暂无文档</div>;
  }
  redirect(`/${locale}/docs/${libSlug}/${firstSlug}`);
}

export default withDynamicLocale(DocsLibRedirectPage);