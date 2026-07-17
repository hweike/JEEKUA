// app/api/admin/analytics/performance/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { fetchUmami } from '@/lib/umami';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startAt = parseInt(searchParams.get('startAt') || '0');
    const endAt = parseInt(searchParams.get('endAt') || '0');
    const metric = searchParams.get('metric') || 'lcp';

    if (!startAt || !endAt) {
      return NextResponse.json(
        { error: '缺少必要参数: startAt, endAt' },
        { status: 400 }
      );
    }

    try {
      // 调用 Umami API 获取性能数据
      // 注意: Umami 的 Web Vitals 数据需要在前端启用 data-collect-vitals
      // 如果 Umami 实例不支持，这里会返回空数据
      const data = await fetchUmami(
        `/api/websites/${process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}/metrics?startAt=${startAt}&endAt=${endAt}&type=url&limit=10`
      );
      return NextResponse.json(data);
    } catch (umamiError) {
      console.error('[Analytics API] Umami 连接失败 (performance):', umamiError);
      // 返回空数据，前端显示"暂无数据"
      return NextResponse.json({
        metrics: [],
        trend: [],
        pages: [],
        environments: [],
        sampleCount: 0,
      });
    }
  } catch (error) {
    console.error('[Analytics API] 获取性能数据失败:', error);
    return NextResponse.json({
      metrics: [],
      trend: [],
      pages: [],
      environments: [],
      sampleCount: 0,
    });
  }
}