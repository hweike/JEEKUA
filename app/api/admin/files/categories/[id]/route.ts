// app/api/admin/files/categories/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/admin';
import { ensureUniqueSlug } from '@/lib/utils/clientSlug';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

function generateSlug(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

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

    let data: any;
    try {
      const rows = await sql<any[]>`
        SELECT * FROM public.file_categories
        WHERE site_id = ${siteId}
          AND id = ${id}
          AND deleted_at IS NULL
        LIMIT 1
      `;
      data = rows[0];
    } catch (error: any) {
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

    if (parentId === 'null' || parentId === '') {
      parentId = null;
    }

    // 检查分类是否存在
    let existing: any;
    try {
      const rows = await sql<any[]>`
        SELECT * FROM public.file_categories
        WHERE site_id = ${siteId}
          AND id = ${id}
          AND deleted_at IS NULL
        LIMIT 1
      `;
      existing = rows[0];
    } catch (findError: any) {
      console.error('查询分类失败:', findError);
    }

    if (!existing) {
      return NextResponse.json({ error: '分类不存在' }, { status: 404 });
    }

    if (parentId === id) {
      return NextResponse.json(
        { error: '不能将分类设置为自己的子分类' },
        { status: 400 }
      );
    }

    if (parentId) {
      let parent: { id: string } | undefined;
      try {
        const rows = await sql<{ id: string }[]>`
          SELECT id FROM public.file_categories
          WHERE site_id = ${siteId}
            AND id = ${parentId}
            AND deleted_at IS NULL
          LIMIT 1
        `;
        parent = rows[0];
      } catch {}

      if (!parent) {
        return NextResponse.json({ error: '父分类不存在' }, { status: 400 });
      }
    }

    const updates: Record<string, any> = {};
    const now = new Date().toISOString();

    if (name !== undefined && name.trim() !== '') {
      // 检查重复名称
      try {
        const dup = parentId
          ? await sql<{ id: string }[]>`
              SELECT id FROM public.file_categories
              WHERE site_id = ${siteId}
                AND name = ${name.trim()}
                AND parent_id = ${parentId}
                AND id != ${id}
                AND deleted_at IS NULL
              LIMIT 1
            `
          : await sql<{ id: string }[]>`
              SELECT id FROM public.file_categories
              WHERE site_id = ${siteId}
                AND name = ${name.trim()}
                AND parent_id IS NULL
                AND id != ${id}
                AND deleted_at IS NULL
              LIMIT 1
            `;
        if (dup[0]) {
          return NextResponse.json(
            { error: '该分类名称在当前父级下已存在' },
            { status: 400 }
          );
        }
      } catch (dupError: any) {
        console.error('检查重复名称失败:', dupError);
      }

      updates.name = name.trim();
      const baseSlug = generateSlug(name.trim());
      let existingSlugs: string[] = [];
      try {
        const rows = await sql<{ slug: string | null }[]>`
          SELECT slug FROM public.file_categories
          WHERE site_id = ${siteId}
            AND id != ${id}
        `;
        existingSlugs = rows.map(r => r.slug).filter((s): s is string => !!s);
      } catch {}
      updates.slug = ensureUniqueSlug(baseSlug, existingSlugs);
    }

    if (parentId !== undefined) updates.parent_id = parentId;
    if (description !== undefined) updates.description = description || '';
    if (icon !== undefined) updates.icon = icon || 'folder';
    if (color !== undefined) updates.color = color || '#3b82f6';
    if (order !== undefined && typeof order === 'number') updates.order = order;

    // 动态 SET
    const setClauses: any[] = [];
    for (const [key, value] of Object.entries(updates)) {
      setClauses.push(sql`${sql(key)} = ${value}`);
    }
    setClauses.push(sql`updated_at = ${now}`);

    const setClause = setClauses.reduce(
      (acc, c, i) => (i === 0 ? c : sql`${acc}, ${c}`),
      sql``
    );

    let data: any;
    try {
      const rows = await sql<any[]>`
        UPDATE public.file_categories
        SET ${setClause}
        WHERE site_id = ${siteId}
          AND id = ${id}
        RETURNING *
      `;
      data = rows[0];
    } catch (error: any) {
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

    // 检查分类是否存在
    let existing: { id: string } | undefined;
    try {
      const rows = await sql<{ id: string }[]>`
        SELECT id FROM public.file_categories
        WHERE site_id = ${siteId}
          AND id = ${id}
          AND deleted_at IS NULL
        LIMIT 1
      `;
      existing = rows[0];
    } catch (findError: any) {
      console.error('查询分类失败:', findError);
    }

    if (!existing) {
      return NextResponse.json({ error: '分类不存在' }, { status: 404 });
    }

    // 检查子分类
    let childrenCount = 0;
    try {
      const rows = await sql<{ count: string }[]>`
        SELECT COUNT(*)::text AS count FROM public.file_categories
        WHERE site_id = ${siteId}
          AND parent_id = ${id}
          AND deleted_at IS NULL
      `;
      childrenCount = parseInt(rows[0]?.count || '0', 10);
    } catch (childrenError: any) {
      console.error('检查子分类失败:', childrenError);
    }

    if (childrenCount > 0) {
      return NextResponse.json(
        { error: `该分类下还有 ${childrenCount} 个子分类，请先删除或移动子分类` },
        { status: 400 }
      );
    }

    // 检查文件使用
    let fileCount = 0;
    try {
      const rows = await sql<{ count: string }[]>`
        SELECT COUNT(*)::text AS count FROM public.media_files
        WHERE category_id = ${id}
          AND deleted_at IS NULL
      `;
      fileCount = parseInt(rows[0]?.count || '0', 10);
    } catch (fileError: any) {
      console.error('检查文件使用分类失败:', fileError);
    }

    if (fileCount > 0) {
      return NextResponse.json(
        { error: `该分类下还有 ${fileCount} 个文件，请先将文件移出该分类` },
        { status: 400 }
      );
    }

    // 软删除
    try {
      await sql`
        UPDATE public.file_categories
        SET deleted_at = ${new Date().toISOString()},
            updated_at = ${new Date().toISOString()}
        WHERE site_id = ${siteId}
          AND id = ${id}
      `;
    } catch (error: any) {
      console.error('删除分类失败:', error);
      return NextResponse.json({ error: '删除分类失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/files/categories/[id] error:', error);
    return NextResponse.json({ error: '删除分类失败' }, { status: 500 });
  }
}