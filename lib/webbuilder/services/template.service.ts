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
  syncStatus?: 'idle' | 'processing' | 'done' | 'error';
  createdAt: string;
  updatedAt: string;
  targetLayoutId?: string;
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
    // ✅ draft 不存在时回退到 published
    if (version === 'draft') {
      for (const cat of ALL_CATEGORIES) {
        const key = getTemplateKey(cat, baseId, 'published');
        try {
          const content = await storage.read(key, 'utf8');
          return JSON.parse(content as string);
        } catch {
          continue;
        }
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
    targetLayoutId: existingTemplate?.targetLayoutId,
  };

  const storage = getPrivateStorage();
  const key = getTemplateKey(category, finalBaseId, 'draft');
  await storage.write(key, JSON.stringify(draftTemplate, null, 2), { contentType: 'application/json' });

  clearCache();
  return { id: draftTemplate.id, baseId: finalBaseId, version: 'draft' };
}

/**
 * 发布模板
 * 
 * 说明：
 * - 模板 JSON 写入私有对象存储
 * - 多语言文案已包含在 template_data 中，不需要 component_texts 表
 * - 异步同步到 site_pages 表
 */
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
    syncStatus: 'processing',
    createdAt: existingTemplate?.createdAt || now,
    updatedAt: now,
    targetLayoutId: existingTemplate?.targetLayoutId,
  };

  const storage = getPrivateStorage();
  const publishedKey = getTemplateKey(category, baseId, 'published');
  await storage.write(publishedKey, JSON.stringify(publishedTemplate, null, 2), { contentType: 'application/json' });

  // 删除草稿
  try {
    const draftKey = getTemplateKey(category, baseId, 'draft');
    await storage.delete(draftKey);
  } catch {}

  clearCache();

  // 异步同步到 site_pages（不再操作 component_texts）
  syncTemplateToPages(
    publishedTemplate.id,
    puckData,
    newHash,
    category,
    publishedTemplate.targetLayoutId
  )
    .then(result => {
      console.log(`[publish] 同步完成:`, result);
      return updateTemplateSyncStatus(
        publishedTemplate.id,
        result.failed === 0 ? 'done' : 'error'
      );
    })
    .catch(err => {
      console.error(`[publish] 同步模板 ${baseId} 到页面失败:`, err);
      return updateTemplateSyncStatus(publishedTemplate.id, 'error').catch(e => {
        console.error('更新同步状态失败:', e);
      });
    });

  return { id: publishedTemplate.id, baseId, version: 'published' };
}

/**
 * 删除模板
 * 
 * 说明：
 * - 删除对象存储中的 JSON 文件
 * - 不再需要删除 component_texts 记录
 */
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

  clearCache();
}