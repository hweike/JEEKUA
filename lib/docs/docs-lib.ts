// lib/docs/docs-lib.ts
import { getPrivateStorage } from '@/lib/storage/factory';
import type { DocsLib } from './types';
// ═══ 新增导入 ═══
import { registerEntity } from '@/lib/discovery/services/business-register-pages.service';
import { deletePage } from '@/lib/discovery/register';
import type { PageData } from '@/lib/discovery/register';

const STORAGE_BASE = 'docs';
const GLOBAL_LOCALE = 'global'; // 文档库全局共享，使用固定 locale

function getLibsKey(): string {
  return `${STORAGE_BASE}/libs.json`;
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

async function deleteDir(keyPrefix: string): Promise<void> {
  const storage = getPrivateStorage();
  const keys = await storage.list(keyPrefix);
  for (const key of keys) {
    await storage.delete(key);
  }
}

// 获取所有语言目录（通过读取 STORAGE_BASE 下的一级目录）
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
  const libs = await readJsonFile<DocsLib[]>(getLibsKey());
  return libs ?? [];
}

export async function getDocsLib(id: string): Promise<DocsLib | null> {
  const libs = await getDocsLibs();
  return libs.find(lib => lib.id === id) || null;
}

export async function getDocsLibBySlug(slug: string): Promise<DocsLib | null> {
  const libs = await getDocsLibs();
  return libs.find(lib => lib.slug?.toLowerCase() === slug.toLowerCase()) || null;
}

/**
 * 创建文档库
 * 新增：注册到 pages 表（locale = 'global'）
 */
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

  // 异步注册到 pages 表（全局 locale）
  registerEntity({
    type: 'docLibrary',
    id: newLib.id,
    locale: GLOBAL_LOCALE,
    data: newLib,
    updatedAt: newLib.createdAt,
  }).catch(err => console.error(`注册文档库失败 (${newLib.id}):`, err));

  return newLib;
}

/**
 * 更新文档库
 * 新增：更新后重新注册到 pages 表（locale = 'global'）
 */
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

  // 异步重新注册到 pages 表
  registerEntity({
    type: 'docLibrary',
    id: id,
    locale: GLOBAL_LOCALE,
    data: updatedLib,
    updatedAt: new Date().toISOString(),
  }).catch(err => console.error(`更新文档库注册失败 (${id}):`, err));
}

/**
 * 删除文档库
 * 新增：删除对应的 pages 记录（locale = 'global'）
 */
export async function deleteDocsLib(id: string): Promise<void> {
  const libs = await getDocsLibs();
  const filtered = libs.filter(lib => lib.id !== id);
  if (filtered.length === libs.length) throw new Error('文档库不存在');
  await writeJsonFile(getLibsKey(), filtered);

  // 删除所有已存在的语言目录下该库的数据
  const locales = await getLocaleDirs();
  for (const locale of locales) {
    const libDirKey = getLibDirKey(locale, id);
    await deleteDir(libDirKey);
  }

  // 删除对应的 pages 记录
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