// app/[locale]/docs/page.tsx
import { redirect } from 'next/navigation';
import { getDocsLibs, getDocsTree } from '@/lib/docs';
import { withStaticLocale } from '@/lib/withPageLocale';

async function DocsRootPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // 原有逻辑：获取文档库、重定向等
  const libs = await getDocsLibs(locale);
  if (!libs.length) {
    return <div className="p-8 text-center">暂无文档库</div>;
  }
  const firstLib = libs.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))[0];
  const tree = await getDocsTree(locale, firstLib.id);
  if (!tree.length) {
    return <div className="p-8 text-center">该文档库暂无文档</div>;
  }
  const firstNode = tree[0];
  const firstDocSlug = firstNode.children?.length ? firstNode.children[0].slug : firstNode.slug;
  if (!firstDocSlug) {
    return <div className="p-8 text-center">该文档库没有可用的文档</div>;
  }
  redirect(`/${locale}/docs/${firstLib.slug}/${firstDocSlug}`);
}

export default withStaticLocale(DocsRootPage);