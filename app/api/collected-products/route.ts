// app/api/collected-products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import sql from '@/lib/db/admin';
import { getUserTenantAndSite } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { tenantId, siteId } = await getUserTenantAndSite(user.id);

    const url = new URL(req.url);
    const status = url.searchParams.get('status') || 'all';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = 20;
    const offset = (page - 1) * limit;

    // 动态条件
    const conditions: any[] = [
      sql`tenant_id = ${tenantId}`,
      sql`site_id = ${siteId}`,
    ];
    if (status !== 'all') {
      conditions.push(sql`status = ${status}`);
    }
    const whereClause = conditions.reduce(
      (acc, c, i) => (i === 0 ? c : sql`${acc} AND ${c}`),
      sql``
    );

    // 分页数据
    const items = await sql<any[]>`
      SELECT * FROM public.collected_products
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // 总数
    const countRows = await sql<{ count: string }[]>`
      SELECT COUNT(*)::text AS count FROM public.collected_products
      WHERE ${whereClause}
    `;
    const total = parseInt(countRows[0]?.count || '0', 10);

    // summary（按状态分组统计）
    const summaryRows = await sql<{ status: string; count: string }[]>`
      SELECT status, COUNT(*)::text AS count
      FROM public.collected_products
      WHERE tenant_id = ${tenantId}
        AND site_id = ${siteId}
      GROUP BY status
    `;
    const summary = {
      all: 0,
      unclaimed: 0,
      claimed: 0,
    };
    for (const row of summaryRows) {
      const n = parseInt(row.count, 10);
      summary.all += n;
      if (row.status === 'unclaimed') summary.unclaimed = n;
      if (row.status === 'claimed') summary.claimed = n;
    }

    return NextResponse.json({
      items,
      total,
      summary,
      page,
      limit,
    });
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json({
      items: [],
      total: 0,
      summary: { all: 0, unclaimed: 0, claimed: 0 },
    });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const { tenantId, siteId } = await getUserTenantAndSite(user.id);

    const { id, status, title, price, main_image_url, documents } = await req.json();
    if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (title !== undefined) updateData.title = title;
    if (price !== undefined) updateData.price = price;
    if (main_image_url !== undefined) updateData.main_image_url = main_image_url;
    if (documents !== undefined) updateData.documents = documents;
    updateData.updated_at = new Date().toISOString();

    await sql`
      UPDATE public.collected_products
      SET ${sql(updateData)}
      WHERE id = ${id}
        AND tenant_id = ${tenantId}
        AND site_id = ${siteId}
    `;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('PUT error:', err);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const { tenantId, siteId } = await getUserTenantAndSite(user.id);

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });

    await sql`
      DELETE FROM public.collected_products
      WHERE id = ${id}
        AND tenant_id = ${tenantId}
        AND site_id = ${siteId}
    `;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE error:', err);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}