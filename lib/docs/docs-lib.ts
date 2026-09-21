// lib/docs/docs-lib.ts
import { getPrivateStorage } from '@/lib/storage/factory';
import type { DocsLib } from './types';
import { registerEntity } from '@/lib/discovery/services/business-register-pages.service';
import { deletePage } from '@/lib/discovery/register';

const STORAGE_BASE = 'docs';
const GLOBAL_LOCALE = 'global';

function getLibsKey(): string {
  return `${STORAGE_BASE}/libs.json`;
}

function getLibDirKey(locale: string, libId: string): string {
  return `${STORAGE_BASE}/${locale}/${libId}`;
}

/**
 * 健壮地判断是否为“文件不存在”错误
 * 支持多种存储后端（本地文件系统、S3、Supabase Storage 等）
 */
function isNotFoundError(error: any): boolean {
  if (!error) return false;
  // 常见错误码
  const codes = ['NoSuchKey', 'ENOENT', 'NotFound', '404'];
  if (error.code && codes.includes(error.code)) return true;
  if (error.Code && codes.includes(error.Code)) return true;
  if (error.statusCode === 404 || error.status === 404) return true;
  // 错误消息中的关键词
  const msg = error.message || '';
  if (msg.includes('NoSuchKey') || msg.includes('not found') || msg.includes('ENOENT')) return true;
  return false;
}

async function readJsonFile<T>(key: string): Promise<T | null> {
  const storage = getPrivateStorage();
  try {
    const content = await storage.read(key, 'utf8');
    return JSON.parse(content as string);
  } catch (error: any) {
    if (isNotFoundError(error)) {
      return null;
    }
    // 其他错误记录日志并重新抛出（但上层会捕获）
    console.error(`[readJsonFile] 读取 ${key} 失败:`, error);
    throw error;
  }
}

async function writeJsonFile(key: string, data: any): Promise<void> {
  const storage = getPrivateStorage();
  await storage.write(key, JSON.stringify(data, null, 2), {
    contentType: 'application/json',
  });
}

async function deleteDir(keyPrefix: string): Promise<void> {
  const storage = getPrivateStorage();
  const keys = await storage.list(keyPrefix);
  for (const key of keys) {
    await storage.delete(key);
  }
}

async function getLocaleDirs(): Promise<string[]> {
  const storage = getPrivateStorage();
  try {
    const allKeys = await storage.list(STORAGE_BASE + '/');
    const locales = new Set<string>();
    for (const key of allKeys) {
      const parts = key.split('/');
      if (parts.length >= 2 && parts[1]) {
        locales.add(parts[1]);
      }
    }
    return Array.from(locales);
  } catch {
    return [];
  }
}

export async function getDocsLibs(): Promise<DocsLib[]> {
  try {
    const libs = await readJsonFile<DocsLib[]>(getLibsKey());
    return libs ?? [];
  } catch (error) {
    // 读取失败时记录日志并返回空数组，避免整个应用崩溃
    console.error('[getDocsLibs] 读取文档库列表失败:', error);
    return [];
  }
}

export async function getDocsLib(id: string): Promise<DocsLib | null> {
  const libs = await getDocsLibs();
  return libs.find(lib => lib.id === id) || null;
}

export async function getDocsLibBySlug(slug: string): Promise<DocsLib | null> {
  if (!slug) return null;
  const libs = await getDocsLibs();
  return libs.find(lib => lib.slug?.toLowerCase() === slug.toLowerCase()) || null;
}

export async function createDocsLib(
  name: string,
  description?: string,
  templateId?: string | null,
  slug?: string,
  seo_keywords?: string,
  seo_title?: string,
  seo_description?: string
): Promise<DocsLib> {
  const libs = await getDocsLibs();
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
  await writeJsonFile(getLibsKey(), libs);

  registerEntity({
    type: 'docLibrary',
    id: newLib.id,
    locale: GLOBAL_LOCALE,
    data: newLib,
    updatedAt: newLib.createdAt,
  }).catch(err => console.error(`注册文档库失败 (${newLib.id}):`, err));

  return newLib;
}

export async function updateDocsLib(
  id: string,
  updates: Partial<Pick<DocsLib, 'name' | 'description' | 'templateId' | 'slug' | 'seo_keywords' | 'seo_title' | 'seo_description'>>
): Promise<void> {
  const libs = await getDocsLibs();
  const index = libs.findIndex(lib => lib.id === id);
  if (index === -1) throw new Error('文档库不存在');
  const updatedLib = { ...libs[index], ...updates };
  libs[index] = updatedLib;
  await writeJsonFile(getLibsKey(), libs);

  registerEntity({
    type: 'docLibrary',
    id: id,
    locale: GLOBAL_LOCALE,
    data: updatedLib,
    updatedAt: new Date().toISOString(),
  }).catch(err => console.error(`更新文档库注册失败 (${id}):`, err));
}

export async function deleteDocsLib(id: string): Promise<void> {
  const libs = await getDocsLibs();
  const filtered = libs.filter(lib => lib.id !== id);
  if (filtered.length === libs.length) throw new Error('文档库不存在');
  await writeJsonFile(getLibsKey(), filtered);

  const locales = await getLocaleDirs();
  for (const locale of locales) {
    const libDirKey = getLibDirKey(locale, id);
    await deleteDir(libDirKey);
  }

  const pageId = `docLibrary:${id}`;
  try {
    await deletePage(pageId, GLOBAL_LOCALE);
  } catch (err) {
    console.error(`删除文档库 pages 失败 (${pageId}):`, err);
  }
}

function generateLibId(): string {
  return Date.now().toString() + '-' + Math.random().toString(36).substring(2, 8);
}