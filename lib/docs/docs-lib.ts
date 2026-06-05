// lib/docs/repository.ts
import { getPrivateStorage } from '@/lib/storage/factory';
import type { DocsLib } from './types';

// 私有桶中的基础路径（对应原 data/docs）
const STORAGE_BASE = 'data/docs';

/**
 * 获取指定语言下 libs.json 的存储 Key
 */
function getLibsKey(locale: string): string {
  return `${STORAGE_BASE}/${locale}/libs.json`;
}

/**
 * 获取指定文档库目录的存储 Key 前缀
 */
function getLibDirKey(locale: string, libId: string): string {
  return `${STORAGE_BASE}/${locale}/${libId}`;
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
 * 确保目录存在（云存储无需实际创建，保留以兼容调用）
 */
async function ensureDir(keyPrefix: string): Promise<void> {
  // 云存储无需创建目录，但为了保持接口一致，留空
}

/**
 * 删除目录及其所有内容（递归删除私有桶中指定前缀的所有对象）
 */
async function deleteDir(keyPrefix: string): Promise<void> {
  const storage = getPrivateStorage();
  const keys = await storage.list(keyPrefix);
  for (const key of keys) {
    await storage.delete(key);
  }
}

export async function getDocsLibs(locale: string): Promise<DocsLib[]> {
  const libs = await readJsonFile<DocsLib[]>(getLibsKey(locale));
  return libs ?? [];
}

export async function getDocsLib(locale: string, id: string): Promise<DocsLib | null> {
  const libs = await getDocsLibs(locale);
  return libs.find(lib => lib.id === id) || null;
}

export async function getDocsLibBySlug(locale: string, slug: string): Promise<DocsLib | null> {
  const libs = await getDocsLibs(locale);
  return libs.find(lib => lib.slug?.toLowerCase() === slug.toLowerCase()) || null;
}

export async function createDocsLib(
  locale: string,
  name: string,
  description?: string,
  templateId?: string | null,
  slug?: string,
  seo_keywords?: string,
  seo_title?: string,
  seo_description?: string
): Promise<DocsLib> {
  const libs = await getDocsLibs(locale);
  const newLib: DocsLib = {
    id: generateLibId(), // 假定 generateLibId 来自 ./utils，需确保已导入或自行实现
    name,
    description: description || '',
    templateId: templateId || null,
    slug: slug || '',
    seo_keywords: seo_keywords || '',
    seo_title: seo_title || '',
    seo_description: seo_description || '',
    sortOrder: libs.length,
    createdAt: new Date().toISOString(),
  };
  libs.push(newLib);
  await writeJsonFile(getLibsKey(locale), libs);

  // 创建文档库目录（实际只需写入空 index.json）
  const libDirKey = getLibDirKey(locale, newLib.id);
  await ensureDir(libDirKey);
  await writeJsonFile(`${libDirKey}/index.json`, { docs: [] });
  return newLib;
}

export async function updateDocsLib(
  locale: string,
  id: string,
  updates: Partial<Pick<DocsLib, 'name' | 'description' | 'templateId' | 'slug' | 'seo_keywords' | 'seo_title' | 'seo_description'>>
): Promise<void> {
  const libs = await getDocsLibs(locale);
  const index = libs.findIndex(lib => lib.id === id);
  if (index === -1) throw new Error('文档库不存在');
  libs[index] = { ...libs[index], ...updates };
  await writeJsonFile(getLibsKey(locale), libs);
}

export async function deleteDocsLib(locale: string, id: string): Promise<void> {
  const libs = await getDocsLibs(locale);
  const filtered = libs.filter(lib => lib.id !== id);
  if (filtered.length === libs.length) throw new Error('文档库不存在');
  await writeJsonFile(getLibsKey(locale), filtered);

  // 删除整个文档库目录（递归删除私有桶中的该前缀）
  const libDirKey = getLibDirKey(locale, id);
  await deleteDir(libDirKey);
}

/**
 * 辅助函数：生成文档库 ID（如果 ./utils 未提供，此处简单实现）
 * 注意：如果原项目中已有 generateLibId，请使用原实现，此处仅为示例
 */
function generateLibId(): string {
  return Date.now().toString() + '-' + Math.random().toString(36).substring(2, 8);
}