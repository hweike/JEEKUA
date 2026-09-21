// app/api/admin/files/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

// ========== GET: 获取单个文件详情 ==========
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('media_files')
      .select('*')
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      console.error('获取文件详情失败:', error);
      return NextResponse.json({ error: '获取文件详情失败' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/admin/files/[id] error:', error);
    return NextResponse.json({ error: '获取文件详情失败' }, { status: 500 });
  }
}

// ========== PATCH: 更新文件信息 ==========
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { displayName, altText, categoryId } = body;

    // ✅ 检查文件是否存在（使用 site_id）
    const { data: existing, error: findError } = await supabase
      .from('media_files')
      .select('id')
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (findError || !existing) {
      console.error('文件不存在:', findError);
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    // 构建更新对象
    const updates: any = {};
    let hasUpdate = false;

    if (displayName !== undefined) {
      updates.display_name = displayName;
      hasUpdate = true;
    }
    if (altText !== undefined) {
      updates.alt_text = altText;
      hasUpdate = true;
    }
    if (categoryId !== undefined) {
      // ✅ 如果 categoryId 是空字符串，设为 null
      updates.category_id = categoryId || null;
      hasUpdate = true;
    }

    if (!hasUpdate) {
      return NextResponse.json({ error: '没有需要更新的字段' }, { status: 400 });
    }

    // 如果更新分类，检查分类是否存在
    if (categoryId !== undefined && categoryId) {
      const { data: category, error: catError } = await supabase
        .from('file_categories')
        .select('id')
        .eq('site_id', DEFAULT_SITE_ID)
        .eq('id', categoryId)
        .is('deleted_at', null)
        .maybeSingle();

      if (catError || !category) {
        console.error('分类不存在:', catError);
        return NextResponse.json({ error: '目标分类不存在' }, { status: 400 });
      }
    }

    // ✅ 执行更新（使用 site_id）
    updates.updated_at = new Date().toISOString();
    const { data, error } = await supabase
      .from('media_files')
      .update(updates)
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('更新文件失败:', error);
      return NextResponse.json({ error: error.message || '更新失败' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: '更新成功',
      data 
    });
  } catch (error) {
    console.error('PATCH /api/admin/files/[id] error:', error);
    return NextResponse.json({ error: '更新文件失败' }, { status: 500 });
  }
}

// ========== DELETE: 删除文件 ==========
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // ✅ 检查文件是否存在（使用 site_id）
    const { data: existing, error: findError } = await supabase
      .from('media_files')
      .select('id, storage_key')
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (findError || !existing) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    // 检查是否有引用
    const { count, error: countError } = await supabase
      .from('file_references')
      .select('*', { count: 'exact', head: true })
      .eq('file_id', id);

    if (countError) {
      console.error('检查引用失败:', countError);
      return NextResponse.json({ error: '检查引用失败' }, { status: 500 });
    }

    if (count && count > 0) {
      return NextResponse.json({ 
        error: `该文件被 ${count} 个资源引用，无法删除` 
      }, { status: 400 });
    }

    // 软删除（使用 site_id）
    const { error } = await supabase
      .from('media_files')
      .update({ 
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('id', id);

    if (error) {
      console.error('删除文件失败:', error);
      return NextResponse.json({ error: '删除失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/files/[id] error:', error);
    return NextResponse.json({ error: '删除文件失败' }, { status: 500 });
  }
}