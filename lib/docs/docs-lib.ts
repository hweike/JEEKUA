// /lib/docs/docs-lib.ts
import { getPrivateStorage } from '@/lib/storage/factory';
import type { DocsLib } from './types';

// 私有桶中的基础路径（去掉 data/ 前缀，与其他模块统一）
const STORAGE_BASE = 'docs';

function getLibsKey(locale: string): string {
  return `${STORAGE_BASE}/${locale}/libs.json`;
}

function getLibDirKey(locale: string, libId: string): string {
  return `${STORAGE_BASE}/${locale}/${libId}`;
}

async function readJsonFile<T>(key: string): Promise<T | null> {
  const storage = getPrivateStorage();
  try {
    const content = await storage.read(key, 'utf8');
    return JSON.parse(content as string);
  } catch (error: any) {
    // 兼容多种错误形式
    if (error?.code === 'NoSuchKey' || error?.Code === 'NoSuchKey' || error?.message?.includes('File not found')) {
      return null;
    }
    throw error;
  }
}

async function writeJsonFile(key: string, data: any): Promise<void> {
  const storage = getPrivateStorage();
  await storage.write(key, JSON.stringify(data, null, 2), {
    contentType: 'application/json',
  });
}

// 云存储无需创建目录，保留空实现
async function ensureDir(_keyPrefix: string): Promise<void> {}

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
    id: generateLibId(),
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

  const libDirKey = getLibDirKey(locale, id);
  await deleteDir(libDirKey);
}

function generateLibId(): string {
  return Date.now().toString() + '-' + Math.random().toString(36).substring(2, 8);
}