// lib/pages/storage.ts
import matter from 'gray-matter';
import { PageData, PageFrontMatter, PageIndexEntry, LocalePagesIndex } from '@/types/page';
import { getPrivateStorage } from '@/lib/storage/factory';
import { supabase } from '@/lib/supabase/client';

const STORAGE_PREFIX = 'pages';
const SITE_ID = '000001';

function getPageFileKey(locale: string, pageId: string): string {
  return `${STORAGE_PREFIX}/${locale}/${pageId}.md`;
}

function getPagesIndexKey(locale: string): string {
  return `${STORAGE_PREFIX}/${locale}/pages.json`;
}

// ---------- 数据库操作（使用复合主键） ----------

async function getPageMetaFromDb(pageId: string, locale: string): Promise<PageIndexEntry | null> {
  const { data, error } = await supabase
    .from('site_pages')
    .select('id, title, type, preset, visible, template, template_hash, slug, seo_keywords, seo_title, seo_description, created_at, updated_at')
    .eq('site_id', SITE_ID)
    .eq('id', pageId)
    .eq('locale', locale)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    title: data.title,
    type: data.type,
    preset: data.preset,
    visible: data.visible,
    template: data.template,
    templateHash: data.template_hash,
    slug: data.slug,
    seo_keywords: data.seo_keywords,
    seo_title: data.seo_title,
    seo_description: data.seo_description,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

async function getPageMetaBySlugFromDb(slug: string, locale: string): Promise<PageIndexEntry | null> {
  const { data, error } = await supabase
    .from('site_pages')
    .select('id, title, type, preset, visible, template, template_hash, slug, seo_keywords, seo_title, seo_description, created_at, updated_at')
    .eq('site_id', SITE_ID)
    .eq('locale', locale)
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    title: data.title,
    type: data.type,
    preset: data.preset,
    visible: data.visible,
    template: data.template,
    templateHash: data.template_hash,
    slug: data.slug,
    seo_keywords: data.seo_keywords,
    seo_title: data.seo_title,
    seo_description: data.seo_description,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

async function getAllPagesMetaFromDb(locale?: string): Promise<PageIndexEntry[]> {
  let query = supabase
    .from('site_pages')
    .select('id, title, type, preset, visible, template, template_hash, slug, seo_keywords, seo_title, seo_description, created_at, updated_at')
    .eq('site_id', SITE_ID)
    .order('created_at', { ascending: false });

  if (locale) {
    query = query.eq('locale', locale);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map(row => ({
    id: row.id,
    title: row.title,
    type: row.type,
    preset: row.preset,
    visible: row.visible,
    template: row.template,
    templateHash: row.template_hash,
    slug: row.slug,
    seo_keywords: row.seo_keywords,
    seo_title: row.seo_title,
    seo_description: row.seo_description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

async function upsertPageMetaInDb(page: PageData, locale: string): Promise<void> {
  const { error } = await supabase
    .from('site_pages')
    .upsert({
      site_id: SITE_ID,
      id: page.id,
      locale: locale,
      title: page.title,
      type: page.type,
      preset: page.preset || false,
      visible: page.visible || 'visible',
      template: page.template || '',
      template_hash: page.templateHash || null,   // 新增
      slug: page.slug,
      seo_keywords: page.seo_keywords || '',
      seo_title: page.seo_title || '',
      seo_description: page.seo_description || '',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'site_id,id,locale' });

  if (error) {
    console.error(`[upsertPageMetaInDb] Failed for ${locale}/${page.id}:`, error);
    throw error;
  }
}

async function deletePageMetaFromDb(pageId: string, locale: string): Promise<void> {
  const { error } = await supabase
    .from('site_pages')
    .delete()
    .eq('site_id', SITE_ID)
    .eq('id', pageId)
    .eq('locale', locale);

  if (error) {
    console.error(`[deletePageMetaFromDb] Failed for ${locale}/${pageId}:`, error);
    throw error;
  }
}

// ---------- 工具函数 ----------

function isNotFoundError(error: any): boolean {
  return (
    error?.$metadata?.httpStatusCode === 404 ||
    error?.Code === 'NoSuchKey' ||
    error?.code === 'NoSuchKey' ||
    error?.message?.includes('NoSuchKey') ||
    error?.message?.includes('not found')
  );
}

// ---------- 读取 pages.json（仅用于迁移） ----------
async function readPagesIndex(locale: string): Promise<LocalePagesIndex> {
  const storage = getPrivateStorage();
  const key = getPagesIndexKey(locale);
  try {
    const content = await storage.read(key, 'utf8');
    return JSON.parse(content as string);
  } catch (err: any) {
    if (isNotFoundError(err)) return {};
    console.error(`[readPagesIndex] Failed to read ${key}:`, err);
    return {};
  }
}

// ---------- 核心 API ----------

export async function readPage(locale: string, pageId: string): Promise<PageData | null> {
  const storage = getPrivateStorage();
  const key = getPageFileKey(locale, pageId);

  try {
    const content = await storage.read(key, 'utf8');
    const { data: frontmatter, content: markdown } = matter(content as string);
    const pageData: PageData = {
      id: frontmatter.id,
      title: frontmatter.title,
      type: frontmatter.type,
      preset: frontmatter.preset,
      visible: frontmatter.visible,
      template: frontmatter.template,
      templateHash: frontmatter.templateHash || null,
      slug: frontmatter.slug,
      seo_keywords: frontmatter.seo_keywords,
      seo_title: frontmatter.seo_title,
      seo_description: frontmatter.seo_description,
      createdAt: frontmatter.createdAt,
      updatedAt: frontmatter.updatedAt,
      content: markdown,
      templateData: frontmatter.templateData || null,
      locale: locale,
    };

    upsertPageMetaInDb(pageData, locale).catch(err => {
      console.warn(`[readPage] Failed to upsert meta for ${locale}/${pageId}:`, err);
    });

    return pageData;
  } catch (err: any) {
    if (isNotFoundError(err)) {
      const meta = await getPageMetaFromDb(pageId, locale);
      if (meta) {
        return {
          ...meta,
          content: '',
          templateData: null,
          locale: locale,
          templateHash: meta.templateHash || null,
        } as PageData;
      }
      return null;
    }
    console.error(`[readPage] error for ${locale}/${pageId}:`, err);
    return null;
  }
}

export async function writePage(locale: string, page: PageData): Promise<void> {
  const storage = getPrivateStorage();
  const key = getPageFileKey(locale, page.id);
  const frontMatter: PageFrontMatter = {
    id: page.id,
    title: page.title,
    type: page.type,
    preset: page.preset,
    visible: page.visible,
    template: page.template,
    templateHash: page.templateHash || null,
    slug: page.slug,
    seo_keywords: page.seo_keywords,
    seo_title: page.seo_title,
    seo_description: page.seo_description,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
    templateData: page.templateData || null,
  };
  const fileContent = matter.stringify(page.content || '', frontMatter);
  await storage.write(key, fileContent, { contentType: 'text/markdown' });

  await upsertPageMetaInDb(page, locale);
}

export async function deletePageFile(locale: string, pageId: string): Promise<void> {
  const storage = getPrivateStorage();
  const key = getPageFileKey(locale, pageId);
  try {
    await storage.delete(key);
  } catch (err: any) {
    if (!isNotFoundError(err)) throw err;
  }

  await deletePageMetaFromDb(pageId, locale);
}

export async function listPages(locale: string): Promise<PageData[]> {
  const metas = await getAllPagesMetaFromDb(locale);
  return metas.map(meta => ({
    ...meta,
    locale: locale,
    content: '',
    templateData: null,
    templateHash: meta.templateHash || null,
  } as PageData));
}

export async function getPageIdBySlug(locale: string, slug: string): Promise<string | null> {
  const meta = await getPageMetaBySlugFromDb(slug, locale);
  return meta ? meta.id : null;
}

export async function isSlugExists(locale: string, slug: string, excludePageId?: string): Promise<boolean> {
  const id = await getPageIdBySlug(locale, slug);
  if (!id) return false;
  if (excludePageId && id === excludePageId) return false;
  return true;
}

// ---------- 兼容旧代码的辅助函数 ----------
export async function updatePagesIndexEntry(locale: string, page: PageData): Promise<void> {
  await upsertPageMetaInDb(page, locale);
}

export async function deletePagesIndexEntry(locale: string, pageId: string): Promise<void> {
  await deletePageMetaFromDb(pageId, locale);
}

// ---------- 获取所有语言 ----------
export async function getAllLocales(): Promise<string[]> {
  const { data, error } = await supabase
    .from('site_pages')
    .select('locale')
    .eq('site_id', SITE_ID)
    .order('locale');

  if (error || !data) {
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
    } catch {
      return ['zh', 'en'];
    }
  }
  return data.map(row => row.locale).filter(Boolean);
}

export async function getHomePageId(locale: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('site_pages')
    .select('id')
    .eq('site_id', SITE_ID)
    .eq('locale', locale)
    .eq('type', 'home')
    .maybeSingle();

  if (error || !data) {
    const index = await readPagesIndex(locale);
    if (index['10000001']) return '10000001';
    const homeEntry = Object.entries(index).find(([_, entry]) => entry.type === 'home');
    return homeEntry ? homeEntry[0] : null;
  }
  return data.id;
}