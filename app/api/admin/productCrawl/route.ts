// app/api/admin/productCrawl/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/admin';

const DEFAULT_SITE_ID = '000001';

// ============================================================
// GET - 获取采集数据列表（只显示父商品）
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending';
    const keyword = searchParams.get('keyword') || '';
    const platform = searchParams.get('platform') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const size = parseInt(searchParams.get('size') || '20');

    const conditions: any[] = [
      sql`site_id = ${DEFAULT_SITE_ID}`,
      sql`parent_product_id IS NULL`,
    ];

    if (status !== 'all') conditions.push(sql`import_status = ${status}`);
    if (platform) conditions.push(sql`platform = ${platform}`);
    if (keyword) {
      const p = `%${keyword}%`;
      conditions.push(sql`(product_name ILIKE ${p} OR sku ILIKE ${p})`);
    }

    const whereClause = conditions.reduce(
      (acc, c, i) => (i === 0 ? c : sql`${acc} AND ${c}`),
      sql``
    );

    const offset = (page - 1) * size;

    let count = 0;
    try {
      const countRows = await sql<{ count: string }[]>`
        SELECT COUNT(*)::text AS count FROM public.crawler_products
        WHERE ${whereClause}
      `;
      count = parseInt(countRows[0]?.count || '0', 10);
    } catch (countErr: any) {
      throw new Error(countErr.message);
    }

    let data: any[];
    try {
      data = await sql<any[]>`
        SELECT * FROM public.crawler_products
        WHERE ${whereClause}
        ORDER BY collected_at DESC
        LIMIT ${size} OFFSET ${offset}
      `;
    } catch (dataErr: any) {
      throw new Error(dataErr.message);
    }

    return NextResponse.json({
      items: data,
      total: count,
      page,
      size,
    });
  } catch (error) {
    console.error('获取采集数据失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取失败' },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE - 删除采集数据（批量）
// ============================================================
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { crawlerIds } = body;

    if (!crawlerIds || !Array.isArray(crawlerIds) || crawlerIds.length === 0) {
      return NextResponse.json(
        { error: '请提供要删除的 crawlerIds' },
        { status: 400 }
      );
    }

    for (const id of crawlerIds) {
      // 1. 删除变体
      try {
        await sql`
          DELETE FROM public.crawler_products
          WHERE site_id = ${DEFAULT_SITE_ID}
            AND parent_product_id = ${id}
        `;
      } catch (e) {
        console.error(`删除变体失败: ${id}`, e);
      }

      // 2. 删除父商品
      try {
        await sql`
          DELETE FROM public.crawler_products
          WHERE site_id = ${DEFAULT_SITE_ID}
            AND crawler_id = ${id}
        `;
      } catch (e) {
        console.error(`删除父商品失败: ${id}`, e);
      }
    }

    return NextResponse.json({
      success: true,
      deleted_count: crawlerIds.length,
    });
  } catch (error) {
    console.error('删除采集数据失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除失败' },
      { status: 500 }
    );
  }
}