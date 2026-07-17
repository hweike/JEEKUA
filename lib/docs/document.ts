import { supabase } from '@/lib/supabase/client';
import { getPrivateStorage } from '@/lib/storage/factory';
import type { Doc } from './types';
import { registerEntity } from '@/lib/discovery/services/business-register-pages.service';
import { deletePage } from '@/lib/discovery/register';
import { getDocsLib } from './docs-lib';

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
  const { data: siblings } = await supabase
    .from('documents')
    .select('order_index')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('lib_id', libId)
    .eq('locale', locale)
    .eq('parent_id', parentId ?? null)
    .order('order_index', { ascending: false })
    .limit(1);
  return (siblings && siblings.length > 0) ? siblings[0].order_index + 1 : 0;
}

/**
 * 注册文档到 pages 表（异步，不阻塞主流程）
 */
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

/**
 * 确保目标语言存在该文档，若不存在则从源复制
 * 返回 { libId, existed } 其中 existed 表示是否原本已存在
 */
async function ensureDocExistsInTarget(
  targetLocale: string,
  docId: string,
  sourceLocale?: string
): Promise<{ libId: string; existed: boolean }> {
  const { data: targetData, error: targetError } = await supabase
    .from('documents')
    .select('lib_id')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('id', docId)
    .eq('locale', targetLocale)
    .maybeSingle();

  if (targetData) {
    return { libId: targetData.lib_id, existed: true };
  }

  if (!sourceLocale) {
    throw new Error(`文档 ${docId} 在目标语言中不存在且未提供源语言`);
  }

  const { data: sourceData, error: sourceError } = await supabase
    .from('documents')
    .select('lib_id')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('id', docId)
    .eq('locale', sourceLocale)
    .maybeSingle();

  if (sourceError || !sourceData) {
    throw new Error(`无法从源语言获取文档 ${docId} 的信息: ${sourceError?.message || '不存在'}`);
  }

  const libId = sourceData.lib_id;
  await copyDocument(sourceLocale, targetLocale, libId, docId);
  return { libId, existed: false };
}

// ============================================================
// 公开导出函数
// ============================================================

export async function getDocsByLib(locale: string, libId: string): Promise<Doc[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('lib_id', libId)
    .eq('locale', locale)
    .order('order_index', { ascending: true });

  if (error) {
    console.error('获取文档列表失败:', error);
    return [];
  }
  return data.map(mapRowToDoc);
}

export async function getDocument(locale: string, libId: string, docId: string) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('lib_id', libId)
    .eq('id', docId)
    .eq('locale', locale)
    .maybeSingle();

  if (error || !data) return null;

  const doc = mapRowToDoc(data);
  const content = await readMarkdown(locale, libId, doc.file);
  return { ...doc, content };
}

/**
 * 根据文档库 ID 和文档 slug 获取完整文档（含内容）
 */
