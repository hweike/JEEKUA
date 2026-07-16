// lib/webbuilder/services/template.service.ts
import { supabase } from '@/lib/supabase/client';
import { getPrivateStorage } from '@/lib/storage/factory';
import { createHash } from 'crypto';
import { syncTemplateToPages } from '@/lib/webbuilder/sync-templates';

export type TemplateCategory =
  | 'page'
  | 'product'
  | 'product_category'
  | 'product_line'
  | 'document'
  | 'document_library'
  | 'blog'
  | 'blog_post'
  | 'video_category'
  | 'video';

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  data: any;
  isSystem?: boolean;
  version?: 'draft' | 'published';
  hash?: string;
  syncStatus?: 'idle' | 'processing' | 'done' | 'error'; // 同步状态
  createdAt: string;
  updatedAt: string;
}

interface I18nRecord {
  textId: string;
  locale: string;
  text: string;
}

const STORAGE_BASE = 'webbuilder/templates';
const ALL_CATEGORIES: TemplateCategory[] = [
  'page', 'product', 'product_category', 'product_line',
  'document', 'document_library', 'blog', 'blog_post',
  'video_category', 'video',
];
const SITE_ID = '000001';

let templatesCache: Template[] | null = null;
let cacheExpireTime = 0;
const CACHE_TTL = 30 * 1000;

function clearCache() {
  templatesCache = null;
  cacheExpireTime = 0;
}

function generateBaseId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `template_${randomPart}`;
}

function getDefaultPuckData() {
  return {
    root: { props: { title: '新建页面' } },
    content: [],
    zones: {},
  };
}

function getTemplateKey(category: TemplateCategory, baseId: string, version: 'draft' | 'published'): string {
  return `${STORAGE_BASE}/${category}/${baseId}_${version}.json`;
}

async function listTemplateFiles(category: TemplateCategory): Promise<{ key: string; baseId: string; version: 'draft' | 'published' }[]> {
  const storage = getPrivateStorage();
  const prefix = `${STORAGE_BASE}/${category}/`;
  try {
    const keys = await storage.list(prefix);
    const result: { key: string; baseId: string; version: 'draft' | 'published' }[] = [];
    for (const key of keys) {
      const match = key.match(/\/([^/]+)_(draft|published)\.json$/);
      if (match) {
        result.push({ key, baseId: match[1], version: match[2] as 'draft' | 'published' });
      }
    }
    return result;
  } catch {
    return [];
  }
}

function extractI18nData(data: any): I18nRecord[] {
  const records: I18nRecord[] = [];
  if (!data || typeof data !== 'object') return records;

  if (Array.isArray(data)) {
    for (const item of data) {
      records.push(...extractI18nData(item));
    }
    return records;
  }

  if (data.textId && typeof data.textId === 'string') {
    for (const [key, value] of Object.entries(data)) {
      if (key !== 'textId' && typeof value === 'string') {
        records.push({ textId: data.textId, locale: key, text: value });
      }
    }
  }

  for (const key in data) {
    if (data[key] && typeof data[key] === 'object') {
      records.push(...extractI18nData(data[key]));
    }
  }
  return records;
}

async function upsertI18nRecords(templateId: string, data: any): Promise<void> {
  try {
    const { error: deleteError } = await supabase
      .from('component_texts')
      .delete()
      .eq('site_id', SITE_ID)
      .eq('template_id', templateId);
    if (deleteError) {
      console.error('Failed to delete old i18n records:', deleteError);
      throw deleteError;
    }

    const records = extractI18nData(data);
    if (records.length > 0) {
      const now = new Date().toISOString();
      const insertData = records.map(rec => ({
        site_id: SITE_ID,
        template_id: templateId,
        text_id: rec.textId,
        locale: rec.locale,
        text: rec.text,
        created_at: now,
        updated_at: now,
      }));
      const { error: insertError } = await supabase
        .from('component_texts')
        .insert(insertData);
      if (insertError) {
        console.error('Failed to insert i18n records:', insertError);
        throw insertError;
      }
    }
  } catch (err) {
    console.error('Failed to update i18n data:', err);
  }
}

// ========== 导出服务函数 ==========

export async function getAllTemplates(category?: TemplateCategory | null): Promise<Template[]> {
  if (templatesCache && Date.now() < cacheExpireTime) {
    if (category) {
      return templatesCache.filter(t => t.category === category);
    }
    return templatesCache;
  }

  const categories = category ? [category] : ALL_CATEGORIES;
  const baseMap = new Map<string, Template>();

  const filesArrays = await Promise.all(categories.map(listTemplateFiles));
  const allFiles = filesArrays.flat();

  const readPromises = allFiles.map(async (file) => {
    const storage = getPrivateStorage();
    try {
      const content = await storage.read(file.key, 'utf8');
      const template: Template = JSON.parse(content as string);
      return { template, baseId: file.baseId, version: file.version };
    } catch {
      return null;
    }
  });

  const results = await Promise.all(readPromises);
  for (const res of results) {
    if (!res) continue;
    const { template, baseId, version } = res;
    const existing = baseMap.get(baseId);
    if (!existing || version === 'draft' || new Date(template.updatedAt) > new Date(existing.updatedAt)) {
      baseMap.set(baseId, template);
    }
  }

  const result = Array.from(baseMap.values());
  result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  if (!category) {
    templatesCache = result;
    cacheExpireTime = Date.now() + CACHE_TTL;
  }
  return result;
}

