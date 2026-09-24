// lib/files/db.ts
import sql from '@/lib/db/admin';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

// ============================================================
// 文件 CRUD
// ============================================================

export async function createMediaFile(data: {
  storage_key: string;
  display_name: string;
  mime_type: string;
  size: number;
  file_hash: string;
  width?: number | null;
  height?: number | null;
  source_url?: string | null;
}) {
  try {
    const rows = await sql<any[]>`
      INSERT INTO public.media_files (
        site_id, storage_key, display_name, mime_type, size, file_hash,
        width, height, source_url
      ) VALUES (
        ${DEFAULT_SITE_ID}, ${data.storage_key}, ${data.display_name},
        ${data.mime_type}, ${data.size}, ${data.file_hash},
        ${data.width ?? null}, ${data.height ?? null}, ${data.source_url ?? null}
      )
      RETURNING *
    `;
    if (!rows[0]) throw new Error('插入未返回数据');
    return rows[0];
  } catch (error: any) {
    throw new Error(`插入 media_files 失败: ${error.message}`);
  }
}

export async function findMediaFileByHash(fileHash: string) {
  try {
    const rows = await sql<any[]>`
      SELECT * FROM public.media_files
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND file_hash = ${fileHash}
      LIMIT 1
    `;
    return rows[0] || null;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function getMediaFileById(id: string) {
  try {
    const rows = await sql<{ storage_key: string }[]>`
      SELECT storage_key FROM public.media_files
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND id = ${id}
      LIMIT 1
    `;
    if (!rows[0]) throw new Error('File not found');
    return rows[0];
  } catch (error: any) {
    throw new Error(error.message);
  }
}

/**
 * ✅ 优化版：一次 SQL 查询完成
 * - JOIN file_references 统计引用数
 * - GROUP BY + HAVING 过滤
 * - ORDER BY + LIMIT/OFFSET SQL 层分页
 * - COUNT(*) OVER() 窗口函数一次拿 total
 *
 * 从 3 次查询 + 内存处理 → 1 次查询
 */
export async function listMediaFiles(
  page: number = 1,
  pageSize: number = 20,
  search?: string,
  categoryId?: string | null,
  referenced?: string | null
): Promise<{ files: any[]; total: number }> {
  try {
    // 1. WHERE 条件（JOIN 后需带 mf. 前缀）
    const conditions: any[] = [
      sql`mf.site_id = ${DEFAULT_SITE_ID}`,
      sql`mf.deleted_at IS NULL`,
    ];
    if (search) {
      conditions.push(sql`mf.display_name ILIKE ${'%' + search + '%'}`);
    }
    if (categoryId) {
      conditions.push(sql`mf.category_id = ${categoryId}`);
    }
    const whereClause = conditions.reduce(
      (acc, c, i) => (i === 0 ? c : sql`${acc} AND ${c}`),
      sql``
    );

    // 2. HAVING 条件（引用过滤在 DB 层完成）
    let havingClause = sql``;
    if (referenced === 'true') {
      havingClause = sql`HAVING COUNT(fr.id) > 0`;
    } else if (referenced === 'false') {
      havingClause = sql`HAVING COUNT(fr.id) = 0`;
    }

    // 3. 分页参数
    const offset = (page - 1) * pageSize;

    // 4. 一次查询：JOIN + GROUP + HAVING + ORDER + LIMIT + 窗口函数 total
    const rows = await sql<any[]>`
      SELECT
        mf.id,
        mf.storage_key,
        mf.display_name,
        mf.mime_type,
        mf.size,
        mf.created_at,
        mf.alt_text,
        mf.category_id,
        COUNT(fr.id)::int AS "referenceCount",
        COUNT(*) OVER()::int AS "_total"
      FROM public.media_files mf
      LEFT JOIN public.file_references fr ON fr.file_id = mf.id
      WHERE ${whereClause}
      GROUP BY mf.id
      ${havingClause}
      ORDER BY mf.created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    // 5. 从窗口函数里取 total
    const total = rows[0]?._total ?? 0;

    // 6. 去掉 _total 字段
    const files = rows.map(({ _total, ...rest }) => rest);

    return { files, total };
  } catch (error: any) {
    console.error('listMediaFiles 错误:', error);
    return { files: [], total: 0 };
  }
}

export async function softDeleteMediaFile(fileId: string) {
  // 1. 检查文件存在
  let file: { id: string } | undefined;
  try {
    const rows = await sql<{ id: string }[]>`
      SELECT id FROM public.media_files
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND id = ${fileId}
      LIMIT 1
    `;
    file = rows[0];
  } catch (error: any) {
    throw new Error(error.message);
  }
  if (!file) throw new Error('File not found or access denied');

  // 2. 检查引用计数（加 site_id 过滤，多租户安全）
  const countRows = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count FROM public.file_references
    WHERE file_id = ${fileId}
      AND site_id = ${DEFAULT_SITE_ID}
  `;
  const count = parseInt(countRows[0]?.count || '0', 10);
  if (count > 0) {
    throw new Error('Cannot delete file with active references');
  }

  // 3. 软删除（✅ 用 NOW() 让 PG 处理时间）
  try {
    await sql`
      UPDATE public.media_files
      SET deleted_at = NOW()
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND id = ${fileId}
    `;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

// ============================================================
// 文件引用
// ============================================================

export async function createFileReference(data: {
  file_id: string;
  reference_type: string;
  reference_id: string;
  alt_text?: string | null;
  sort_order?: number;
}) {
  // 1. 验证文件存在
  let file: { id: string } | undefined;
  try {
    const rows = await sql<{ id: string }[]>`
      SELECT id FROM public.media_files
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND id = ${data.file_id}
      LIMIT 1
    `;
    file = rows[0];
  } catch (error: any) {
    throw new Error(error.message);
  }
  if (!file) throw new Error('File not found or access denied');

  // 2. 插入引用（显式传 site_id）
  try {
    await sql`
      INSERT INTO public.file_references (
        site_id, file_id, reference_type, reference_id, alt_text, sort_order
      )
      VALUES (
        ${DEFAULT_SITE_ID},
        ${data.file_id}, ${data.reference_type}, ${data.reference_id},
        ${data.alt_text ?? null}, ${data.sort_order ?? 0}
      )
    `;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

/**
 * ✅ 加 site_id 过滤（多租户安全）
 */
export async function deleteFileReference(referenceId: number) {
  // 1. 查询引用（带 site_id）
  let ref: { file_id: string } | undefined;
  try {
    const rows = await sql<{ file_id: string }[]>`
      SELECT file_id FROM public.file_references
      WHERE id = ${referenceId}
        AND site_id = ${DEFAULT_SITE_ID}
      LIMIT 1
    `;
    ref = rows[0];
  } catch (error: any) {
    throw new Error(error.message);
  }
  if (!ref) throw new Error('Reference not found');

  // 2. 验证文件属于当前站点
  let file: { id: string } | undefined;
  try {
    const rows = await sql<{ id: string }[]>`
      SELECT id FROM public.media_files
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND id = ${ref.file_id}
      LIMIT 1
    `;
    file = rows[0];
  } catch {
    // ignore
  }
  if (!file) throw new Error('File not found or access denied');

  // 3. 删除引用（带 site_id）
  try {
    await sql`
      DELETE FROM public.file_references
      WHERE id = ${referenceId}
        AND site_id = ${DEFAULT_SITE_ID}
    `;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function upsertFileReference(data: {
  file_id: string;
  reference_type: string;
  reference_id: string;
  alt_text?: string | null;
  sort_order?: number;
}) {
  // 1. 验证文件存在
  let file: { id: string } | undefined;
  try {
    const rows = await sql<{ id: string }[]>`
      SELECT id FROM public.media_files
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND id = ${data.file_id}
      LIMIT 1
    `;
    file = rows[0];
  } catch (error: any) {
    throw new Error(error.message);
  }
  if (!file) throw new Error('File not found or access denied');

  // 2. upsert（显式传 site_id）
  try {
    await sql`
      INSERT INTO public.file_references (
        site_id, file_id, reference_type, reference_id, alt_text, sort_order
      )
      VALUES (
        ${DEFAULT_SITE_ID},
        ${data.file_id}, ${data.reference_type}, ${data.reference_id},
        ${data.alt_text ?? null}, ${data.sort_order ?? 0}
      )
      ON CONFLICT (file_id, reference_type, reference_id)
      DO UPDATE SET
        alt_text = EXCLUDED.alt_text,
        sort_order = EXCLUDED.sort_order
    `;
  } catch (error: any) {
    throw new Error(error.message);
  }
}