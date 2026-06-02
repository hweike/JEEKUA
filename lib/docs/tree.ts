import { getDocIndex } from './document';
import type { TreeNode } from './types';

export async function getDocsTree(locale: string, libId: string): Promise<TreeNode[]> {
  const { docs } = await getDocIndex(locale, libId);
  const map = new Map<string, TreeNode>();
  docs.forEach(doc => {
    map.set(doc.id, {
      id: doc.id,
      title: doc.title,
      slug: doc.slug,
      parentId: doc.parentId,
      order: doc.order,
      children: [],
    });
  });
  const roots: TreeNode[] = [];
  docs.forEach(doc => {
    const node = map.get(doc.id)!;
    if (doc.parentId && map.has(doc.parentId)) {
      const parent = map.get(doc.parentId)!;
      parent.children!.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortChildren = (node: TreeNode) => {
    node.children!.sort((a, b) => a.order - b.order);
    node.children!.forEach(sortChildren);
  };
  roots.sort((a, b) => a.order - b.order);
  roots.forEach(sortChildren);
  return roots;
}