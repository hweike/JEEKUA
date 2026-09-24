// lib/docs/document.ts
import sql from '@/lib/db/admin';
import { getPrivateStorage } from '@/lib/storage/factory';
import type { Doc } from './types';
import { registerEntity } from '@/lib/discovery/services/business-register-pages.service';
import { deletePage } from '@/lib/discovery/register';
import { getDocsLib, getDocsLibs } from './docs-lib';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

// ============================================================
// 辅助函数（内部复用）
// ============================================================

function mapRowToDoc(row: any): Doc {
  return {
    id: row.id,
    libId: row.lib_id,
    title: row.title,
    slug: row.slug,
    parentId: row.parent_id,
    order: row.order_index,
    file: row.file,
    templateId: row.template_id,
    seo_title: row.seo_title,
    seo_description: row.seo_description,
    seo_keywords: row.seo_keywords,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function readMarkdown(locale: string, libId: string, file: string): Promise<string> {
  const storage = getPrivateStorage();
  const key = `docs/${locale}/${libId}/${file}`;
  try {
    const content = await storage.read(key, 'utf8');
    return content as string;
  } catch {
    return '';
  }
}

async function writeMarkdown(locale: string, libId: string, file: string, content: string): Promise<void> {
  const storage = getPrivateStorage();
  const key = `docs/${locale}/${libId}/${file}`;
  await storage.write(key, content || '', { contentType: 'text/markdown' });
}

async function getLibSlug(libId: string): Promise<string> {
  try {
    const lib = await getDocsLib(libId);
    return lib?.slug || libId;
  } catch {
    return libId;
  }
}

async function getNextOrderIndex(locale: string, libId: string, parentId: string | null): Promise<number> {
  try {
    const rows = await sql<{ order_index: number }[]>`
      SELECT order_index FROM public.documents
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND lib_id = ${libId}
        AND locale = ${locale}
        AND parent_id ${parentId === null ? sql`IS NULL` : sql`= ${parentId}`}
      ORDER BY order_index DESC
      LIMIT 1
    `;
    return rows.length > 0 ? rows[0].order_index + 1 : 0;
  } catch {
    return 0;
  }
}

async function registerDocToPages(
  doc: Doc,
  locale: string,
  libId: string,
  content?: string
): Promise<void> {
  const libSlug = await getLibSlug(libId);
  const pageData = {
    id: doc.id,
    title: doc.title,
    slug: doc.slug,
    lib_id: libId,
    lib_slug: libSlug,
    seo_title: doc.seo_title,
    seo_description: doc.seo_description,
    seo_keywords: doc.seo_keywords,
    content_full: content || '',
    updated_at: doc.updatedAt,
  };
  registerEntity({
    type: 'doc',
    id: doc.id,
    locale,
    data: pageData,
    updatedAt: doc.updatedAt,
  }).catch(err => console.error(`注册文档失败 (${doc.id}):`, err));
}

async function ensureDocExistsInTarget(
  targetLocale: string,
  docId: string,
  sourceLocale?: string
): Promise<{ libId: string; existed: boolean }> {
  try {
    const rows = await sql<{ lib_id: string }[]>`
      SELECT lib_id FROM public.documents
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND id = ${docId}
        AND locale = ${targetLocale}
      LIMIT 1
    `;
    if (rows[0]) {
      return { libId: rows[0].lib_id, existed: true };
    }
  } catch {}

  if (!sourceLocale) {
    throw new Error(`文档 ${docId} 在目标语言中不存在且未提供源语言`);
  }

  let sourceLibId: string;
  try {
    const rows = await sql<{ lib_id: string }[]>`
      SELECT lib_id FROM public.documents
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND id = ${docId}
        AND locale = ${sourceLocale}
      LIMIT 1
    `;
    if (!rows[0]) {
      throw new Error(`无法从源语言获取文档 ${docId} 的信息: 不存在`);
    }
    sourceLibId = rows[0].lib_id;
  } catch (sourceError: any) {
    throw new Error(`无法从源语言获取文档 ${docId} 的信息: ${sourceError.message}`);
  }

  await copyDocument(sourceLocale, targetLocale, sourceLibId, docId);
  return { libId: sourceLibId, existed: false };
}

// ============================================================
// 公开导出函数
// ============================================================

export async function getDocsByLib(locale: string, libId: string): Promise<Doc[]> {
  try {
    const data = await sql<any[]>`
      SELECT * FROM public.documents
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND lib_id = ${libId}
        AND locale = ${locale}
      ORDER BY order_index ASC
    `;
    return data.map(mapRowToDoc);
  } catch (error) {
    console.error('获取文档列表失败:', error);
    return [];
  }
}

export async function getDocument(locale: string, libId: string, docId: string) {
  let row: any;
  try {
    const rows = await sql<any[]>`
      SELECT * FROM public.documents
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND lib_id = ${libId}
        AND id = ${docId}
        AND locale = ${locale}
      LIMIT 1
    `;
    row = rows[0];
  } catch {
    return null;
  }
  if (!row) return null;

  const doc = mapRowToDoc(row);
  const content = await readMarkdown(locale, libId, doc.file);
  return { ...doc, content };
}

export async function getDocBySlug(locale: string, libId: string, slug: string) {
  let row: any;
  try {
    const rows = await sql<any[]>`
      SELECT * FROM public.documents
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND lib_id = ${libId}
        AND locale = ${locale}
        AND slug = ${slug}
      LIMIT 1
    `;
    row = rows[0];
  } catch {
    return null;
  }
  if (!row) return null;

  const doc = mapRowToDoc(row);
  const content = await readMarkdown(locale, libId, doc.file);
  return { doc, content };
}

export async function saveDocument(
  locale: string,
  libId: string,
  docData: Partial<Doc> & { id?: string },
  content: string
): Promise<Doc> {
  const now = new Date().toISOString();
  const docId = docData.id || generateDocId();
  const file = docData.file || `${docId}.md`;

  let existing: any;
  try {
    const rows = await sql<any[]>`
      SELECT * FROM public.documents
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND id = ${docId}
        AND locale = ${locale}
      LIMIT 1
    `;
    existing = rows[0];
  } catch {}

  const isNew = !existing;

  let orderIndex = docData.order ?? 0;
  if (isNew) {
    orderIndex = await getNextOrderIndex(locale, libId, docData.parentId ?? null);
  } else {
    orderIndex = docData.order ?? existing.order_index;
  }

  const docPayload = {
    id: docId,
    lib_id: libId,
    locale,
    title: docData.title ?? existing?.title ?? '未命名文档',
    slug: docData.slug ?? existing?.slug ?? '',
    parent_id: docData.parentId !== undefined ? docData.parentId : (existing?.parent_id ?? null),
    order_index: orderIndex,
    file: docData.file ?? existing?.file ?? file,
    template_id: docData.templateId ?? existing?.template_id ?? null,
    seo_title: docData.seo_title ?? existing?.seo_title ?? '',
    seo_description: docData.seo_description ?? existing?.seo_description ?? '',
    seo_keywords: docData.seo_keywords ?? existing?.seo_keywords ?? '',
    updated_at: now,
  };

  let createdAt = now;

  if (isNew) {
    try {
      await sql`
        INSERT INTO public.documents (
          site_id, id, lib_id, locale, title, slug, parent_id, order_index,
          file, template_id, seo_title, seo_description, seo_keywords,
          created_at, updated_at
        ) VALUES (
          ${DEFAULT_SITE_ID}, ${docPayload.id}, ${docPayload.lib_id}, ${docPayload.locale},
          ${docPayload.title}, ${docPayload.slug}, ${docPayload.parent_id}, ${docPayload.order_index},
          ${docPayload.file}, ${docPayload.template_id},
          ${docPayload.seo_title}, ${docPayload.seo_description}, ${docPayload.seo_keywords},
          ${now}, ${now}
        )
      `;
    } catch (error: any) {
      throw new Error('插入文档失败: ' + error.message);
    }
    createdAt = now;
  } else {
    try {
      await sql`
        UPDATE public.documents
        SET title = ${docPayload.title},
            slug = ${docPayload.slug},
            parent_id = ${docPayload.parent_id},
            order_index = ${docPayload.order_index},
            file = ${docPayload.file},
            template_id = ${docPayload.template_id},
            seo_title = ${docPayload.seo_title},
            seo_description = ${docPayload.seo_description},
            seo_keywords = ${docPayload.seo_keywords},
            updated_at = ${now}
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND id = ${docId}
          AND locale = ${locale}
      `;
    } catch (error: any) {
      throw new Error('更新文档失败: ' + error.message);
    }
    createdAt = existing.created_at;
  }

  await writeMarkdown(locale, libId, docPayload.file, content);

  const resultDoc: Doc = {
    id: docId,
    libId,
    title: docPayload.title,
    slug: docPayload.slug,
    parentId: docPayload.parent_id,
    order: docPayload.order_index,
    file: docPayload.file,
    templateId: docPayload.template_id,
    seo_title: docPayload.seo_title,
    seo_description: docPayload.seo_description,
    seo_keywords: docPayload.seo_keywords,
    createdAt,
    updatedAt: now,
  };

  await registerDocToPages(resultDoc, locale, libId, content);

  // ✅ 新增：清空文档参数缓存
  clearAllDocParamsCache();

  return resultDoc;
}

export async function copyDocument(
  sourceLocale: string,
  targetLocale: string,
  libId: string,
  docId: string
): Promise<void> {
  const sourceDoc = await getDocument(sourceLocale, libId, docId);
  if (!sourceDoc) throw new Error('源文档不存在');
  await saveDocument(
    targetLocale,
    libId,
    {
      id: docId,
      title: sourceDoc.title,
      slug: sourceDoc.slug,
      parentId: sourceDoc.parentId,
      order: sourceDoc.order,
      templateId: sourceDoc.templateId,
      seo_title: sourceDoc.seo_title,
      seo_description: sourceDoc.seo_description,
      seo_keywords: sourceDoc.seo_keywords,
      file: sourceDoc.file,
    },
    sourceDoc.content || ''
  );
}

export async function deleteDocument(locale: string, libId: string, docId: string): Promise<void> {
  // 1. 查找直接子文档
  let children: { id: string }[] = [];
  try {
    children = await sql<{ id: string }[]>`
      SELECT id FROM public.documents
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND lib_id = ${libId}
        AND locale = ${locale}
        AND parent_id = ${docId}
    `;
  } catch (childError: any) {
    throw new Error('查询子文档失败: ' + childError.message);
  }

  // 2. 将子文档提升为顶级
  if (children.length > 0) {
    const childIds = children.map(c => c.id);
    try {
      await sql`
        UPDATE public.documents
        SET parent_id = NULL
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND lib_id = ${libId}
          AND locale = ${locale}
          AND id IN ${sql(childIds)}
      `;
    } catch (updateError: any) {
      throw new Error('更新子文档父级失败: ' + updateError.message);
    }
  }

  // 3. 删除 Markdown 文件
  let docFile: { file: string } | undefined;
  try {
    const rows = await sql<{ file: string }[]>`
      SELECT file FROM public.documents
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND lib_id = ${libId}
        AND locale = ${locale}
        AND id = ${docId}
      LIMIT 1
    `;
    docFile = rows[0];
  } catch {}

  if (docFile) {
    const key = `docs/${locale}/${libId}/${docFile.file}`;
    try {
      const storage = getPrivateStorage();
      await storage.delete(key);
    } catch {}
  }

  // 4. 删除数据库记录
  try {
    await sql`
      DELETE FROM public.documents
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND lib_id = ${libId}
        AND locale = ${locale}
        AND id = ${docId}
    `;
  } catch (deleteError: any) {
    throw new Error('删除文档失败: ' + deleteError.message);
  }

  // 5. 删除 pages 记录
  const pageId = `doc:${docId}`;
  try {
    await deletePage(pageId, locale);
  } catch (err) {
    console.error(`删除文档 pages 失败 (${pageId}):`, err);
  }

  // ✅ 新增：清空文档参数缓存
  clearAllDocParamsCache();
}

export async function updateDocOrders(
  locale: string,
  libId: string,
  items: Array<{ id: string; parentId: string | null; order: number }>,
  retries = 2
): Promise<void> {
  for (const item of items) {
    let attempt = 0;
    while (attempt <= retries) {
      try {
        await sql`
          UPDATE public.documents
          SET parent_id = ${item.parentId},
              order_index = ${item.order},
              updated_at = ${new Date().toISOString()}
          WHERE site_id = ${DEFAULT_SITE_ID}
            AND id = ${item.id}
            AND locale = ${locale}
        `;
        break;
      } catch (err: any) {
        attempt++;
        if (attempt > retries) {
          throw new Error(`更新排序失败 (locale: ${locale}, id: ${item.id}): ${err.message}`);
        }
        await new Promise(r => setTimeout(r, 100 * Math.pow(2, attempt - 1)));
      }
    }
  }
}

export async function syncDocOrdersAllLocales(
  libId: string,
  items: Array<{ id: string; parentId: string | null; order: number }>
): Promise<void> {
  let locales: string[] = [];
  try {
    const rows = await sql<{ locale: string }[]>`
      SELECT DISTINCT locale FROM public.documents
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND lib_id = ${libId}
    `;
    locales = rows.map(r => r.locale);
  } catch {
    return;
  }
  if (locales.length === 0) return;

  const concurrency = 2;
  const errors: string[] = [];

  for (let i = 0; i < locales.length; i += concurrency) {
    const batch = locales.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (locale) => {
        try {
          await updateDocOrders(locale, libId, items);
        } catch (err: any) {
          const msg = `语言 ${locale} 更新失败: ${err.message}`;
          errors.push(msg);
          console.error(msg);
        }
      })
    );
  }

  if (errors.length > 0) {
    throw new Error(`部分语言同步失败:\n${errors.join('\n')}`);
  }
}

