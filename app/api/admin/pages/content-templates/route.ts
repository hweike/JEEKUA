// app/api/admin/pages/content-templates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin-client';

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
    const { data, error } = await supabaseAdmin
      .from('content_templates')
      .select('id, name, content, is_system, created_at, updated_at')
      .eq('site_id', SITE_ID)
      .eq('locale', locale)
      .order('is_system', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[content-templates GET] 查询失败:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      templates: data || [],
      count: data?.length || 0,
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

    const { data, error } = await supabaseAdmin
      .from('content_templates')
      .insert({
        id,
        site_id: SITE_ID,
        locale,
        name: name.trim(),
        content,
        is_system: false,
      })
      .select('id, name, content, is_system, created_at, updated_at')
      .single();

    if (error) {
      console.error('[content-templates POST] 插入失败:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ template: data }, { status: 201 });
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
    const { data: template, error: findError } = await supabaseAdmin
      .from('content_templates')
      .select('is_system')
      .eq('id', id)
      .maybeSingle();

    if (findError) {
      console.error('[content-templates DELETE] 查询失败:', findError);
      return NextResponse.json({ error: findError.message }, { status: 500 });
    }

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
    const { error: deleteError } = await supabaseAdmin
      .from('content_templates')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[content-templates DELETE] 删除失败:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[content-templates DELETE] 异常:', err?.message);
    return NextResponse.json(
      { error: err?.message || 'Internal error' },
      { status: 500 }
    );
  }
}