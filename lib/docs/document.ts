import path from 'path';
import fs from 'fs/promises';
import { DATA_ROOT, ensureDir, readJsonFile, writeJsonFile, generateDocId } from './utils';
import type { Doc, DocIndex } from './types';

const getIndexPath = (locale: string, libId: string) =>
  path.join(DATA_ROOT, locale, libId, 'index.json');

// 获取文档索引（内部使用，也对外导出供 tree.ts 使用）
export async function getDocIndex(locale: string, libId: string): Promise<DocIndex> {
  const index = await readJsonFile<DocIndex>(getIndexPath(locale, libId));
  return index ?? { docs: [] };
}

// 保存文档索引（内部使用）
async function saveDocIndex(locale: string, libId: string, index: DocIndex): Promise<void> {
  await writeJsonFile(getIndexPath(locale, libId), index);
}

// 获取单个文档（包括 md 内容）
export async function getDocument(locale: string, libId: string, docId: string) {
  const { docs } = await getDocIndex(locale, libId);
  const docMeta = docs.find(d => d.id === docId);
  if (!docMeta) return null;
  const mdPath = path.join(DATA_ROOT, locale, libId, docMeta.file);
  let content = '';
  try {
    content = await fs.readFile(mdPath, 'utf-8');
  } catch {}
  return { ...docMeta, content };
}

// 保存文档（新建或更新）
export async function saveDocument(
  locale: string,
  libId: string,
  docData: Partial<Doc> & { id?: string },
  content: string
): Promise<Doc> {
  // 强制从元数据中删除 content 字段（内容单独存储）
  if (docData && typeof docData === 'object') {
    delete (docData as any).content;
  }

  const index = await getDocIndex(locale, libId);
  const now = new Date().toISOString();
  let doc: Doc;
  const libDir = path.join(DATA_ROOT, locale, libId);
  await ensureDir(libDir);

  if (docData.id) {
    // 更新已有文档
    const existingIndex = index.docs.findIndex(d => d.id === docData.id);
    if (existingIndex === -1) throw new Error('文档不存在');
    const existingDoc = index.docs[existingIndex];
    
    // ========== 强制保留原有的 libId，不允许更新 ==========
    const { libId: _, ...safeData } = docData; // 剥除可能传入的 libId
    doc = { ...existingDoc, ...safeData, updatedAt: now };

    // 如果文件名变化，重命名对应的 .md 文件
    if (docData.file && docData.file !== existingDoc.file) {
      const oldPath = path.join(libDir, existingDoc.file);
      const newPath = path.join(libDir, docData.file);
      await fs.rename(oldPath, newPath).catch(() => {});
    }
    index.docs[existingIndex] = doc;
  } else {
    // 新建文档：生成 ID，文件名与 ID 一致
    const newId = generateDocId();
    const fileName = `${newId}.md`;
    doc = {
      id: newId,
      libId: libId,                // 使用传入的文档库 ID
      title: docData.title || '未命名文档',
      slug: docData.slug || '',
      parentId: docData.parentId || null,
      order: docData.order ?? index.docs.length,
      file: fileName,
      templateId: docData.templateId ?? null,
      seo_title: docData.seo_title || '',
      seo_description: docData.seo_description || '',
      seo_keywords: docData.seo_keywords || '',
      createdAt: now,
      updatedAt: now,
    };
    index.docs.push(doc);
  }

  // 写入 Markdown 文件（内容）
  const mdPath = path.join(libDir, doc.file);
  await fs.writeFile(mdPath, content || '', 'utf-8');

  // 保存索引（此时索引中绝对不包含 content）
  await saveDocIndex(locale, libId, index);

  return doc;
}

// 删除文档及其子文档
export async function deleteDocument(locale: string, libId: string, docId: string): Promise<void> {
  const index = await getDocIndex(locale, libId);
  // 收集所有需要删除的文档 ID（包括子文档）
  const toDelete = new Set<string>();
  const collect = (id: string) => {
    toDelete.add(id);
    index.docs.filter(d => d.parentId === id).forEach(child => collect(child.id));
  };
  collect(docId);
  const remaining = index.docs.filter(d => !toDelete.has(d.id));
  // 删除对应的 md 文件
  const libDir = path.join(DATA_ROOT, locale, libId);
  for (const doc of index.docs) {
    if (toDelete.has(doc.id)) {
      await fs.unlink(path.join(libDir, doc.file)).catch(() => {});
    }
  }
  // 更新索引
  await saveDocIndex(locale, libId, { docs: remaining });
}

// 批量重新排序（拖拽后）
export async function reorderDocuments(
  locale: string,
  libId: string,
  items: Array<{ id: string; parentId: string | null; order: number }>
): Promise<void> {
  const index = await getDocIndex(locale, libId);
  const updated = index.docs.map(doc => {
    const item = items.find(i => i.id === doc.id);
    if (item) {
      return { ...doc, parentId: item.parentId, order: item.order };
    }
    return doc;
  });
  await saveDocIndex(locale, libId, { docs: updated });
}

// 单个文档上下移动（按钮操作）
export async function moveDocument(
  locale: string,
  libId: string,
  id: string,
  direction: 'up' | 'down'
): Promise<void> {
  const index = await getDocIndex(locale, libId);
  const doc = index.docs.find(d => d.id === id);
  if (!doc) throw new Error('文档不存在');
  // 获取同一父级下的兄弟文档
  const siblings = index.docs
    .filter(d => d.parentId === doc.parentId)
    .sort((a, b) => a.order - b.order);
  const currentIdx = siblings.findIndex(d => d.id === id);
  if (direction === 'up' && currentIdx > 0) {
    const prev = siblings[currentIdx - 1];
    doc.order = prev.order;
    prev.order = siblings[currentIdx].order;
  } else if (direction === 'down' && currentIdx < siblings.length - 1) {
    const next = siblings[currentIdx + 1];
    doc.order = next.order;
    next.order = siblings[currentIdx].order;
  } else {
    return; // 无变化
  }
  await saveDocIndex(locale, libId, index);
}

// 【修复】根据文档库 slug 和文档 slug 获取完整文档（含内容）
export async function getDocBySlug(locale: string, libSlug: string, docSlug: string) {
  const { getDocsLibBySlug } = await import('./docs-lib');
  const lib = await getDocsLibBySlug(locale, libSlug);
  if (!lib) return null;
  
  // 修正：getDocIndex 返回 { docs: [] } 对象，需要取 .docs
  const { docs } = await getDocIndex(locale, lib.id);
  const docMeta = docs.find(d => d.slug === docSlug);
  if (!docMeta) return null;
  
  const mdPath = path.join(DATA_ROOT, locale, lib.id, docMeta.file);
  let content = '';
  try {
    content = await fs.readFile(mdPath, 'utf-8');
  } catch {}
  return { doc: docMeta, content, lib };
}