import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { supabase } from '@/lib/supabase/client';

const TEMPLATES_DIR = path.join(process.cwd(), 'data/webbuilder/templates');

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

async function ensureDir(dir: string) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
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

export async function getAllTemplates(category?: TemplateCategory | null): Promise<Template[]> {
  await ensureDir(TEMPLATES_DIR);
  const categories = category ? [category] : ALL_CATEGORIES;
  const baseMap = new Map<string, Template>();

  for (const cat of categories) {
    const catDir = path.join(TEMPLATES_DIR, cat);
    try {
      const files = await fs.readdir(catDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const content = await fs.readFile(path.join(catDir, file), 'utf-8');
        const template: Template = JSON.parse(content);
        const baseId = file.replace(/_(draft|published)\.json$/, '');
        const existing = baseMap.get(baseId);
        if (!existing || template.version === 'draft' || new Date(template.updatedAt) > new Date(existing.updatedAt)) {
          baseMap.set(baseId, template);
        }
      }
    } catch {
      // 目录不存在则跳过
    }
  }

  const result = Array.from(baseMap.values());
  result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return result;
}

export async function getTemplateById(id: string): Promise<Template | null> {
  await ensureDir(TEMPLATES_DIR);

  if (id.endsWith('_draft') || id.endsWith('_published')) {
    for (const cat of ALL_CATEGORIES) {
      const filePath = path.join(TEMPLATES_DIR, cat, `${id}.json`);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
      } catch {
        continue;
      }
    }
    return null;
  }

  for (const cat of ALL_CATEGORIES) {
    const catDir = path.join(TEMPLATES_DIR, cat);
    try {
      const draftPath = path.join(catDir, `${id}_draft.json`);
      const draftContent = await fs.readFile(draftPath, 'utf-8');
      return JSON.parse(draftContent);
    } catch {
      try {
        const publishedPath = path.join(catDir, `${id}_published.json`);
        const publishedContent = await fs.readFile(publishedPath, 'utf-8');
        return JSON.parse(publishedContent);
      } catch {
        continue;
      }
    }
  }
  return null;
}

export async function deleteTemplate(baseId: string): Promise<boolean> {
  await ensureDir(TEMPLATES_DIR);
  let deleted = false;
  for (const cat of ALL_CATEGORIES) {
    const catDir = path.join(TEMPLATES_DIR, cat);
    try {
      const files = await fs.readdir(catDir);
      for (const file of files) {
        if (file.startsWith(baseId) && file.endsWith('.json')) {
          await fs.unlink(path.join(catDir, file));
          deleted = true;
        }
      }
    } catch {
      // 目录不存在
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

    await ensureDir(TEMPLATES_DIR);

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

    const catDir = path.join(TEMPLATES_DIR, category);
    await ensureDir(catDir);
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
      const publishedPath = path.join(catDir, `${baseId}_published.json`);
      await fs.writeFile(publishedPath, JSON.stringify(publishedTemplate, null, 2));

      // 删除草稿
      const draftPath = path.join(catDir, `${baseId}_draft.json`);
      try {
        await fs.unlink(draftPath);
      } catch {}

      // ========== 多语言数据全量替换（Supabase） ==========
      try {
        const siteId = '100001';
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
      const draftPath = path.join(catDir, `${baseId}_draft.json`);
      await fs.writeFile(draftPath, JSON.stringify(draftTemplate, null, 2));

      // 保存草稿时不操作数据库
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
      const filePath = path.join(catDir, `${newId}_draft.json`);
      await fs.writeFile(filePath, JSON.stringify(newTemplate, null, 2));

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
      const catDir = path.join(TEMPLATES_DIR, cat);
      try {
        const draftPath = path.join(catDir, `${baseId}_draft.json`);
        const content = await fs.readFile(draftPath, 'utf-8');
        templateData = JSON.parse(content);
        break;
      } catch {
        try {
          const publishedPath = path.join(catDir, `${baseId}_published.json`);
          const content = await fs.readFile(publishedPath, 'utf-8');
          templateData = JSON.parse(content);
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
      const siteId = '100001';
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/webbuilder error:', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}