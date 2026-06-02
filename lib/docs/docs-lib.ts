import fs from 'fs/promises';
import path from 'path';
import { DATA_ROOT, ensureDir, readJsonFile, writeJsonFile, generateLibId } from './utils';
import type { DocsLib } from './types';

const getLibsPath = (locale: string) => path.join(DATA_ROOT, locale, 'libs.json');

export async function getDocsLibs(locale: string): Promise<DocsLib[]> {
  const libs = await readJsonFile<DocsLib[]>(getLibsPath(locale));
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
  await writeJsonFile(getLibsPath(locale), libs);
  const libDir = path.join(DATA_ROOT, locale, newLib.id);
  await ensureDir(libDir);
  await writeJsonFile(path.join(libDir, 'index.json'), { docs: [] });
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
  await writeJsonFile(getLibsPath(locale), libs);
}

export async function deleteDocsLib(locale: string, id: string): Promise<void> {
  const libs = await getDocsLibs(locale);
  const filtered = libs.filter(lib => lib.id !== id);
  if (filtered.length === libs.length) throw new Error('文档库不存在');
  await writeJsonFile(getLibsPath(locale), filtered);
  const libDir = path.join(DATA_ROOT, locale, id);
  await fs.rm(libDir, { recursive: true, force: true });
}