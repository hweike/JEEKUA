// app/api/webbuilder/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getAllTemplates,
  getTemplateById,
  saveDraft,
  publishTemplate,
  deleteTemplate,
} from '@/lib/webbuilder/services/template.service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const category = searchParams.get('category') as any;

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

    const name = title || body.name;
    if (!name || !category) {
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

    let existingTemplate = null;
    let baseId = id;
    if (id) {
      existingTemplate = await getTemplateById(id);
      if (!existingTemplate) {
        return NextResponse.json(
          { success: false, error: '模板不存在' },
          { status: 404 }
        );
      }
      baseId = id.replace(/_(draft|published)$/, '');
      if (existingTemplate.isSystem && name !== existingTemplate.name) {
        return NextResponse.json(
          { success: false, error: '系统模板不能改名' },
          { status: 403 }
        );
      }
    }

    if (action === 'publish') {
      const result = await publishTemplate(baseId, name, category, data, existingTemplate);
      return NextResponse.json({ success: true, ...result });
    } else if (action === 'save') {
      const result = await saveDraft(baseId, name, category, data, existingTemplate);
      return NextResponse.json({ success: true, ...result });
    } else {
      const result = await saveDraft(undefined, name, category, data, null);
      return NextResponse.json({ success: true, ...result }, { status: 201 });
    }
  } catch (error: any) {
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
    await deleteTemplate(baseId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/webbuilder error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete template' },
      { status: error.message.includes('系统模板') ? 403 : 500 }
    );
  }
}