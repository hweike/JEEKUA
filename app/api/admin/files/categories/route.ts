// app/api/admin/files/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/admin';
import { ensureUniqueSlug } from '@/lib/utils/clientSlug';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

function getSiteId(req: NextRequest): string {
  const siteId = req.nextUrl.searchParams.get('siteId');
  if (siteId) return siteId;
  const headerSiteId = req.headers.get('x-site-id');
  if (headerSiteId) return headerSiteId;
  return DEFAULT_SITE_ID;
}

function generateSlug(text: string): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (/[^\x00-\x7F]/.test(trimmed)) {
    return encodeURIComponent(trimmed)
      .toLowerCase()
      .replace(/%20/g, '-')
      .replace(/[!'()*]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  return trimmed
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function generateUniqueSlug(
  name: string,
  siteId: string,
  excludeId?: string
): Promise<string> {
  const baseSlug = generateSlug(name);

  let existingSlugs: string[] = [];
  try {
    const rows = excludeId
      ? await sql<{ slug: string | null }[]>`
          SELECT slug FROM public.file_categories
          WHERE site_id = ${siteId}
            AND id != ${excludeId}
        `
      : await sql<{ slug: string | null }[]>`
          SELECT slug FROM public.file_categories
          WHERE site_id = ${siteId}
        `;
    existingSlugs = rows.map(r => r.slug).filter((s): s is string => !!s);
  } catch (error: any) {
    console.error('查询已存在 slug 失败:', error);
    return baseSlug;
  }

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

    let categories: any[];
    try {
      categories = await sql<any[]>`
        SELECT * FROM public.file_categories
        WHERE site_id = ${siteId}
          AND deleted_at IS NULL
        ORDER BY parent_id NULLS FIRST, "order" ASC
      `;
    } catch (error: any) {
      console.error('获取分类列表失败:', error);
      return NextResponse.json(
        { error: error.message || '获取分类列表失败' },
        { status: 500 }
      );
    }

    const processedCategories = categories.map(cat => ({
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

    if (parentId === 'null' || parentId === '') {
      parentId = null;
    }

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: '分类名称不能为空' }, { status: 400 });
    }

    // 检查同名分类是否已存在（同一父级下）
    try {
      const existing = parentId
        ? await sql<{ id: string }[]>`
            SELECT id FROM public.file_categories
            WHERE site_id = ${siteId}
              AND name = ${name.trim()}
              AND parent_id = ${parentId}
              AND deleted_at IS NULL
            LIMIT 1
          `
        : await sql<{ id: string }[]>`
            SELECT id FROM public.file_categories
            WHERE site_id = ${siteId}
              AND name = ${name.trim()}
              AND parent_id IS NULL
              AND deleted_at IS NULL
            LIMIT 1
          `;
      if (existing[0]) {
        return NextResponse.json(
          { error: '该分类名称在当前父级下已存在' },
          { status: 400 }
        );
      }
    } catch (nameCheckError: any) {
      console.error('检查分类名称失败:', nameCheckError);
    }

    // 检查父分类
    if (parentId) {
      let parent: { id: string; name: string } | undefined;
      try {
        const rows = await sql<{ id: string; name: string }[]>`
          SELECT id, name FROM public.file_categories
          WHERE site_id = ${siteId}
            AND id = ${parentId}
            AND deleted_at IS NULL
          LIMIT 1
        `;
        parent = rows[0];
      } catch (parentError: any) {
        console.error('查询父分类失败:', parentError);
      }

      if (!parent) {
        return NextResponse.json({ error: '父分类不存在或已被删除' }, { status: 400 });
      }
    }

    const slug = await generateUniqueSlug(name.trim(), siteId);

    // 获取当前最大 order（同一父级下）
    let maxOrder = -1;
    try {
      const rows = parentId
        ? await sql<{ order: number | null }[]>`
            SELECT "order" FROM public.file_categories
            WHERE site_id = ${siteId}
              AND parent_id = ${parentId}
            ORDER BY "order" DESC
            LIMIT 1
          `
        : await sql<{ order: number | null }[]>`
            SELECT "order" FROM public.file_categories
            WHERE site_id = ${siteId}
              AND parent_id IS NULL
            ORDER BY "order" DESC
            LIMIT 1
          `;
      maxOrder = rows[0]?.order ?? -1;
    } catch (orderError: any) {
      console.error('获取最大排序值失败:', orderError);
    }

    const now = new Date().toISOString();

    let data: any;
    try {
      const rows = await sql<any[]>`
        INSERT INTO public.file_categories (
          site_id, name, slug, parent_id, "order", description, icon, color, created_at, updated_at
        ) VALUES (
          ${siteId}, ${name.trim()}, ${slug}, ${parentId}, ${maxOrder + 1},
          ${description || ''}, ${icon || 'folder'}, ${color || '#3b82f6'},
          ${now}, ${now}
        )
        RETURNING *
      `;
      data = rows[0];
    } catch (error: any) {
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