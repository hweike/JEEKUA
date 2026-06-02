import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { PageData, PageFrontMatter, PageIndexEntry, LocalePagesIndex, HreflangIndex } from '@/types/page';

const DATA_ROOT = path.join(process.cwd(), 'data/pages');

// 辅助：原子写入（临时文件 + rename）
async function atomicWrite(filePath: string, data: string) {
  const tempPath = `${filePath}.tmp.${Date.now()}`;
  await fs.writeFile(tempPath, data, 'utf-8');
  await fs.rename(tempPath, filePath);
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function getPageFilePath(locale: string, pageId: string): string {
  return path.join(DATA_ROOT, locale, `${pageId}.md`);
}

function getPagesIndexPath(locale: string): string {
  return path.join(DATA_ROOT, locale, 'pages.json');
}

// ---------- 索引读写（带重试） ----------
async function readPagesIndex(locale: string, retries = 3): Promise<LocalePagesIndex> {
  const indexPath = getPagesIndexPath(locale);
  for (let i = 0; i < retries; i++) {
    try {
      const data = await fs.readFile(indexPath, 'utf-8');
      return JSON.parse(data);
    } catch (err: any) {
      if (err.code === 'ENOENT') return {};
      if (i === retries - 1) throw new Error(`Failed to read pages.json for ${locale}: ${err.message}`);
      await new Promise(r => setTimeout(r, 100 * (i + 1)));
    }
  }
  return {};
}

async function writePagesIndex(locale: string, index: LocalePagesIndex): Promise<void> {
  const indexPath = getPagesIndexPath(locale);
  await ensureDir(path.dirname(indexPath));
  await atomicWrite(indexPath, JSON.stringify(index, null, 2));
}

// 更新或添加单个页面条目
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

// 删除索引中的条目
export async function deletePagesIndexEntry(locale: string, pageId: string): Promise<void> {
  const index = await readPagesIndex(locale);
  delete index[pageId];
  await writePagesIndex(locale, index);
}

// ---------- 页面文件读写（增加校验） ----------
function validatePageData(page: PageData): void {
  if (!page.id || !/^\d{8}$/.test(page.id)) throw new Error('Invalid page ID (must be 8 digits)');
  if (!page.slug || page.slug.trim() === '') throw new Error('Slug cannot be empty');
  if (!['home', 'policy', 'custom'].includes(page.type)) throw new Error('Invalid page type');
}

export async function readPage(locale: string, pageId: string): Promise<PageData | null> {
  const filePath = getPageFilePath(locale, pageId);
 
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const { data, content: markdown } = matter(content);
    
    const front = data as PageFrontMatter;
    validatePageData({ ...front, content: markdown });
    return { ...front, content: markdown };
  } catch (err: any) {
    console.error(`[readPage] error for ${locale}/${pageId}:`, err);
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

export async function writePage(locale: string, page: PageData): Promise<void> {
  validatePageData(page);
  const filePath = getPageFilePath(locale, page.id);
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
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, fileContent, 'utf-8');
  // 更新索引
  await updatePagesIndexEntry(locale, page);
}

export async function deletePageFile(locale: string, pageId: string): Promise<void> {
  const filePath = getPageFilePath(locale, pageId);
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
  // 删除索引条目
  await deletePagesIndexEntry(locale, pageId);
}

// ---------- 列表查询（直接从索引读取） ----------
export async function listPages(locale: string): Promise<PageData[]> {
  const index = await readPagesIndex(locale);
  return Object.values(index).map(entry => ({
    ...entry,
    content: '',
  }));
}

// ---------- Slug 相关（基于索引遍历，简单够用） ----------
export async function getPageIdBySlug(locale: string, slug: string): Promise<string | null> {
  const index = await readPagesIndex(locale);
  const normalizedInputSlug = slug.toLowerCase(); // 将传入的 slug 转为小写
  for (const [id, entry] of Object.entries(index)) {
    // 将存储的 slug 也转为小写进行比较
    if (entry.slug && entry.slug.toLowerCase() === normalizedInputSlug) {
      return id;
    }
  }
  return null;
}

export async function isSlugExists(locale: string, slug: string, excludePageId?: string): Promise<boolean> {
  const id = await getPageIdBySlug(locale, slug);
  if (!id) return false;
  if (excludePageId && id === excludePageId) return false;
  return true;
}

// ---------- hreflang 全局索引（保留，但不在此清理） ----------
const HREFLANG_PATH = path.join(DATA_ROOT, 'hreflang_index.json');

async function readHreflangIndex(): Promise<HreflangIndex> {
  try {
    const data = await fs.readFile(HREFLANG_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err: any) {
    if (err.code === 'ENOENT') return {};
    throw new Error(`Failed to read hreflang_index.json: ${err.message}`);
  }
}

async function writeHreflangIndex(index: HreflangIndex): Promise<void> {
  await ensureDir(path.dirname(HREFLANG_PATH));
  await atomicWrite(HREFLANG_PATH, JSON.stringify(index, null, 2));
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

// ---------- 辅助函数 ----------
export async function getAllLocales(): Promise<string[]> {
  try {
    const entries = await fs.readdir(DATA_ROOT, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
    return dirs.length ? dirs : ['zh', 'en'];
  } catch {
    return ['zh', 'en'];
  }
}

export async function getHomePageId(locale: string): Promise<string | null> {
  const index = await readPagesIndex(locale);
  // 优先查找固定 ID 10000001
  if (index['10000001']) return '10000001';
  // 降级：查找 type === 'home'
  const homeEntry = Object.entries(index).find(([_, entry]) => entry.type === 'home');
  return homeEntry ? homeEntry[0] : null;
}