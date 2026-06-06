// app/api/webbuilder/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { getPrivateStorage } from '@/lib/storage/factory';

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
  createdAt: string;
  updatedAt: string;
}

interface I18nRecord {
  textId: string;
  locale: string;
  text: string;
}

// 私有桶中模板存储的基础前缀（无 data/ 前缀）
const STORAGE_BASE = 'webbuilder/templates';

// 简单内存缓存
let templatesCache: Template[] | null = null;
let cacheExpireTime = 0;
const CACHE_TTL = 30 * 1000; // 30秒

function clearTemplatesCache() {
  templatesCache = null;
  cacheExpireTime = 0;
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

// 云存储无需创建目录，保留空实现以兼容
async function ensureDir(_dir: string): Promise<void> {}

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

const ALL_CATEGORIES: TemplateCategory[] = [
  'page',
  'product',
  'product_category',
  'product_line',
  'document',
  'document_library',
  'blog',
  'blog_post',
  'video_category',
  'video',
];

// 获取模板的存储 Key（无版本后缀时用于查找，实际存储时带版本）
function getTemplateKey(category: TemplateCategory, baseId: string, version: 'draft' | 'published'): string {
  return `${STORAGE_BASE}/${category}/${baseId}_${version}.json`;
}

// 获取某个分类下所有模板文件（包括 draft 和 published）
async function listTemplateFiles(category: TemplateCategory): Promise<{ key: string; baseId: string; version: 'draft' | 'published' }[]> {
  const storage = getPrivateStorage();
  const prefix = `${STORAGE_BASE}/${category}/`;
  try {
    const keys = await storage.list(prefix);
    const result: { key: string; baseId: string; version: 'draft' | 'published' }[] = [];
    for (const key of keys) {
      const match = key.match(/\/([^/]+)_(draft|published)\.json$/);
      if (match) {
        const baseId = match[1];
        const version = match[2] as 'draft' | 'published';
        result.push({ key, baseId, version });
      }
    }
    return result;
  } catch {
    return [];
  }
}

export async function getAllTemplates(category?: TemplateCategory | null): Promise<Template[]> {
  // 检查缓存
  if (templatesCache && Date.now() < cacheExpireTime) {
    // 如果有分类筛选，需要过滤（注意缓存的是全量，但为了简单，不清除分类缓存，直接过滤）
    if (category) {
      return templatesCache.filter(t => t.category === category);
    }
    return templatesCache;
  }

  const categories = category ? [category] : ALL_CATEGORIES;
  const baseMap = new Map<string, Template>();

  // 并发获取所有分类的文件列表
  const filesListPromises = categories.map(cat => listTemplateFiles(cat));
  const filesArrays = await Promise.all(filesListPromises);
  const allFiles = filesArrays.flat();

  // 并发读取所有文件内容
  const readPromises = allFiles.map(async (file) => {
    const storage = getPrivateStorage();
    try {
      const content = await storage.read(file.key, 'utf8');
      const template: Template = JSON.parse(content as string);
      return { template, baseId: file.baseId, version: file.version };
    } catch (err) {
      console.error(`读取模板文件失败: ${file.key}`, err);
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

  // 存入缓存（全量）
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
        // continue
      }
    }
    return null;
  }

  // 未指定版本，优先返回草稿
  for (const cat of ALL_CATEGORIES) {
    const draftKey = getTemplateKey(cat, baseId, 'draft');
    try {
      const draftContent = await storage.read(draftKey, 'utf8');
      return JSON.parse(draftContent as string);
    } catch {
      const pubKey = getTemplateKey(cat, baseId, 'published');
      try {
        const pubContent = await storage.read(pubKey, 'utf8');
        return JSON.parse(pubContent as string);
      } catch {
        continue;
      }
    }
  }
  return null;
}

export async function deleteTemplate(baseId: string): Promise<boolean> {
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
  return deleted;
}

// ==================== API 路由 ====================
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const category = searchParams.get('category') as TemplateCategory | null;

  try {
    if (id) {
      const template = await getTemplateById(id);
      return template
        ? NextResponse.json(template)
        : NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    const templates = await getAllTemplates(category);
    return NextResponse.json(templates);
  } catch (error) {
    console.error('GET /api/webbuilder error:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, category, data, action } = body;

    const templateTitle = title || body.name;
    if (!templateTitle || !category) {
      return NextResponse.json(
        { success: false, error: '模板名称和分类不能为空' },
        { status: 400 }
      );
    }

    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { success: false, error: '无效的页面数据' },
        { status: 400 }
      );
    }

    let baseId: string;
    let existingTemplate: Template | null = null;
    if (id) {
      existingTemplate = await getTemplateById(id);
      if (!existingTemplate) {
        return NextResponse.json(
          { success: false, error: '模板不存在' },
          { status: 404 }
        );
      }
      baseId = id.replace(/_(draft|published)$/, '');
      if (existingTemplate.isSystem && templateTitle !== existingTemplate.name) {
        return NextResponse.json(
          { success: false, error: '系统模板不能改名' },
          { status: 403 }
        );
      }
    } else {
      baseId = generateBaseId();
    }

    const storage = getPrivateStorage();
    const now = new Date().toISOString();
    const puckData = Object.keys(data).length > 0 ? data : getDefaultPuckData();

    if (action === 'publish') {
      const publishedTemplate: Template = {
        id: `${baseId}_published`,
        name: templateTitle,
        category,
        data: puckData,
        isSystem: existingTemplate?.isSystem || false,
        version: 'published',
        createdAt: existingTemplate?.createdAt || now,
        updatedAt: now,
      };
      const publishedKey = getTemplateKey(category, baseId, 'published');
      await storage.write(publishedKey, JSON.stringify(publishedTemplate, null, 2), { contentType: 'application/json' });

      // 删除草稿
      const draftKey = getTemplateKey(category, baseId, 'draft');
      try {
        await storage.delete(draftKey);
      } catch {}

      // 多语言数据全量替换（Supabase）
      try {
        const siteId = '000001';
        const templateId = publishedTemplate.id;

        // 删除旧记录
        const { error: deleteError } = await supabase
          .from('component_texts')
          .delete()
          .eq('site_id', siteId)
          .eq('template_id', templateId);
        if (deleteError) {
          console.error('Failed to delete old i18n records:', deleteError);
          throw deleteError;
        }
        console.log(`[i18n] Deleted old records for template ${templateId}`);

        const i18nRecords = extractI18nData(publishedTemplate.data);
        if (i18nRecords.length > 0) {
          const nowDate = new Date().toISOString();
          const insertData = i18nRecords.map(rec => ({
            site_id: siteId,
            template_id: templateId,
            text_id: rec.textId,
            locale: rec.locale,
            text: rec.text,
            created_at: nowDate,
            updated_at: nowDate,
          }));
          const { error: insertError } = await supabase
            .from('component_texts')
            .insert(insertData);
          if (insertError) {
            console.error('Failed to insert i18n records:', insertError);
            throw insertError;
          }
          console.log(`[i18n] Inserted ${i18nRecords.length} records for template ${templateId}`);
        } else {
          console.warn('[i18n] No i18n records extracted, template may have no multilingual fields');
        }
      } catch (err) {
        console.error('Failed to update i18n data during publish:', err);
        // 不中断发布流程
      }

      clearTemplatesCache(); // 清除缓存
      return NextResponse.json({
        success: true,
        id: `${baseId}_published`,
        baseId,
        version: 'published',
      });
    } else if (action === 'save') {
      const draftTemplate: Template = {
        id: `${baseId}_draft`,
        name: templateTitle,
        category,
        data: puckData,
        isSystem: existingTemplate?.isSystem || false,
        version: 'draft',
        createdAt: existingTemplate?.createdAt || now,
        updatedAt: now,
      };
      const draftKey = getTemplateKey(category, baseId, 'draft');
      await storage.write(draftKey, JSON.stringify(draftTemplate, null, 2), { contentType: 'application/json' });

      clearTemplatesCache(); // 清除缓存
      return NextResponse.json({
        success: true,
        id: `${baseId}_draft`,
        baseId,
        version: 'draft',
      });
    } else {
      // 新建模板（草稿）
      const newId = generateBaseId();
      const newTemplate: Template = {
        id: `${newId}_draft`,
        name: templateTitle,
        category,
        data: puckData,
        isSystem: false,
        version: 'draft',
        createdAt: now,
        updatedAt: now,
      };
      const newKey = getTemplateKey(category, newId, 'draft');
      await storage.write(newKey, JSON.stringify(newTemplate, null, 2), { contentType: 'application/json' });

      clearTemplatesCache(); // 清除缓存
      return NextResponse.json({
        success: true,
        id: `${newId}_draft`,
        baseId: newId,
        version: 'draft',
      }, { status: 201 });
    }
  } catch (error) {
    console.error('POST /api/webbuilder error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing template ID' }, { status: 400 });
  }

  try {
    const baseId = id.replace(/_(draft|published)$/, '');

    let templateData: Template | null = null;
    for (const cat of ALL_CATEGORIES) {
      const draftKey = getTemplateKey(cat, baseId, 'draft');
      const pubKey = getTemplateKey(cat, baseId, 'published');
      const storage = getPrivateStorage();
      try {
        const content = await storage.read(draftKey, 'utf8');
        templateData = JSON.parse(content as string);
        break;
      } catch {
        try {
          const content = await storage.read(pubKey, 'utf8');
          templateData = JSON.parse(content as string);
          break;
        } catch {
          continue;
        }
      }
    }

    if (!templateData) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (templateData.isSystem) {
      return NextResponse.json({ error: '系统模板不能删除' }, { status: 403 });
    }

    const success = await deleteTemplate(baseId);
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }

    // 删除数据库中的多语言记录
    try {
      const siteId = '000001';
      const templateIds = [`${baseId}_published`, `${baseId}_draft`];
      const { error } = await supabase
        .from('component_texts')
        .delete()
        .eq('site_id', siteId)
        .in('template_id', templateIds);
      if (error) {
        console.warn('Failed to delete i18n records for template:', error);
      }
    } catch (err) {
      console.warn('Failed to delete i18n records for template:', err);
    }

    clearTemplatesCache(); // 清除缓存
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/webbuilder error:', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}