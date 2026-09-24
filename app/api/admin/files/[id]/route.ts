// app/api/admin/files/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/admin';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

// ========== GET: 获取单个文件详情 ==========
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let data: any;
    try {
      const rows = await sql<any[]>`
        SELECT * FROM public.media_files
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND id = ${id}
          AND deleted_at IS NULL
        LIMIT 1
      `;
      data = rows[0];
    } catch (error: any) {
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

    // 1. 检查文件是否存在
    let existing: { id: string } | undefined;
    try {
      const rows = await sql<{ id: string }[]>`
        SELECT id FROM public.media_files
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND id = ${id}
          AND deleted_at IS NULL
        LIMIT 1
      `;
      existing = rows[0];
    } catch (findError: any) {
      console.error('文件不存在:', findError);
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    if (!existing) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    // 2. 构建更新对象
    const updates: Record<string, any> = {};
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
      updates.category_id = categoryId || null;
      hasUpdate = true;
    }

    if (!hasUpdate) {
      return NextResponse.json({ error: '没有需要更新的字段' }, { status: 400 });
    }

    // 3. 如果更新分类，检查分类是否存在
    if (categoryId !== undefined && categoryId) {
      let category: { id: string } | undefined;
      try {
        const rows = await sql<{ id: string }[]>`
          SELECT id FROM public.file_categories
          WHERE site_id = ${DEFAULT_SITE_ID}
            AND id = ${categoryId}
            AND deleted_at IS NULL
          LIMIT 1
        `;
        category = rows[0];
      } catch (catError: any) {
        console.error('分类不存在:', catError);
        return NextResponse.json({ error: '目标分类不存在' }, { status: 400 });
      }

      if (!category) {
        return NextResponse.json({ error: '目标分类不存在' }, { status: 400 });
      }
    }

    // 4. 动态 SET
    const setClauses: any[] = [];
    for (const [key, value] of Object.entries(updates)) {
      setClauses.push(sql`${sql(key)} = ${value}`);
    }
    setClauses.push(sql`updated_at = ${new Date().toISOString()}`);

    const setClause = setClauses.reduce(
      (acc, c, i) => (i === 0 ? c : sql`${acc}, ${c}`),
      sql``
    );

    let data: any;
    try {
      const rows = await sql<any[]>`
        UPDATE public.media_files
        SET ${setClause}
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND id = ${id}
        RETURNING *
      `;
      data = rows[0];
    } catch (error: any) {
      console.error('更新文件失败:', error);
      return NextResponse.json({ error: error.message || '更新失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '更新成功',
      data,
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

    // 1. 检查文件是否存在
    let existing: { id: string; storage_key: string } | undefined;
    try {
      const rows = await sql<{ id: string; storage_key: string }[]>`
        SELECT id, storage_key FROM public.media_files
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND id = ${id}
          AND deleted_at IS NULL
        LIMIT 1
      `;
      existing = rows[0];
    } catch {}

    if (!existing) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    // 2. 检查是否有引用
    let count = 0;
    try {
      const countRows = await sql<{ count: string }[]>`
        SELECT COUNT(*)::text AS count FROM public.file_references
        WHERE file_id = ${id}
      `;
      count = parseInt(countRows[0]?.count || '0', 10);
    } catch (countError: any) {
      console.error('检查引用失败:', countError);
      return NextResponse.json({ error: '检查引用失败' }, { status: 500 });
    }

    if (count > 0) {
      return NextResponse.json({
        error: `该文件被 ${count} 个资源引用，无法删除`,
      }, { status: 400 });
    }

    // 3. 软删除
    try {
      await sql`
        UPDATE public.media_files
        SET deleted_at = ${new Date().toISOString()},
            updated_at = ${new Date().toISOString()}
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND id = ${id}
      `;
    } catch (error: any) {
      console.error('删除文件失败:', error);
      return NextResponse.json({ error: '删除失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/files/[id] error:', error);
    return NextResponse.json({ error: '删除文件失败' }, { status: 500 });
  }
}