export async function getDocBySlug(locale: string, libId: string, slug: string) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('lib_id', libId)
    .eq('locale', locale)
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) return null;
  const doc = mapRowToDoc(data);
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

  const { data: existing } = await supabase
    .from('documents')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('id', docId)
    .eq('locale', locale)
    .maybeSingle();

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
    const { error } = await supabase
      .from('documents')
      .insert({
        site_id: DEFAULT_SITE_ID,
        ...docPayload,
        created_at: now,
      });
    if (error) throw new Error('插入文档失败: ' + error.message);
    createdAt = now;
  } else {
    const { error } = await supabase
      .from('documents')
      .update({
        ...docPayload,
        created_at: existing.created_at,
      })
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('id', docId)
      .eq('locale', locale);
    if (error) throw new Error('更新文档失败: ' + error.message);
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

/**
 * 删除文档（仅删除当前文档，子文档保留并提升为顶级文档）
 */
export async function deleteDocument(locale: string, libId: string, docId: string): Promise<void> {
  // 1. 查找当前文档的直接子文档（parent_id == docId）
  const { data: children, error: childError } = await supabase
    .from('documents')
    .select('id')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('lib_id', libId)
    .eq('locale', locale)
    .eq('parent_id', docId);

  if (childError) {
    throw new Error('查询子文档失败: ' + childError.message);
  }

  // 2. 更新所有子文档的 parent_id 为 null（提升为顶级）
  if (children && children.length > 0) {
    const childIds = children.map(c => c.id);
    const { error: updateError } = await supabase
      .from('documents')
      .update({ parent_id: null })
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('lib_id', libId)
      .eq('locale', locale)
      .in('id', childIds);
    if (updateError) {
      throw new Error('更新子文档父级失败: ' + updateError.message);
    }
  }

  // 3. 删除当前文档的 Markdown 文件
  const { data: docFile } = await supabase
    .from('documents')
    .select('file')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('lib_id', libId)
    .eq('locale', locale)
    .eq('id', docId)
    .maybeSingle();

  if (docFile) {
    const key = `docs/${locale}/${libId}/${docFile.file}`;
    try {
      const storage = getPrivateStorage();
      await storage.delete(key);
    } catch {}
  }

  // 4. 删除当前文档的数据库记录
  const { error: deleteError } = await supabase
    .from('documents')
    .delete()
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('lib_id', libId)
    .eq('locale', locale)
    .eq('id', docId);

  if (deleteError) {
    throw new Error('删除文档失败: ' + deleteError.message);
  }

   // 5. 删除当前文档的 pages 记录（使用统一的 deletePage 函数）
  const pageId = `doc:${docId}`;
  try {
    await deletePage(pageId, locale);
  } catch (err) {
    console.error(`删除文档 pages 失败 (${pageId}):`, err);
  }
}

/**
 * 批量更新排序（单语言）- 增加重试机制
 */
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
        const { error } = await supabase
          .from('documents')
          .update({
            parent_id: item.parentId,
            order_index: item.order,
            updated_at: new Date().toISOString(),
          })
          .eq('site_id', DEFAULT_SITE_ID)
          .eq('id', item.id)
          .eq('locale', locale);
        if (error) throw error;
        break; // 成功则退出重试循环
      } catch (err) {
        attempt++;
        if (attempt > retries) {
          throw new Error(`更新排序失败 (locale: ${locale}, id: ${item.id}): ${err.message}`);
        }
        // 指数退避等待
        await new Promise(r => setTimeout(r, 100 * Math.pow(2, attempt - 1)));
      }
    }
  }
}


/**
 * 跨语言同步排序（所有语言）- 限制并发数
 */
export async function syncDocOrdersAllLocales(
  libId: string,
  items: Array<{ id: string; parentId: string | null; order: number }>
): Promise<void> {
  // 获取该文档库的所有语言
  const { data: localesData } = await supabase
    .from('documents')
    .select('locale')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('lib_id', libId);
  const locales = [...new Set(localesData?.map(row => row.locale) || [])];
  if (locales.length === 0) return;

  // 限制并发数：每次最多处理 2 个语言
  const concurrency = 2;
  const errors: string[] = [];

  for (let i = 0; i < locales.length; i += concurrency) {
    const batch = locales.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (locale) => {
        try {
          await updateDocOrders(locale, libId, items);
        } catch (err) {
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

/**
 * 获取文档树（层级结构，含子文档）
 * 自动修复悬空父ID：若父文档不存在，则置为 null
 */
export async function getDocTree(locale: string, libId: string): Promise<any[]> {
  const docs = await getDocsByLib(locale, libId);
  if (!docs || docs.length === 0) {
    return [];
  }

  // 收集所有文档ID，用于验证父ID是否存在
  const allIds = new Set(docs.map(d => d.id));

  // 修复悬空父ID：将指向不存在文档的 parentId 置为 null
  const cleanedDocs = docs.map(doc => {
    if (doc.parentId && !allIds.has(doc.parentId)) {
      console.warn(`[getDocTree] 孤儿文档: ${doc.id} 的 parentId ${doc.parentId} 不存在，已提升为一级文档`);
      return { ...doc, parentId: null };
    }
    return doc;
  });

  // 构建树形结构
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

  // 递归排序
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