export async function getTemplateById(id: string): Promise<Template | null> {
  let baseId: string;
  let version: 'draft' | 'published' | null = null;
  if (id.endsWith('_draft')) {
    baseId = id.slice(0, -6);
    version = 'draft';
  } else if (id.endsWith('_published')) {
    baseId = id.slice(0, -10);
    version = 'published';
  } else {
    baseId = id;
  }

  const storage = getPrivateStorage();
  if (version) {
    for (const cat of ALL_CATEGORIES) {
      const key = getTemplateKey(cat, baseId, version);
      try {
        const content = await storage.read(key, 'utf8');
        return JSON.parse(content as string);
      } catch {
        continue;
      }
    }
    return null;
  }

  for (const cat of ALL_CATEGORIES) {
    const draftKey = getTemplateKey(cat, baseId, 'draft');
    try {
      const content = await storage.read(draftKey, 'utf8');
      return JSON.parse(content as string);
    } catch {
      const pubKey = getTemplateKey(cat, baseId, 'published');
      try {
        const content = await storage.read(pubKey, 'utf8');
        return JSON.parse(content as string);
      } catch {
        continue;
      }
    }
  }
  return null;
}

export async function updateTemplateSyncStatus(id: string, status: 'idle' | 'processing' | 'done' | 'error'): Promise<void> {
  const template = await getTemplateById(id);
  if (!template) {
    console.warn(`[updateTemplateSyncStatus] 模板 ${id} 不存在，跳过`);
    return;
  }
  template.syncStatus = status;
  const storage = getPrivateStorage();
  const baseId = id.replace(/_(draft|published)$/, '');
  const category = template.category;
  const version = template.version || 'published';
  const key = getTemplateKey(category, baseId, version);
  await storage.write(key, JSON.stringify(template, null, 2), { contentType: 'application/json' });
  clearCache();
}

export async function saveDraft(
  baseId: string | undefined,
  name: string,
  category: TemplateCategory,
  data: any,
  existingTemplate?: Template | null
): Promise<{ id: string; baseId: string; version: 'draft' }> {
  const now = new Date().toISOString();
  const finalBaseId = baseId || generateBaseId();
  const templateData = data && Object.keys(data).length > 0 ? data : getDefaultPuckData();

  const draftTemplate: Template = {
    id: `${finalBaseId}_draft`,
    name,
    category,
    data: templateData,
    isSystem: existingTemplate?.isSystem || false,
    version: 'draft',
    syncStatus: existingTemplate?.syncStatus || 'idle',
    createdAt: existingTemplate?.createdAt || now,
    updatedAt: now,
  };

  const storage = getPrivateStorage();
  const key = getTemplateKey(category, finalBaseId, 'draft');
  await storage.write(key, JSON.stringify(draftTemplate, null, 2), { contentType: 'application/json' });

  clearCache();
  return { id: draftTemplate.id, baseId: finalBaseId, version: 'draft' };
}

export async function publishTemplate(
  baseId: string,
  name: string,
  category: TemplateCategory,
  data: any,
  existingTemplate?: Template | null
): Promise<{ id: string; baseId: string; version: 'published' }> {
  const now = new Date().toISOString();
  const puckData = data && Object.keys(data).length > 0 ? data : getDefaultPuckData();
  const newHash = createHash('sha256').update(JSON.stringify(puckData)).digest('hex');

  const publishedTemplate: Template = {
    id: `${baseId}_published`,
    name,
    category,
    data: puckData,
    isSystem: existingTemplate?.isSystem || false,
    version: 'published',
    hash: newHash,
    syncStatus: 'processing', // ✅ 发布时立即标记为同步中
    createdAt: existingTemplate?.createdAt || now,
    updatedAt: now,
  };

  const storage = getPrivateStorage();
  const publishedKey = getTemplateKey(category, baseId, 'published');
  await storage.write(publishedKey, JSON.stringify(publishedTemplate, null, 2), { contentType: 'application/json' });

  // 删除草稿
  try {
    const draftKey = getTemplateKey(category, baseId, 'draft');
    await storage.delete(draftKey);
  } catch {}

  // 更新多语言数据
  await upsertI18nRecords(publishedTemplate.id, puckData);

  clearCache();

  // ✅ 异步执行同步（不阻塞响应），不再传递 taskId
  syncTemplateToPages(publishedTemplate.id, puckData, newHash).catch(err => {
    console.error(`[publish] 同步模板 ${baseId} 到页面失败:`, err);
    // 同步失败时更新模板状态为 error
    updateTemplateSyncStatus(publishedTemplate.id, 'error').catch(e => {
      console.error('更新同步状态失败:', e);
    });
  });

  return { id: publishedTemplate.id, baseId, version: 'published' };
}

export async function deleteTemplate(baseId: string): Promise<void> {
  const template = await getTemplateById(baseId);
  if (template?.isSystem) {
    throw new Error('系统模板不能删除');
  }

  const storage = getPrivateStorage();
  let deleted = false;
  for (const cat of ALL_CATEGORIES) {
    const prefix = `${STORAGE_BASE}/${cat}/`;
    const keys = await storage.list(prefix);
    for (const key of keys) {
      if (key.includes(`/${baseId}_draft.json`) || key.includes(`/${baseId}_published.json`)) {
        try {
          await storage.delete(key);
          deleted = true;
        } catch (err) {
          console.error(`删除模板文件失败: ${key}`, err);
        }
      }
    }
  }

  if (!deleted) {
    throw new Error('模板不存在');
  }

  try {
    const templateIds = [`${baseId}_published`, `${baseId}_draft`];
    const { error } = await supabase
      .from('component_texts')
      .delete()
      .eq('site_id', SITE_ID)
      .in('template_id', templateIds);
    if (error) {
      console.warn('Failed to delete i18n records:', error);
    }
  } catch (err) {
    console.warn('Failed to delete i18n records:', err);
  }

  clearCache();
}