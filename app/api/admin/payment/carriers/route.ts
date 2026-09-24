// app/api/admin/payment/carriers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/admin';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const siteId = searchParams.get('siteId') || DEFAULT_SITE_ID;
    const shippingMethod = searchParams.get('shippingMethod') || '';
    const search = (searchParams.get('search') || '').trim();
    const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
    const offset = page * pageSize;

    // 构建 WHERE 条件
    const conditions: any[] = [
      sql`is_active = true`,
      sql`(site_id = ${siteId} OR site_id IS NULL)`,
    ];

    // 按运输方式过滤（shipping_methods 是 JSONB 数组）
    if (shippingMethod) {
      conditions.push(sql`shipping_methods @> ${JSON.stringify([shippingMethod])}::jsonb`);
    }

    // 搜索（name_cn / name_en / name_hk / key）
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        sql`(name_cn ILIKE ${pattern} OR name_en ILIKE ${pattern} OR name_hk ILIKE ${pattern} OR key ILIKE ${pattern})`
      );
    }

    const whereClause = conditions.reduce(
      (acc, c, i) => (i === 0 ? c : sql`${acc} AND ${c}`),
      sql``
    );

    // 总数
    const countRows = await sql<{ count: string }[]>`
      SELECT COUNT(*)::text AS count
      FROM public.carriers
      WHERE ${whereClause}
    `;
    const total = parseInt(countRows[0]?.count || '0', 10);

    // 分页数据
    const rows = await sql<any[]>`
      SELECT * FROM public.carriers
      WHERE ${whereClause}
      ORDER BY sort_order ASC, name_cn ASC
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    const hasMore = (page + 1) * pageSize < total;

    return NextResponse.json({
      items: rows,
      total,
      page,
      pageSize,
      hasMore,
    });
  } catch (error: any) {
    console.error('GET /api/admin/payment/carriers error:', error);
    return NextResponse.json(
      { error: error.message || '获取承运商失败' },
      { status: 500 }
    );
  }
}