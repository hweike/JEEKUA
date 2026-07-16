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
  saveDocument,
  deleteDocument,
  copyDocument,
  updateDocOrders,
  syncDocOrdersAllLocales,
  getDocTree,
} from './document';

// ========== 树构建函数 ==========
export { getDocsTree } from './tree';

// ========== 类型定义 ==========
export type { DocsLib, Doc, DocIndex, TreeNode } from './types';