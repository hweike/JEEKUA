// app/api/admin/productCrawl/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/admin';

const DEFAULT_SITE_ID = '000001';

export async function GET(request: NextRequest) {
  try {
    const statuses = ['pending', 'imported', 'skipped', 'failed'];
    const counts: Record<string, number> = {};

    for (const status of statuses) {
      try {
        const rows = await sql<{ count: string }[]>`
          SELECT COUNT(*)::text AS count FROM public.crawler_products
          WHERE site_id = ${DEFAULT_SITE_ID}
            AND import_status = ${status}
        `;
        counts[status] = parseInt(rows[0]?.count || '0', 10);
      } catch (error: any) {
        console.error(`统计 ${status} 失败:`, error);
        counts[status] = 0;
      }
    }

    // 总数
    let total = 0;
    try {
      const rows = await sql<{ count: string }[]>`
        SELECT COUNT(*)::text AS count FROM public.crawler_products
        WHERE site_id = ${DEFAULT_SITE_ID}
      `;
      total = parseInt(rows[0]?.count || '0', 10);
    } catch {}

    return NextResponse.json({
      pending: counts.pending || 0,
      imported: counts.imported || 0,
      skipped: counts.skipped || 0,
      failed: counts.failed || 0,
      total,
    });
  } catch (error) {
    console.error('获取统计失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取失败' },
      { status: 500 }
    );
  }
}