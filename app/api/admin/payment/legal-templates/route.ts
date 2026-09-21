// app/api/admin/payment/legal-templates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { legalTemplateService } from '@/lib/payment/services/legal-templates.service';
import { getSiteId } from '@/lib/utils/request';

// ==================== GET ====================
export async function GET(request: NextRequest) {
  try {
    const siteId = await getSiteId(request);
    const data = await legalTemplateService.list(siteId);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('GET /admin/payment/legal-templates error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取模板列表失败' },
      { status: 500 }
    );
  }
}

// ==================== POST ====================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const siteId = await getSiteId(request);
    
    const { name, content, description, is_default, sort_order, created_by } = body;

    if (!name || !content) {
      return NextResponse.json(
        { success: false, error: '模板名称和内容不能为空' },
        { status: 400 }
      );
    }

    const data = await legalTemplateService.create({
      name,
      content,
      description,
      is_default,
      sort_order,
      created_by,
    }, siteId);

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: any) {
    console.error('POST /admin/payment/legal-templates error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '创建模板失败' },
      { status: 500 }
    );
  }
}

// ==================== PUT ====================
export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: '模板ID不能为空' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const siteId = await getSiteId(request);

    const { name, content, description, is_default, sort_order } = body;

    const data = await legalTemplateService.update(id, {
      name,
      content,
      description,
      is_default,
      sort_order,
    }, siteId);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('PUT /admin/payment/legal-templates error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '更新模板失败' },
      { status: 500 }
    );
  }
}

// ==================== DELETE ====================
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: '模板ID不能为空' },
        { status: 400 }
      );
    }

    const siteId = await getSiteId(request);
    await legalTemplateService.delete(id, siteId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /admin/payment/legal-templates error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '删除模板失败' },
      { status: 500 }
    );
  }
}