// app/api/admin/files/categories/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { generateSlug, ensureUniqueSlug } from '@/lib/utils/clientSlug';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

function getSiteId(req: NextRequest): string {
  const siteId = req.nextUrl.searchParams.get('siteId');
  if (siteId) return siteId;
  const headerSiteId = req.headers.get('x-site-id');
  if (headerSiteId) return headerSiteId;
  return DEFAULT_SITE_ID;
}

// ========== GET ==========
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const siteId = getSiteId(req);

    const { data, error } = await supabase
      .from('file_categories')
      .select('*')
      .eq('site_id', siteId)
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      console.error('获取分类详情失败:', error);
      return NextResponse.json({ error: '获取分类详情失败' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: '分类不存在' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/admin/files/categories/[id] error:', error);
    return NextResponse.json({ error: '获取分类详情失败' }, { status: 500 });
  }
}

// ========== PUT ==========
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const siteId = getSiteId(req);
    const body = await req.json();
    let { name, parentId, description, icon, color, order } = body;

    // ✅ 修复：将 "null" 字符串转换为真正的 null
    if (parentId === 'null' || parentId === '') {
      parentId = null;
    }

    const { data: existing, error: findError } = await supabase
      .from('file_categories')
      .select('*')
      .eq('site_id', siteId)
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (findError || !existing) {
      return NextResponse.json({ error: '分类不存在' }, { status: 404 });
    }

    if (parentId === id) {
      return NextResponse.json(
        { error: '不能将分类设置为自己的子分类' },
        { status: 400 }
      );
    }

    if (parentId) {
      const { data: parent, error: parentError } = await supabase
        .from('file_categories')
        .select('id')
        .eq('site_id', siteId)
        .eq('id', parentId)
        .is('deleted_at', null)
        .maybeSingle();

      if (parentError || !parent) {
        return NextResponse.json({ error: '父分类不存在' }, { status: 400 });
      }
    }

    const updates: any = {};
    const now = new Date().toISOString();
    updates.updated_at = now;

    if (name !== undefined && name.trim() !== '') {
      const { data: duplicate, error: dupError } = await supabase
        .from('file_categories')
        .select('id')
        .eq('site_id', siteId)
        .eq('name', name.trim())
        .eq('parent_id', parentId)
        .neq('id', id)
        .is('deleted_at', null)
        .maybeSingle();

      if (dupError) {
        console.error('检查重复名称失败:', dupError);
      }

      if (duplicate) {
        return NextResponse.json(
          { error: '该分类名称在当前父级下已存在' },
          { status: 400 }
        );
      }

      updates.name = name.trim();
      const baseSlug = generateSlug(name.trim());
      const { data: existingSlugs } = await supabase
        .from('file_categories')
        .select('slug')
        .eq('site_id', siteId)
        .neq('id', id);
      const slugs = (existingSlugs || []).map(item => item.slug);
      updates.slug = ensureUniqueSlug(baseSlug, slugs);
    }

    if (parentId !== undefined) updates.parent_id = parentId;
    if (description !== undefined) updates.description = description || '';
    if (icon !== undefined) updates.icon = icon || 'folder';
    if (color !== undefined) updates.color = color || '#3b82f6';
    if (order !== undefined && typeof order === 'number') updates.order = order;

    const { data, error } = await supabase
      .from('file_categories')
      .update(updates)
      .eq('site_id', siteId)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('更新分类失败:', error);
      return NextResponse.json({ error: '更新分类失败' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('PUT /api/admin/files/categories/[id] error:', error);
    return NextResponse.json({ error: '更新分类失败' }, { status: 500 });
  }
}

// ========== DELETE ==========
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const siteId = getSiteId(req);

    const { data: existing, error: findError } = await supabase
      .from('file_categories')
      .select('*')
      .eq('site_id', siteId)
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (findError || !existing) {
      return NextResponse.json({ error: '分类不存在' }, { status: 404 });
    }

    const { count: childrenCount, error: childrenError } = await supabase
      .from('file_categories')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .eq('parent_id', id)
      .is('deleted_at', null);

    if (childrenError) {
      console.error('检查子分类失败:', childrenError);
    }

    if (childrenCount && childrenCount > 0) {
      return NextResponse.json(
        { error: `该分类下还有 ${childrenCount} 个子分类，请先删除或移动子分类` },
        { status: 400 }
      );
    }

    const { count: fileCount, error: fileError } = await supabase
      .from('media_files')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id)
      .is('deleted_at', null);

    if (fileError) {
      console.error('检查文件使用分类失败:', fileError);
    }

    if (fileCount && fileCount > 0) {
      return NextResponse.json(
        { error: `该分类下还有 ${fileCount} 个文件，请先将文件移出该分类` },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('file_categories')
      .update({ 
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('site_id', siteId)
      .eq('id', id);

    if (error) {
      console.error('删除分类失败:', error);
      return NextResponse.json({ error: '删除分类失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/files/categories/[id] error:', error);
    return NextResponse.json({ error: '删除分类失败' }, { status: 500 });
  }
}