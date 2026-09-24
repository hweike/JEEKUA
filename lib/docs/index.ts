// lib/docs/index.ts

// ========== 文档库相关函数 ==========
export {
  getDocsLibs,
  getDocsLib,
  getDocsLibBySlug,
  createDocsLib,
  updateDocsLib,
  deleteDocsLib,
} from './docs-lib';

// ========== 文档相关函数（更新后） ==========
export {
  getDocsByLib,
  getDocument,
  getDocBySlug,
  saveDocument,
  deleteDocument,
  copyDocument,
  updateDocOrders,
  syncDocOrdersAllLocales,
  getDocTree,
  getAllDocParams,           // ✅ 新增
  clearAllDocParamsCache,    // ✅ 新增
} from './document';

// ========== 树构建函数 ==========
export { getDocsTree } from './tree';

// ========== 类型定义 ==========
export type { DocsLib, Doc, DocIndex, TreeNode } from './types';

// ========== SEO 缓存版本 ==========
export {
  getCachedDocsLibBySlug,
  getCachedDocBySlug,
  getCachedDocsTree,
  getCachedDocCount,
  getCachedFirstDoc,
} from './seo-cache';