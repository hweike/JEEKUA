// lib/frontend-docs.ts
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { locales } from '@/i18n/config';   // 修正导入路径

const DOCS_DIR = path.join(process.cwd(), 'data', 'docs');

function getAllDocsFlat(locale: string): Map<string, any> {
  const localeDir = path.join(DOCS_DIR, locale);
  if (!fs.existsSync(localeDir)) return new Map();
  const docsMap = new Map<string, any>();
  const files = fs.readdirSync(localeDir).filter(f => f.endsWith('.md'));
  for (const file of files) {
    const filePath = path.join(localeDir, file);
    try {
      const { data } = matter(fs.readFileSync(filePath, 'utf-8'));
      if (data.id && data.slug && data.slug.trim() !== '') {
        docsMap.set(data.id, { ...data, file });
      }
    } catch (err) {
      console.error(`解析文档失败: ${filePath}`, err);
    }
  }
  return docsMap;
}

export function getDocsTree(locale: string): any[] {
  const docsMap = getAllDocsFlat(locale);
  const roots: any[] = [];
  const childrenMap = new Map<string, any[]>();

  for (const doc of docsMap.values()) {
    if (!doc.parentId) {
      roots.push(doc);
    } else {
      if (!childrenMap.has(doc.parentId)) childrenMap.set(doc.parentId, []);
      childrenMap.get(doc.parentId)!.push(doc);
    }
  }

  const buildNode = (doc: any): any => {
    const node: any = {
      id: doc.id,
      title: doc.title,
      slug: doc.slug,
      order: doc.order || 0,
    };
    const children = childrenMap.get(doc.id);
    if (children) {
      node.children = children.sort((a, b) => (a.order || 0) - (b.order || 0)).map(buildNode);
    }
    return node;
  };

  return roots.sort((a, b) => (a.order || 0) - (b.order || 0)).map(buildNode);
}

export function getDocByIdAndSlug(locale: string, id: string, slug: string): any {
  const filePath = path.join(DOCS_DIR, locale, `${id}.md`);
  if (!fs.existsSync(filePath)) return null;
  try {
    const { data, content } = matter(fs.readFileSync(filePath, 'utf-8'));
    if (data.slug !== slug) return null;
    return {
      id: data.id,
      title: data.title,
      slug: data.slug,
      parentId: data.parentId,
      order: data.order,
      seo_title: data.seo_title,
      seo_description: data.seo_description,
      seo_keywords: data.seo_keywords,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      content,
    };
  } catch (err) {
    console.error(`读取文档失败: ${filePath}`, err);
    return null;
  }
}

export function getDocById(locale: string, id: string): any {
  const filePath = path.join(DOCS_DIR, locale, `${id}.md`);
  if (!fs.existsSync(filePath)) return null;
  try {
    const { data, content } = matter(fs.readFileSync(filePath, 'utf-8'));
    return {
      id: data.id,
      title: data.title,
      slug: data.slug,
      content,
      seo_title: data.seo_title,
      seo_description: data.seo_description,
      seo_keywords: data.seo_keywords,
    };
  } catch (err) {
    console.error(`读取文档失败: ${filePath}`, err);
    return null;
  }
}

export function getDocMetaById(locale: string, id: string): { id: string; slug: string; title: string } | null {
  const filePath = path.join(DOCS_DIR, locale, `${id}.md`);
  if (!fs.existsSync(filePath)) return null;
  try {
    const { data } = matter(fs.readFileSync(filePath, 'utf-8'));
    if (data.id && data.slug) {
      return {
        id: data.id,
        slug: data.slug,
        title: data.title || '',
      };
    }
  } catch (err) {
    console.error(`读取文档元数据失败: ${filePath}`, err);
  }
  return null;
}

export function getAllLanguageVersionsById(id: string): Record<string, { id: string; slug: string; title: string }> {
  const result: Record<string, { id: string; slug: string; title: string }> = {};
  for (const locale of locales) {
    const meta = getDocMetaById(locale, id);
    if (meta) {
      result[locale] = meta;
    }
  }
  return result;
}

export function getAllDocSlugs(locale: string): { id: string; slug: string }[] {
  const localeDir = path.join(DOCS_DIR, locale);
  if (!fs.existsSync(localeDir)) return [];
  const slugs: { id: string; slug: string }[] = [];
  const files = fs.readdirSync(localeDir).filter(f => f.endsWith('.md'));
  for (const file of files) {
    const filePath = path.join(localeDir, file);
    try {
      const { data } = matter(fs.readFileSync(filePath, 'utf-8'));
      if (data.id && data.slug && data.slug.trim() !== '') {
        slugs.push({ id: data.id, slug: data.slug.trim() });
      }
    } catch (err) {
      console.error(`读取 slug 失败: ${filePath}`, err);
    }
  }
  return slugs;
}