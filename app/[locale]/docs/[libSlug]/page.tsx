// app/[locale]/docs/[libSlug]/page.tsx

import { notFound } from 'next/navigation';
import Script from 'next/script';
import { injectRuntimeDataSafe } from '@/lib/webbuilder/runtime-injector';
import { TemplateRenderer } from '@/components/webbuilder/TemplateRenderer';
import { withDynamicLocale } from '@/lib/withPageLocale';
import { getSeoInput } from '@/lib/seo/getSeoInput';
import { generatePageMetadata } from '@/lib/seo';
import { getSiteSettings } from '@/lib/getSiteSettings';
import {
  getCachedDocsLibBySlug,
  getCachedDocsTree,
  getCachedDocBySlug,
} from '@/lib/docs';
import { getLayoutPageByTemplate } from '@/lib/pages/storage';
import type { DocsLib, Doc } from '@/lib/docs/types';

const DEFAULT_DOC_LIBRARY_TEMPLATE_ID = 'default_document_library_published';

// ===== generateMetadata =====
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; libSlug: string }>;
}) {
  // ✅ 防御性检查：构建时 Next.js 可能传入 undefined
  const resolvedParams = await params;
  if (!resolvedParams?.locale) {
    return {
      title: 'Docs',
      robots: 'noindex, follow',
    };
  }

  const { locale, libSlug } = resolvedParams;

  const settings = await getSiteSettings();
  const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const siteName = settings.siteName || 'Site Name';

  const library = await getCachedDocsLibBySlug(libSlug, locale);
  if (!library) {
    return {
      title: '文档库未找到',
      robots: 'noindex, follow',
    };
  }

  const docTree = await getCachedDocsTree(locale, library.id);
  let firstDoc: (Doc & { content: string }) | null = null;
  if (docTree.length > 0) {
    const firstNode = docTree[0];
    if (firstNode.children && firstNode.children.length > 0) {
      const firstChild = firstNode.children[0];
      const result = await getCachedDocBySlug(locale, library.id, firstChild.slug);
      if (result) firstDoc = result;
    } else {
      const result = await getCachedDocBySlug(locale, library.id, firstNode.slug);
      if (result) firstDoc = result;
    }
  }

  const seoData = { library, docTree, firstDoc, siteName, baseUrl };
  const seoInput = await getSeoInput('docLibrary', libSlug, locale, seoData);
  if (!seoInput) {
    return {
      title: `${library.name} | ${siteName}`,
      description: library.seo_description || `浏览 ${library.name} 文档库`,
      robots: 'index, follow',
      alternates: { canonical: `${baseUrl}/${locale}/docs/${libSlug}` },
    };
  }

  const { metadata } = await generatePageMetadata(seoInput, locale);
  return metadata;
}

// ===== 页面组件 =====
interface DocsLibPageProps {
  params: Promise<{ locale: string; libSlug: string }>;
}

