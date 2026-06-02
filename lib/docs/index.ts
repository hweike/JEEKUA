// ========== 文档库相关函数 ==========
export {
  getDocsLibs,
  getDocsLib,
  getDocsLibBySlug,      // 新增，需已在 docs-lib.ts 中实现
  createDocsLib,
  updateDocsLib,
  deleteDocsLib,
} from './docs-lib';

// ========== 文档相关函数 ==========
export {
  getDocIndex,
  getDocument,
  getDocBySlug,           // 新增，需已在 document.ts 中实现
  saveDocument,
  deleteDocument,
  reorderDocuments,
  moveDocument,
} from './document';

// ========== 树构建函数 ==========
export { getDocsTree } from './tree';

// ========== 类型定义 ==========
export type { DocsLib, Doc, DocIndex, TreeNode } from './types';