// app/api/admin/productCrawl/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

const DEFAULT_SITE_ID = '000001';

export async function GET(request: NextRequest) {
  try {
    // 无需权限验证

    const statuses = ['pending', 'imported', 'skipped', 'failed'];
    const counts: Record<string, number> = {};

    for (const status of statuses) {
      const { count, error } = await supabase
        .from('crawler_products')
        .select('*', { count: 'exact', head: true })
        .eq('site_id', DEFAULT_SITE_ID)
        .eq('import_status', status);
      
      if (error) {
        console.error(`统计 ${status} 失败:`, error);
        counts[status] = 0;
      } else {
        counts[status] = count || 0;
      }
    }

    // 总数
    const { count: total, error: totalError } = await supabase
      .from('crawler_products')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', DEFAULT_SITE_ID);

    return NextResponse.json({
      pending: counts.pending || 0,
      imported: counts.imported || 0,
      skipped: counts.skipped || 0,
      failed: counts.failed || 0,
      total: total || 0
    });

  } catch (error) {
    console.error('获取统计失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取失败' },
      { status: 500 }
    );
  }
}