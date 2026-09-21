// app/[locale]/docs/page.tsx
import { redirect } from 'next/navigation';
import { getDocsLibs, getDocsTree } from '@/lib/docs';
import { withStaticLocale } from '@/lib/withPageLocale';

async function DocsRootPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  
  // 获取所有文档库（全局，不按语言）
  const libs = await getDocsLibs();
  
  if (!libs.length) {
    return <div className="p-8 text-center">暂无文档库</div>;
  }
  
  // 按 sortOrder 排序，取第一个
  const firstLib = libs.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))[0];
  
  // 重定向到第一个文档库的 slug
  // 注意：使用 firstLib.slug 而不是 firstLib.id
  redirect(`/${locale}/docs/${firstLib.slug}`);
}

export default withStaticLocale(DocsRootPage);