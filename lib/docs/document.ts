// lib/docs/document.ts
import { getPrivateStorage } from '@/lib/storage/factory';
import type { Doc, DocIndex } from './types';

// 私有桶中的基础路径（对应原 data/docs）
const STORAGE_BASE = 'data/docs';

/**
 * 获取文档库索引文件的存储 Key
 */
function getIndexKey(locale: string, libId: string): string {
  return `${STORAGE_BASE}/${locale}/${libId}/index.json`;
}

/**
 * 获取文档 Markdown 文件的存储 Key
 */
function getMdKey(locale: string, libId: string, fileName: string): string {
  return `${STORAGE_BASE}/${locale}/${libId}/${fileName}`;
}

/**
 * 读取 JSON 文件（从私有桶）
 */
async function readJsonFile<T>(key: string): Promise<T | null> {
  const storage = getPrivateStorage();
  try {
    const content = await storage.read(key, 'utf8');
    return JSON.parse(content as string);
  } catch (error: any) {
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      return null;
    }
    throw error;
  }
}

/**
 * 写入 JSON 文件到私有桶
 */
async function writeJsonFile(key: string, data: any): Promise<void> {
  const storage = getPrivateStorage();
  await storage.write(key, JSON.stringify(data, null, 2), {
    contentType: 'application/json',
  });
}

/**
 * 读取文本文件（从私有桶）
 */
async function readTextFile(key: string): Promise<string> {
  const storage = getPrivateStorage();
  const content = await storage.read(key, 'utf8');
  return content as string;
}

/**
 * 写入文本文件到私有桶
 */
async function writeTextFile(key: string, content: string, contentType?: string): Promise<void> {
  const storage = getPrivateStorage();
  await storage.write(key, content, { contentType: contentType || 'text/plain' });
}

/**
 * 删除文件（从私有桶）
 */
async function deleteFile(key: string): Promise<void> {
  const storage = getPrivateStorage();
  try {
    await storage.delete(key);
  } catch (error: any) {
    if (!error?.message?.includes('NoSuchKey')) {
      throw error;
    }
  }
}

/**
 * 复制文件（私有桶内复制，用于重命名）
 */
async function copyFile(srcKey: string, destKey: string): Promise<void> {
  const storage = getPrivateStorage();
  const content = await storage.read(srcKey, 'utf8');
  await storage.write(destKey, content);
  await storage.delete(srcKey);
}

/**
 * 获取文档索引（内部使用，也对外导出供 tree.ts 使用）
 */
export async function getDocIndex(locale: string, libId: string): Promise<DocIndex> {
  const index = await readJsonFile<DocIndex>(getIndexKey(locale, libId));
  return index ?? { docs: [] };
}

/**
 * 保存文档索引（内部使用）
 */
async function saveDocIndex(locale: string, libId: string, index: DocIndex): Promise<void> {
  await writeJsonFile(getIndexKey(locale, libId), index);
}

/**
 * 获取单个文档（包括 md 内容）
 */
export async function getDocument(locale: string, libId: string, docId: string) {
  const { docs } = await getDocIndex(locale, libId);
  const docMeta = docs.find(d => d.id === docId);
  if (!docMeta) return null;
  const mdKey = getMdKey(locale, libId, docMeta.file);
  let content = '';
  try {
    content = await readTextFile(mdKey);
  } catch {}
  return { ...docMeta, content };
}

/**
 * 保存文档（新建或更新）
 */
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

  if (docData.id) {
    // 更新已有文档
    const existingIndex = index.docs.findIndex(d => d.id === docData.id);
    if (existingIndex === -1) throw new Error('文档不存在');
    const existingDoc = index.docs[existingIndex];
    
    // 强制保留原有的 libId，不允许更新
    const { libId: _, ...safeData } = docData;
    doc = { ...existingDoc, ...safeData, updatedAt: now };

    // 如果文件名变化，重命名对应的 .md 文件
    if (docData.file && docData.file !== existingDoc.file) {
      const oldKey = getMdKey(locale, libId, existingDoc.file);
      const newKey = getMdKey(locale, libId, docData.file);
      await copyFile(oldKey, newKey).catch(() => {});
    }
    index.docs[existingIndex] = doc;
  } else {
    // 新建文档：生成 ID，文件名与 ID 一致
    const newId = generateDocId(); // 需要从 './utils' 导入或自行实现
    const fileName = `${newId}.md`;
    doc = {
      id: newId,
      libId: libId,
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
  const mdKey = getMdKey(locale, libId, doc.file);
  await writeTextFile(mdKey, content || '', 'text/markdown');

  // 保存索引（此时索引中绝对不包含 content）
  await saveDocIndex(locale, libId, index);

  return doc;
}

/**
 * 删除文档及其子文档
 */
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
  for (const doc of index.docs) {
    if (toDelete.has(doc.id)) {
      const mdKey = getMdKey(locale, libId, doc.file);
      await deleteFile(mdKey);
    }
  }
  // 更新索引
  await saveDocIndex(locale, libId, { docs: remaining });
}

/**
 * 批量重新排序（拖拽后）
 */
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

/**
 * 单个文档上下移动（按钮操作）
 */
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

/**
 * 根据文档库 slug 和文档 slug 获取完整文档（含内容）
 */
export async function getDocBySlug(locale: string, libSlug: string, docSlug: string) {
  const { getDocsLibBySlug } = await import('./docs-lib');
  const lib = await getDocsLibBySlug(locale, libSlug);
  if (!lib) return null;
  
  const { docs } = await getDocIndex(locale, lib.id);
  const docMeta = docs.find(d => d.slug === docSlug);
  if (!docMeta) return null;
  
  const mdKey = getMdKey(locale, lib.id, docMeta.file);
  let content = '';
  try {
    content = await readTextFile(mdKey);
  } catch {}
  return { doc: docMeta, content, lib };
}

/**
 * 辅助函数：生成文档 ID（如果原项目已导出 generateDocId，应从 './utils' 导入，这里提供默认实现）
 */
function generateDocId(): string {
  return Date.now().toString() + '-' + Math.random().toString(36).substring(2, 8);
}