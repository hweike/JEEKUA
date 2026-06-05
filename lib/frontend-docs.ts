// lib/frontend-docs.ts
import matter from 'gray-matter';
import { getPrivateStorage } from '@/lib/storage/factory';
import { locales } from '@/i18n/config';

/**
 * 获取指定语言的所有文档（扁平结构）
 * @returns Map<id, 文档数据>
 */
async function getAllDocsFlat(locale: string): Promise<Map<string, any>> {
  const storage = getPrivateStorage();
  const prefix = `data/docs/${locale}/`;
  const docsMap = new Map<string, any>();
  try {
    const keys = await storage.list(prefix);
    const mdKeys = keys.filter(key => key.endsWith('.md'));
    for (const key of mdKeys) {
      try {
        const content = await storage.read(key, 'utf8');
        const { data } = matter(content as string);
        if (data.id && data.slug && data.slug.trim() !== '') {
          const fileName = key.split('/').pop() || '';
          docsMap.set(data.id, { ...data, file: fileName });
        }
      } catch (err) {
        console.error(`解析文档失败: ${key}`, err);
      }
    }
  } catch (error: any) {
    if (!(error?.message?.includes('File not found') || error?.code === 'NoSuchKey')) {
      console.error(`列出文档目录失败: ${prefix}`, error);
    }
  }
  return docsMap;
}

/**
 * 获取文档树（层级结构）
 */
export async function getDocsTree(locale: string): Promise<any[]> {
  const docsMap = await getAllDocsFlat(locale);
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

/**
 * 根据 ID 和 slug 获取文档（含内容）
 */
export async function getDocByIdAndSlug(locale: string, id: string, slug: string): Promise<any> {
  const storage = getPrivateStorage();
  const key = `data/docs/${locale}/${id}.md`;
  try {
    const content = await storage.read(key, 'utf8');
    const { data, content: markdown } = matter(content as string);
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
      content: markdown,
    };
  } catch (error: any) {
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      return null;
    }
    console.error(`读取文档失败: ${key}`, error);
    return null;
  }
}

/**
 * 根据 ID 获取文档（含内容）
 */
export async function getDocById(locale: string, id: string): Promise<any> {
  const storage = getPrivateStorage();
  const key = `data/docs/${locale}/${id}.md`;
  try {
    const content = await storage.read(key, 'utf8');
    const { data, content: markdown } = matter(content as string);
    return {
      id: data.id,
      title: data.title,
      slug: data.slug,
      content: markdown,
      seo_title: data.seo_title,
      seo_description: data.seo_description,
      seo_keywords: data.seo_keywords,
    };
  } catch (error: any) {
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      return null;
    }
    console.error(`读取文档失败: ${key}`, error);
    return null;
  }
}

/**
 * 根据 ID 获取文档元数据（无内容）
 */
export async function getDocMetaById(locale: string, id: string): Promise<{ id: string; slug: string; title: string } | null> {
  const storage = getPrivateStorage();
  const key = `data/docs/${locale}/${id}.md`;
  try {
    const content = await storage.read(key, 'utf8');
    const { data } = matter(content as string);
    if (data.id && data.slug) {
      return {
        id: data.id,
        slug: data.slug,
        title: data.title || '',
      };
    }
    return null;
  } catch (error: any) {
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      return null;
    }
    console.error(`读取文档元数据失败: ${key}`, error);
    return null;
  }
}

/**
 * 获取文档的所有语言版本（遍历 locales）
 */
export async function getAllLanguageVersionsById(id: string): Promise<Record<string, { id: string; slug: string; title: string }>> {
  const result: Record<string, { id: string; slug: string; title: string }> = {};
  for (const locale of locales) {
    const meta = await getDocMetaById(locale, id);
    if (meta) {
      result[locale] = meta;
    }
  }
  return result;
}

/**
 * 获取所有文档的 slug 列表（用于生成静态路径）
 */
export async function getAllDocSlugs(locale: string): Promise<{ id: string; slug: string }[]> {
  const storage = getPrivateStorage();
  const prefix = `data/docs/${locale}/`;
  const slugs: { id: string; slug: string }[] = [];
  try {
    const keys = await storage.list(prefix);
    const mdKeys = keys.filter(key => key.endsWith('.md'));
    for (const key of mdKeys) {
      try {
        const content = await storage.read(key, 'utf8');
        const { data } = matter(content as string);
        if (data.id && data.slug && data.slug.trim() !== '') {
          slugs.push({ id: data.id, slug: data.slug.trim() });
        }
      } catch (err) {
        console.error(`读取 slug 失败: ${key}`, err);
      }
    }
  } catch (error: any) {
    if (!(error?.message?.includes('File not found') || error?.code === 'NoSuchKey')) {
      console.error(`列出文档目录失败: ${prefix}`, error);
    }
  }
  return slugs;
}