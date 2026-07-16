// lib/docs/tree.ts
import { getDocTree } from './document';
import type { TreeNode } from './types';

/**
 * 获取文档树（层级结构）
 * 直接调用基于数据库的 getDocTree 实现
 */
export async function getDocsTree(locale: string, libId: string): Promise<TreeNode[]> {
  return getDocTree(locale, libId);
}