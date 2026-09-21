// lib/seo/configs/doc.config.ts

import { PageTypeConfig } from '../types';
import { getSiteSettings } from '@/lib/getSiteSettings';
import { getBreadcrumbLabels } from '../utils/seo-helpers';
import { getOrganization } from '../jsonLd';
import type { DocsLib, Doc, TreeNode } from '@/lib/docs/types';

// 定义文档库页面所需的数据结构（由页面提供）
export interface DocLibraryPageData {
  library: DocsLib;
  docTree: TreeNode[];
  firstDoc: (Doc & { content: string }) | null;
  siteName: string;
  baseUrl: string;
}

// 文档详情页所需的数据结构
export interface DocDetailPageData {
  library: DocsLib;
  doc: Doc & { content: string };
  docTree: TreeNode[];
  siteName: string;
  baseUrl: string;
}

// ---------- 辅助函数 ----------
function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * 从 HTML/Markdown 内容中提取纯文本
 */
function extractPlainText(html: string): string {
  if (!html) return '';
  let text = html.replace(/<[^>]*>/g, ' ');
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

function getDocLibraryUrl(locale: string, baseUrl: string, slug: string): string {
  return `${baseUrl}/${locale}/docs/${slug}`;
}

function getDocDetailUrl(locale: string, baseUrl: string, libSlug: string, docSlug: string): string {
  return `${baseUrl}/${locale}/docs/${libSlug}/${docSlug}`;
}

function getTotalDocCount(tree: TreeNode[]): number {
  let count = 0;
  const traverse = (nodes: TreeNode[]) => {
    nodes.forEach(node => {
      count++;
      if (node.children) traverse(node.children);
    });
  };
  traverse(tree);
  return count;
}

function getTopLevelDocs(tree: TreeNode[]): TreeNode[] {
  return tree;
}

// ---------- 配置导出 ----------

export const docLibraryConfig: PageTypeConfig<'docLibrary', DocLibraryPageData> = {
  type: 'docLibrary',

  getDataFetcher: () => async () => null as any,

  getTitle: (data: DocLibraryPageData) => {
    const { library } = data;
    if (library.seo_title && library.seo_title.trim() !== '') {
      return library.seo_title.trim();
    }
    return `${library.name ?? '文档库'} - 文档库`;
  },

  getDescription: (data: DocLibraryPageData) => {
    const { library, docTree } = data;
    if (library.seo_description && library.seo_description.trim() !== '') {
      return library.seo_description.trim();
    }
    const total = getTotalDocCount(docTree);
    const topDocs = getTopLevelDocs(docTree);
    const topNames = topDocs.slice(0, 5).map(node => node.title ?? '').join('、');
    return truncateText(
      `浏览 ${library.name ?? '文档库'}（共${total}篇文档），包含${topNames}等。提供完整技术文档和用户指南。`,
      160
    );
  },

  getImage: () => '',

  getNoindex: () => false,

  getCanonical: (data: DocLibraryPageData, baseUrl: string, locale: string) => {
    return getDocLibraryUrl(locale, baseUrl, data.library.slug ?? '');
  },

  mapToStructuredData: async (data: DocLibraryPageData, locale: string) => {
    const { library, docTree, firstDoc, siteName, baseUrl } = data;

    const org = await getOrganization(locale);
    const breadcrumbLabels = await getBreadcrumbLabels(locale);
    const homeLabel = breadcrumbLabels.home || '首页';
    const docsLabel = breadcrumbLabels.docs || '文档';

    const searchUrlTemplate = `${baseUrl}/${locale}/search?q={search_term_string}`;
    const website = {
      '@type': 'WebSite',
      '@id': `${baseUrl}/#website`,
      url: baseUrl,
      name: siteName,
      publisher: { '@id': `${baseUrl}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: searchUrlTemplate },
        'query-input': 'required name=search_term_string',
      },
    };

    const libUrl = getDocLibraryUrl(locale, baseUrl, library.slug ?? '');
    const breadcrumbItems = [
      { position: 1, name: homeLabel, item: `${baseUrl}/${locale}` },
      { position: 2, name: docsLabel, item: `${baseUrl}/${locale}/docs` },
      { position: 3, name: library.name ?? '文档库', item: libUrl },
    ];
    const breadcrumbList = {
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbItems.map(({ position, name, item }) => ({
        '@type': 'ListItem',
        position,
        name,
        item,
      })),
    };

    const topDocs = getTopLevelDocs(docTree);
    const itemList = {
      '@type': 'ItemList',
      '@id': `${libUrl}#itemlist`,
      numberOfItems: topDocs.length,
      itemListElement: topDocs.map((node, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'TechArticle',
          name: node.title ?? '',
          url: getDocDetailUrl(locale, baseUrl, library.slug ?? '', node.slug ?? ''),
        },
      })),
    };

    const collectionPage = {
      '@type': 'CollectionPage',
      '@id': `${libUrl}#collectionpage`,
      name: (library.seo_title?.trim() || `${library.name ?? '文档库'} - 文档库`),
      description: (library.seo_description?.trim() || `浏览 ${library.name ?? '文档库'}（共${getTotalDocCount(docTree)}篇文档）`),
      url: libUrl,
      mainEntity: itemList,
    };

    let techArticle = null;
    if (firstDoc) {
      const plainContent = extractPlainText(firstDoc.content || '');
      techArticle = {
        '@type': 'TechArticle',
        '@id': `${libUrl}#techarticle`,
        headline: firstDoc.title ?? '',
        // ✅ 修复：使用 || 链，避免混合 ?? 与 ||
        description: firstDoc.seo_description?.trim() || truncateText(plainContent, 200) || firstDoc.title || '',
        author: { '@type': 'Organization', name: siteName },
        publisher: {
          '@type': 'Organization',
          name: siteName,
          logo: { '@type': 'ImageObject', url: `${baseUrl}/logo.png` },
        },
        datePublished: firstDoc.createdAt,
        dateModified: firstDoc.updatedAt || firstDoc.createdAt,
        articleBody: plainContent,
      };
    }

    const graph = [org, website, breadcrumbList, collectionPage];
    if (techArticle) graph.push(techArticle);

    return { '@graph': graph };
  },
};