export async function getDocTree(locale: string, libId: string): Promise<any[]> {
  const docs = await getDocsByLib(locale, libId);
  if (!docs || docs.length === 0) {
    return [];
  }

  const allIds = new Set(docs.map(d => d.id));

  const cleanedDocs = docs.map(doc => {
    if (doc.parentId && !allIds.has(doc.parentId)) {
      console.warn(`[getDocTree] 孤儿文档: ${doc.id} 的 parentId ${doc.parentId} 不存在，已提升为一级文档`);
      return { ...doc, parentId: null };
    }
    return doc;
  });

  const map = new Map<string, any>();
  const roots: any[] = [];

  cleanedDocs.forEach(doc => {
    map.set(doc.id, { ...doc, children: [] });
  });

  cleanedDocs.forEach(doc => {
    const node = map.get(doc.id);
    if (doc.parentId && map.has(doc.parentId)) {
      map.get(doc.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortTree = (nodes: any[]) => {
    nodes.sort((a, b) => a.order - b.order);
    nodes.forEach(node => sortTree(node.children));
  };
  sortTree(roots);
  return roots;
}

function generateDocId(): string {
  return Date.now().toString() + '-' + Math.random().toString(36).substring(2, 8);
}

export async function updateDocTranslations(
  targetLocale: string,
  translations: Array<{
    docId: string;
    title?: string;
    content?: string;
    seo_title?: string;
    seo_description?: string;
    seo_keywords?: string;
  }>,
  sourceLocale?: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const trans of translations) {
    const { docId, title, content, seo_title, seo_description, seo_keywords } = trans;

    try {
      const { libId, existed } = await ensureDocExistsInTarget(targetLocale, docId, sourceLocale);

      const targetDoc = await getDocument(targetLocale, libId, docId);
      if (!targetDoc) {
        throw new Error(`无法获取目标文档 ${docId}`);
      }

      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (seo_title !== undefined) updateData.seo_title = seo_title;
      if (seo_description !== undefined) updateData.seo_description = seo_description;
      if (seo_keywords !== undefined) updateData.seo_keywords = seo_keywords;

      let newContent = targetDoc.content;
      if (content !== undefined) newContent = content;

      const hasChanges = Object.keys(updateData).length > 0 || content !== undefined;
      if (!hasChanges) {
        success++;
        continue;
      }

      await saveDocument(
        targetLocale,
        libId,
        {
          id: docId,
          title: updateData.title ?? targetDoc.title,
          slug: targetDoc.slug,
          parentId: targetDoc.parentId,
          order: targetDoc.order,
          templateId: targetDoc.templateId,
          seo_title: updateData.seo_title ?? targetDoc.seo_title,
          seo_description: updateData.seo_description ?? targetDoc.seo_description,
          seo_keywords: updateData.seo_keywords ?? targetDoc.seo_keywords,
          file: targetDoc.file,
        },
        newContent
      );
      success++;
    } catch (err: any) {
      errors.push(`文档 ${docId}: ${err.message}`);
      failed++;
    }
  }

  return { success, failed, errors };
}

// ============================================================
// ✅ 新增：获取所有文档的 {locale, libSlug, docSlug}
// 用于 generateStaticParams 预生成
// ============================================================

let cachedAllDocParams: Array<{ locale: string; libSlug: string; docSlug: string }> | null = null;
let cachedAllDocParamsAt = 0;
const ALL_DOC_PARAMS_TTL = 5 * 60 * 1000;

export async function getAllDocParams(): Promise<Array<{ locale: string; libSlug: string; docSlug: string }>> {
  const now = Date.now();

  if (cachedAllDocParams && now - cachedAllDocParamsAt < ALL_DOC_PARAMS_TTL) {
    console.log(`[getAllDocParams] ✅ 命中缓存（${cachedAllDocParams.length} 条）`);
    return cachedAllDocParams;
  }

  console.log(`[getAllDocParams] ❌ 未命中，查库中...`);
  const start = Date.now();

  try {
    // 1. 查所有文档（只要 lib_id、locale、slug）
    const rows = await sql<{ locale: string; lib_id: string; slug: string }[]>`
      SELECT locale, lib_id, slug
      FROM public.documents
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND slug IS NOT NULL
        AND slug != ''
    `;

    // 2. 拿所有文档库，建立 libId → libSlug 映射
    const libs = await getDocsLibs();
    const libSlugMap = new Map<string, string>();
    for (const lib of libs) {
      if (lib.id && lib.slug) {
        libSlugMap.set(lib.id, lib.slug);
      }
    }

    // 3. 拼装结果（只保留能拿到 libSlug 的）
    const result: Array<{ locale: string; libSlug: string; docSlug: string }> = [];
    for (const r of rows) {
      const libSlug = libSlugMap.get(r.lib_id);
      if (!libSlug) continue;
      result.push({
        locale: r.locale,
        libSlug,
        docSlug: r.slug,
      });
    }

    const elapsed = Date.now() - start;
    console.log(`[getAllDocParams] ✅ 完成，${result.length} 条，耗时 ${elapsed}ms`);

    cachedAllDocParams = result;
    cachedAllDocParamsAt = now;
    return result;
  } catch (error: any) {
    console.error(`[getAllDocParams] 失败: ${error.message}`);
    return cachedAllDocParams ?? [];
  }
}

export function clearAllDocParamsCache(): void {
  cachedAllDocParams = null;
  cachedAllDocParamsAt = 0;
  console.log('[getAllDocParams] 缓存已清空');
}