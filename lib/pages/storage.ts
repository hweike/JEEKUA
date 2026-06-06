// lib/pages/storage.ts
import matter from 'gray-matter';
import { PageData, PageFrontMatter, PageIndexEntry, LocalePagesIndex, HreflangIndex } from '@/types/page';
import { getPrivateStorage } from '@/lib/storage/factory';

const STORAGE_PREFIX = 'data/pages';

function getPageFileKey(locale: string, pageId: string): string {
  return `${STORAGE_PREFIX}/${locale}/${pageId}.md`;
}

function getPagesIndexKey(locale: string): string {
  return `${STORAGE_PREFIX}/${locale}/pages.json`;
}

const HREFLANG_KEY = `${STORAGE_PREFIX}/hreflang_index.json`;

async function ensureDir(dir: string): Promise<void> {}

function isNotFoundError(error: any): boolean {
  // 兼容不同的错误表示
  return (
    error?.$metadata?.httpStatusCode === 404 ||
    error?.Code === 'NoSuchKey' ||
    error?.code === 'NoSuchKey' ||
    error?.message?.includes('NoSuchKey') ||
    error?.message?.includes('not found')
  );
}

async function readPagesIndex(locale: string, retries = 3): Promise<LocalePagesIndex> {
  const storage = getPrivateStorage();
  const key = getPagesIndexKey(locale);
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      const content = await storage.read(key, 'utf8');
      return JSON.parse(content as string);
    } catch (err: any) {
      lastError = err;
      if (isNotFoundError(err)) {
        // 文件不存在，直接返回空对象
        return {};
      }
      if (i === retries - 1) {
        console.error(`[readPagesIndex] Failed to read ${key} after ${retries} attempts:`, err);
        return {}; // 降级：返回空对象，避免接口崩溃
      }
      await new Promise(r => setTimeout(r, 100 * (i + 1)));
    }
  }
  return {};
}

async function writePagesIndex(locale: string, index: LocalePagesIndex): Promise<void> {
  const storage = getPrivateStorage();
  const key = getPagesIndexKey(locale);
  await storage.write(key, JSON.stringify(index, null, 2), { contentType: 'application/json' });
}

export async function updatePagesIndexEntry(locale: string, page: PageData): Promise<void> {
  const index = await readPagesIndex(locale);
  const entry: PageIndexEntry = {
    id: page.id,
    title: page.title,
    type: page.type,
    preset: page.preset,
    visible: page.visible,
    template: page.template,
    slug: page.slug,
    seo_keywords: page.seo_keywords,
    seo_title: page.seo_title,
    seo_description: page.seo_description,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  };
  index[page.id] = entry;
  await writePagesIndex(locale, index);
}

export async function deletePagesIndexEntry(locale: string, pageId: string): Promise<void> {
  const index = await readPagesIndex(locale);
  delete index[pageId];
  await writePagesIndex(locale, index);
}

function validatePageData(page: PageData): void {
  if (!page.id || !/^\d{8}$/.test(page.id)) throw new Error('Invalid page ID (must be 8 digits)');
  if (!page.slug || page.slug.trim() === '') throw new Error('Slug cannot be empty');
  if (!['home', 'policy', 'custom'].includes(page.type)) throw new Error('Invalid page type');
}

export async function readPage(locale: string, pageId: string): Promise<PageData | null> {
  const storage = getPrivateStorage();
  const key = getPageFileKey(locale, pageId);
  try {
    const content = await storage.read(key, 'utf8');
    const { data, content: markdown } = matter(content as string);
    const front = data as PageFrontMatter;
    validatePageData({ ...front, content: markdown });
    return { ...front, content: markdown };
  } catch (err: any) {
    if (isNotFoundError(err)) return null;
    console.error(`[readPage] error for ${locale}/${pageId}:`, err);
    return null; // 降级返回 null
  }
}

export async function writePage(locale: string, page: PageData): Promise<void> {
  validatePageData(page);
  const storage = getPrivateStorage();
  const key = getPageFileKey(locale, page.id);
  const frontMatter: PageFrontMatter = {
    id: page.id,
    title: page.title,
    type: page.type,
    preset: page.preset,
    visible: page.visible,
    template: page.template,
    slug: page.slug,
    seo_keywords: page.seo_keywords,
    seo_title: page.seo_title,
    seo_description: page.seo_description,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  };
  const fileContent = matter.stringify(page.content, frontMatter);
  await storage.write(key, fileContent, { contentType: 'text/markdown' });
  await updatePagesIndexEntry(locale, page);
}

export async function deletePageFile(locale: string, pageId: string): Promise<void> {
  const storage = getPrivateStorage();
  const key = getPageFileKey(locale, pageId);
  try {
    await storage.delete(key);
  } catch (err: any) {
    if (!isNotFoundError(err)) throw err;
  }
  await deletePagesIndexEntry(locale, pageId);
}

export async function listPages(locale: string): Promise<PageData[]> {
  const index = await readPagesIndex(locale);
  return Object.values(index).map(entry => ({ ...entry, content: '' }));
}

export async function getPageIdBySlug(locale: string, slug: string): Promise<string | null> {
  const index = await readPagesIndex(locale);
  const normalizedInputSlug = slug.toLowerCase();
  for (const [id, entry] of Object.entries(index)) {
    if (entry.slug && entry.slug.toLowerCase() === normalizedInputSlug) return id;
  }
  return null;
}

export async function isSlugExists(locale: string, slug: string, excludePageId?: string): Promise<boolean> {
  const id = await getPageIdBySlug(locale, slug);
  if (!id) return false;
  if (excludePageId && id === excludePageId) return false;
  return true;
}

async function readHreflangIndex(): Promise<HreflangIndex> {
  const storage = getPrivateStorage();
  try {
    const content = await storage.read(HREFLANG_KEY, 'utf8');
    return JSON.parse(content as string);
  } catch (err: any) {
    if (isNotFoundError(err)) return {};
    console.error('Failed to read hreflang_index.json:', err);
    return {};
  }
}

async function writeHreflangIndex(index: HreflangIndex): Promise<void> {
  const storage = getPrivateStorage();
  await storage.write(HREFLANG_KEY, JSON.stringify(index, null, 2), { contentType: 'application/json' });
}

export async function updateHreflangEntry(pageId: string, locale: string, urlPath: string): Promise<void> {
  const index = await readHreflangIndex();
  if (!index[pageId]) index[pageId] = {};
  index[pageId][locale] = urlPath;
  await writeHreflangIndex(index);
}

export async function removeHreflangEntry(pageId: string): Promise<void> {
  const index = await readHreflangIndex();
  delete index[pageId];
  await writeHreflangIndex(index);
}

export async function getHreflangMap(pageId: string): Promise<Record<string, string>> {
  const index = await readHreflangIndex();
  return index[pageId] || {};
}

export async function getAllLocales(): Promise<string[]> {
  const storage = getPrivateStorage();
  try {
    const keys = await storage.list(STORAGE_PREFIX);
    const locales = new Set<string>();
    for (const key of keys) {
      const parts = key.split('/');
      if (parts.length >= 3) locales.add(parts[2]);
    }
    if (locales.size === 0) return ['zh', 'en'];
    return Array.from(locales).sort();
  } catch (err) {
    console.error('Failed to list locales from R2:', err);
    return ['zh', 'en'];
  }
}

export async function getHomePageId(locale: string): Promise<string | null> {
  const index = await readPagesIndex(locale);
  if (index['10000001']) return '10000001';
  const homeEntry = Object.entries(index).find(([_, entry]) => entry.type === 'home');
  return homeEntry ? homeEntry[0] : null;
}