export const docConfig: PageTypeConfig<'doc', DocDetailPageData> = {
  type: 'doc',

  getDataFetcher: () => async () => null as any,

  getTitle: (data: DocDetailPageData) => {
    const { doc } = data;
    if (doc.seo_title && doc.seo_title.trim() !== '') {
      return doc.seo_title.trim();
    }
    return doc.title ?? '文档';
  },

  getDescription: (data: DocDetailPageData) => {
    const { doc } = data;
    if (doc.seo_description && doc.seo_description.trim() !== '') {
      return doc.seo_description.trim();
    }
    if (doc.content) {
      const plainText = extractPlainText(doc.content);
      return truncateText(plainText, 160);
    }
    return `${doc.title ?? '文档'} - 技术文档`;
  },

  getImage: () => '',

  getNoindex: () => false,

  getCanonical: (data: DocDetailPageData, baseUrl: string, locale: string) => {
    return getDocDetailUrl(locale, baseUrl, data.library.slug ?? '', data.doc.slug ?? '');
  },

  mapToStructuredData: async (data: DocDetailPageData, locale: string) => {
    const { library, doc, siteName, baseUrl } = data;

    const org = await getOrganization(locale);
    const breadcrumbLabels = await getBreadcrumbLabels(locale);
    const homeLabel = breadcrumbLabels.home || '首页';
    const docsLabel = breadcrumbLabels.docs || '文档';

    const searchUrlTemplate = `${baseUrl}/${locale}/search?q={search_term_string}`;
    const website = {
      '@type': 'WebSite',
      '@id': `${baseUrl}/#website`,
      url: baseUrl,
      name: siteName,
      publisher: { '@id': `${baseUrl}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: searchUrlTemplate },
        'query-input': 'required name=search_term_string',
      },
    };

    const libUrl = getDocLibraryUrl(locale, baseUrl, library.slug ?? '');
    const docUrl = getDocDetailUrl(locale, baseUrl, library.slug ?? '', doc.slug ?? '');

    const breadcrumbItems = [
      { position: 1, name: homeLabel, item: `${baseUrl}/${locale}` },
      { position: 2, name: docsLabel, item: `${baseUrl}/${locale}/docs` },
      { position: 3, name: library.name ?? '文档库', item: libUrl },
      { position: 4, name: doc.title ?? '文档', item: docUrl },
    ];
    const breadcrumbList = {
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbItems.map(({ position, name, item }) => ({
        '@type': 'ListItem',
        position,
        name,
        item,
      })),
    };

    const plainContent = extractPlainText(doc.content || '');
    // ✅ 修复：使用 || 链，避免混合 ?? 与 ||
    const description = doc.seo_description?.trim() || truncateText(plainContent, 200) || doc.title || '';

    const techArticle = {
      '@type': 'TechArticle',
      '@id': `${docUrl}#techarticle`,
      headline: doc.title ?? '',
      description,
      author: { '@type': 'Organization', name: siteName },
      publisher: {
        '@type': 'Organization',
        name: siteName,
        logo: { '@type': 'ImageObject', url: `${baseUrl}/logo.png` },
      },
      datePublished: doc.createdAt,
      dateModified: doc.updatedAt || doc.createdAt,
      mainEntityOfPage: docUrl,
      articleBody: plainContent,
    };

    const article = {
      '@type': 'Article',
      '@id': `${docUrl}#article`,
      headline: doc.title ?? '',
      description,
      author: { '@type': 'Organization', name: siteName },
      publisher: { '@type': 'Organization', name: siteName },
      datePublished: doc.createdAt,
      dateModified: doc.updatedAt || doc.createdAt,
      mainEntityOfPage: docUrl,
    };

    return {
      '@graph': [org, website, breadcrumbList, techArticle, article],
    };
  },
};