// app/api/admin/pages/content-templates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/admin';

const SITE_ID = '000001';

// ============================================================
// GET：列出模板
// ============================================================
export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale');

  if (!locale) {
    return NextResponse.json({ error: 'Missing locale' }, { status: 400 });
  }

  try {
    const data = await sql<any[]>`
      SELECT id, name, content, is_system, created_at, updated_at
      FROM public.content_templates
      WHERE site_id = ${SITE_ID}
        AND locale = ${locale}
      ORDER BY is_system DESC, created_at DESC
    `;

    return NextResponse.json({
      templates: data,
      count: data.length,
      locale,
    });
  } catch (err: any) {
    console.error('[content-templates GET] 异常:', err?.message);
    return NextResponse.json(
      { error: err?.message || 'Internal error' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST：创建用户模板
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { locale, name, content } = body;

    if (!locale) {
      return NextResponse.json({ error: 'Missing locale' }, { status: 400 });
    }
    if (!name || !name.trim()) {
      return NextResponse.json({ error: '名称不能为空' }, { status: 400 });
    }
    if (!content || !content.trim()) {
      return NextResponse.json({ error: '内容不能为空' }, { status: 400 });
    }

    const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const rows = await sql<any[]>`
      INSERT INTO public.content_templates (id, site_id, locale, name, content, is_system)
      VALUES (${id}, ${SITE_ID}, ${locale}, ${name.trim()}, ${content}, false)
      RETURNING id, name, content, is_system, created_at, updated_at
    `;

    if (!rows[0]) {
      return NextResponse.json({ error: '插入失败' }, { status: 500 });
    }

    return NextResponse.json({ template: rows[0] }, { status: 201 });
  } catch (err: any) {
    console.error('[content-templates POST] 异常:', err?.message);
    return NextResponse.json(
      { error: err?.message || 'Internal error' },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE：删除用户模板（系统模板不可删）
// ============================================================
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  try {
    // 先检查是否为系统模板
    const rows = await sql<{ is_system: boolean }[]>`
      SELECT is_system FROM public.content_templates
      WHERE id = ${id}
      LIMIT 1
    `;
    const template = rows[0];

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // 系统模板不可删除
    if (template.is_system) {
      return NextResponse.json(
        { error: '系统模板不可删除' },
        { status: 403 }
      );
    }

    // 删除用户模板
    await sql`
      DELETE FROM public.content_templates
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[content-templates DELETE] 异常:', err?.message);
    return NextResponse.json(
      { error: err?.message || 'Internal error' },
      { status: 500 }
    );
  }
}