// app/api/admin/analytics/stats/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getStats } from '@/lib/umami';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startAt = parseInt(searchParams.get('startAt') || '0');
    const endAt = parseInt(searchParams.get('endAt') || '0');

    if (!startAt || !endAt) {
      return NextResponse.json(
        { error: '缺少必要参数: startAt, endAt' },
        { status: 400 }
      );
    }

    if (startAt >= endAt) {
      return NextResponse.json(
        { error: 'startAt 必须小于 endAt' },
        { status: 400 }
      );
    }

    // 捕获 Umami 连接错误，返回空对象
    try {
      const data = await getStats(startAt, endAt);
      return NextResponse.json(data);
    } catch (umamiError) {
      console.error('[Analytics API] Umami 连接失败 (stats):', umamiError);
      // 返回空对象，前端 StatsCards 会显示 0 或占位符
      return NextResponse.json({});
    }
  } catch (error) {
    console.error('[Analytics API] 获取核心指标失败:', error);
    return NextResponse.json({});
  }
}