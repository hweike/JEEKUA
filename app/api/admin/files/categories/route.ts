// app/api/admin/files/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { ensureUniqueSlug } from '@/lib/utils/clientSlug';   // ← 只导入存在的

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

// ========== 辅助函数 ==========

function getSiteId(req: NextRequest): string {
  const siteId = req.nextUrl.searchParams.get('siteId');
  if (siteId) return siteId;
  const headerSiteId = req.headers.get('x-site-id');
  if (headerSiteId) return headerSiteId;
  return DEFAULT_SITE_ID;
}

/**
 * 生成 slug（基础版本，不含拼音）
 *
 * 说明：clientSlug.ts 只负责唯一性，生成逻辑在使用方实现
 * - 支持中文的 URL 编码（encodeURIComponent）
 * - 保留字母、数字、连字符
 *
 * @example
 *   generateSlug("Hello World")     → "hello-world"
 *   generateSlug("About Us - 2024") → "about-us-2024"
 *   generateSlug("你好 世界")        → "%E4%BD%A0%E5%A5%BD-%E4%B8%96%E7%95%8C"
 */
function generateSlug(text: string): string {
  if (!text) return '';

  const trimmed = text.trim();

  // 1. 如果包含非 ASCII 字符（中文等），用 URL 编码
  if (/[^\x00-\x7F]/.test(trimmed)) {
    return encodeURIComponent(trimmed)
      .toLowerCase()
      .replace(/%20/g, '-')          // 空格 → 连字符
      .replace(/[!'()*]/g, '')       // 移除非法的 URL 字符
      .replace(/-+/g, '-')           // 多个连字符合并
      .replace(/^-|-$/g, '');        // 去头去尾
  }

  // 2. 纯 ASCII：常规转换
  return trimmed
    .toLowerCase()
    .replace(/\s+/g, '-')            // 空格 → 连字符
    .replace(/[^\w\-]+/g, '')        // 移除非字母数字连字符
    .replace(/-+/g, '-')             // 多个连字符合并
    .replace(/^-|-$/g, '');          // 去头去尾
}

/**
 * 生成唯一的分类 slug
 */
async function generateUniqueSlug(
  name: string,
  siteId: string,
  excludeId?: string
): Promise<string> {
  const baseSlug = generateSlug(name);

  let query = supabase
    .from('file_categories')
    .select('slug')
    .eq('site_id', siteId);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('查询已存在 slug 失败:', error);
    return baseSlug;
  }

  const existingSlugs = (data || []).map(item => item.slug).filter(Boolean);
  return ensureUniqueSlug(baseSlug, existingSlugs);
}

function buildCategoryTree(items: any[], parentId: string | null = null): any[] {
  const result: any[] = [];
  const children = items.filter(item => item.parent_id === parentId);

  for (const child of children) {
    result.push({
      ...child,
      children: buildCategoryTree(items, child.id),
    });
  }

  return result.sort((a, b) => (a.order || 0) - (b.order || 0));
}

// ========== GET ==========
export async function GET(req: NextRequest) {
  try {
    const siteId = getSiteId(req);

    const { data: categories, error } = await supabase
      .from('file_categories')
      .select('*')
      .eq('site_id', siteId)
      .is('deleted_at', null)
      .order('parent_id', { ascending: true, nullsFirst: true })
      .order('order', { ascending: true });

    if (error) {
      console.error('获取分类列表失败:', error);
      return NextResponse.json(
        { error: error.message || '获取分类列表失败' },
        { status: 500 }
      );
    }

    const processedCategories = (categories || []).map(cat => ({
      ...cat,
      isSystem: cat.slug === 'uncategorized' || cat.name === '未分类',
    }));

    const tree = buildCategoryTree(processedCategories);
    return NextResponse.json(tree);
  } catch (error) {
    console.error('GET /api/admin/files/categories error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取分类列表失败' },
      { status: 500 }
    );
  }
}

// ========== POST ==========
export async function POST(req: NextRequest) {
  try {
    const siteId = getSiteId(req);
    const body = await req.json();
    let { name, parentId, description, icon, color } = body;

    // ✅ 修复：将 "null" 字符串转换为真正的 null
    if (parentId === 'null' || parentId === '') {
      parentId = null;
    }

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: '分类名称不能为空' },
        { status: 400 }
      );
    }

    // 检查同名分类是否已存在（同一父级下）
    const { data: existingName, error: nameCheckError } = await supabase
      .from('file_categories')
      .select('id')
      .eq('site_id', siteId)
      .eq('name', name.trim())
      .eq('parent_id', parentId)
      .is('deleted_at', null)
      .maybeSingle();

    if (nameCheckError) {
      console.error('检查分类名称失败:', nameCheckError);
    }

    if (existingName) {
      return NextResponse.json(
        { error: '该分类名称在当前父级下已存在' },
        { status: 400 }
      );
    }

    // 检查父分类是否存在
    if (parentId) {
      const { data: parent, error: parentError } = await supabase
        .from('file_categories')
        .select('id, name')
        .eq('site_id', siteId)
        .eq('id', parentId)
        .is('deleted_at', null)
        .maybeSingle();

      if (parentError || !parent) {
        return NextResponse.json(
          { error: '父分类不存在或已被删除' },
          { status: 400 }
        );
      }
    }

    // 生成唯一 slug
    const slug = await generateUniqueSlug(name.trim(), siteId);

    // 获取当前最大 order（同一父级下）
    const { data: maxOrderData, error: orderError } = await supabase
      .from('file_categories')
      .select('order')
      .eq('site_id', siteId)
      .eq('parent_id', parentId)
      .order('order', { ascending: false })
      .limit(1);

    if (orderError) {
      console.error('获取最大排序值失败:', orderError);
    }
    const maxOrder = maxOrderData?.[0]?.order ?? -1;

    const now = new Date().toISOString();
    const newCategory = {
      site_id: siteId,
      name: name.trim(),
      slug,
      parent_id: parentId,
      order: maxOrder + 1,
      description: description || '',
      icon: icon || 'folder',
      color: color || '#3b82f6',
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('file_categories')
      .insert(newCategory)
      .select()
      .single();

    if (error) {
      console.error('创建分类失败:', error);
      return NextResponse.json(
        { error: error.message || '创建分类失败' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/files/categories error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建分类失败' },
      { status: 500 }
    );
  }
}