async function DocsLibPage({ params }: DocsLibPageProps) {
  // ✅ 防御性检查：构建时 Next.js 可能传入 undefined
  const resolvedParams = await params;
  if (!resolvedParams?.locale) {
    notFound();
  }

  const { locale, libSlug } = resolvedParams;

  // 1. 获取文档库（缓存版本）
  const library = await getCachedDocsLibBySlug(libSlug, locale);
  if (!library) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-gray-700">文档库不存在</h1>
        <p className="text-gray-500 mt-2">请检查文档库名称是否正确，或联系管理员。</p>
      </div>
    );
  }

  // 2. 获取文档树（缓存版本）
  const docTree = await getCachedDocsTree(locale, library.id);

  // 3. 确定默认文档（第一个文档）
  let firstDoc: (Doc & { content: string }) | null = null;
  if (docTree.length > 0) {
    const firstNode = docTree[0];
    if (firstNode.children && firstNode.children.length > 0) {
      const firstChild = firstNode.children[0];
      const result = await getCachedDocBySlug(locale, library.id, firstChild.slug);
      if (result) firstDoc = result;
    } else {
      const result = await getCachedDocBySlug(locale, library.id, firstNode.slug);
      if (result) firstDoc = result;
    }
  }

  if (!firstDoc) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-gray-700">该文档库暂无文档</h1>
        <p className="text-gray-500 mt-2">请先在后台添加文档。</p>
      </div>
    );
  }

  const doc = firstDoc;
  const content = firstDoc.content;

  // 4. 确定模板 ID
  const templateId = library.templateId || DEFAULT_DOC_LIBRARY_TEMPLATE_ID;

  // 5. 查询布局（✅ 改用缓存函数）
  let layoutPage = await getLayoutPageByTemplate('base', templateId);

  if (!layoutPage && templateId !== DEFAULT_DOC_LIBRARY_TEMPLATE_ID) {
    console.warn(`[DocsLibPage] 模板 ${templateId} 不存在，回退到默认模板`);
    layoutPage = await getLayoutPageByTemplate('base', DEFAULT_DOC_LIBRARY_TEMPLATE_ID);
  }

  const templateData = layoutPage?.templateData;
  const hasValidTemplate =
    templateData && Array.isArray(templateData.content) && templateData.content.length > 0;

  if (!layoutPage || !hasValidTemplate) {
    console.warn(`[DocsLibPage] 布局模板无效或为空 (templateId: ${templateId})`);
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-4">📄</div>
        <h1 className="text-2xl font-semibold text-gray-700">文档库首页尚未配置模板</h1>
        <p className="text-gray-500">
          请在后台创建并发布一个文档库模板。
          <br />
          <span className="text-sm text-gray-400">模板 ID: {templateId}</span>
        </p>
      </div>
    );
  }

  // 6. 构建运行时数据（✅ 移除 texts 字段）
  const runtimeData = {
    entityType: 'documentLibrary',
    library: {
      id: library.id,
      name: library.name,
      slug: library.slug,
      seo_title: library.seo_title || '',
      seo_description: library.seo_description || '',
      seo_keywords: library.seo_keywords || '',
      templateId: library.templateId || null,
    },
    docTree,
    currentDoc: {
      id: doc.id,
      title: doc.title,
      slug: doc.slug,
      content,
      seo_title: doc.seo_title || '',
      seo_description: doc.seo_description || '',
      seo_keywords: doc.seo_keywords || '',
      templateId: doc.templateId || null,
    },
    locale,
  };

  const finalRuntime = { ...runtimeData, locale };

  // 7. 注入运行时数据
  let finalData = injectRuntimeDataSafe(templateData, finalRuntime);
  if (!finalData.__runtime) {
    (finalData as any).__runtime = finalRuntime;
    if (finalData.content && Array.isArray(finalData.content)) {
      finalData.content = finalData.content.map((node: any) => ({
        ...node,
        __runtime: finalRuntime,
        props: { ...node.props, __runtime: finalRuntime },
      }));
    }
  }

  // 8. 生成 JSON-LD
  const settings = await getSiteSettings();
  const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const siteName = settings.siteName || 'Site Name';

  const seoData = { library, docTree, firstDoc, siteName, baseUrl };
  const seoInput = await getSeoInput('docLibrary', libSlug, locale, seoData);
  let jsonLdScripts: string[] = [];
  if (seoInput?.structuredData) {
    const structured = seoInput.structuredData as any;
    if (structured['@graph'] && Array.isArray(structured['@graph'])) {
      jsonLdScripts = [JSON.stringify(structured)];
    } else {
      jsonLdScripts = [JSON.stringify(structured)];
    }
  }

  return (
    <>
      {jsonLdScripts.map((script, idx) => (
        <Script
          key={idx}
          id={`doclib-jsonld-${idx}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: script }}
          strategy="afterInteractive"
        />
      ))}
      <TemplateRenderer data={finalData} runtime={finalRuntime} />
    </>
  );
}

export const revalidate = 3600;
export default withDynamicLocale(DocsLibPage);