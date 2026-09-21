// lib/docs/seo-cache.ts

import { unstable_cache } from 'next/cache';
import {
  getDocBySlug as getDocBySlugRaw,
  getDocTree as getDocTreeRaw,
  getDocsByLib as getDocsByLibRaw,
} from './document';
import { getDocsLibBySlug as getDocsLibBySlugRaw } from './docs-lib';
import type { DocsLib, Doc, TreeNode } from './types';

// ----- 缓存包装函数（用于 SEO 和页面渲染） -----

/**
 * 缓存版本：获取文档库信息（通过 slug 和 locale）
 * 注意：getDocsLibBySlugRaw 参数顺序为 (slug)，locale 参数仅用于缓存键区分
 */
export const getCachedDocsLibBySlug = unstable_cache(
  async (slug: string, locale: string): Promise<DocsLib | null> => {
    // locale 只用于缓存键，实际函数不需要 locale
    return getDocsLibBySlugRaw(slug);
  },
  ['docs-lib-by-slug'],
  { revalidate: 3600 }
);

/**
 * 缓存版本：获取文档详情（含内容）
 * 原函数 getDocBySlug(locale, libId, slug) 返回 { doc, content }
 * 我们将其展平为 { ...doc, content }
 */
export const getCachedDocBySlug = unstable_cache(
  async (locale: string, libId: string, docSlug: string): Promise<(Doc & { content: string }) | null> => {
    const result = await getDocBySlugRaw(locale, libId, docSlug);
    if (!result) return null;
    return { ...result.doc, content: result.content };
  },
  ['doc-by-slug'],
  { revalidate: 3600 }
);

/**
 * 缓存版本：获取文档树（不含内容）
 */
export const getCachedDocsTree = unstable_cache(
  async (locale: string, libId: string): Promise<TreeNode[]> => {
    return getDocTreeRaw(locale, libId);
  },
  ['docs-tree'],
  { revalidate: 3600 }
);

/**
 * 缓存版本：获取文档总数（通过扁平列表计数）
 */
export const getCachedDocCount = unstable_cache(
  async (locale: string, libId: string): Promise<number> => {
    const docs = await getDocsByLibRaw(locale, libId);
    return docs.length;
  },
  ['docs-count'],
  { revalidate: 3600 }
);

/**
 * 缓存版本：获取第一个文档（含内容）
 * 从树中深度优先取第一个叶子节点，然后获取其内容
 */
export const getCachedFirstDoc = unstable_cache(
  async (locale: string, libId: string): Promise<(Doc & { content: string }) | null> => {
    const tree = await getDocTreeRaw(locale, libId);
    if (!tree || tree.length === 0) return null;

    // 深度优先遍历，取第一个叶子节点
    const stack = [...tree];
    while (stack.length > 0) {
      const node = stack.pop()!;
      if (!node.children || node.children.length === 0) {
        // 找到叶子节点，获取完整文档
        const result = await getDocBySlugRaw(locale, libId, node.slug);
        if (result) return { ...result.doc, content: result.content };
        return null;
      }
      // 将子节点入栈（保持顺序，后进先出）
      stack.push(...node.children);
    }
    return null;
  },
  ['docs-first-doc'],
  { revalidate: 3600 }
);