// app/api/admin/analytics/pageviews/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getPageviews } from '@/lib/umami';
import type { TimeUnit } from '@/lib/umami';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startAt = parseInt(searchParams.get('startAt') || '0');
    const endAt = parseInt(searchParams.get('endAt') || '0');
    const unit = (searchParams.get('unit') || 'day') as TimeUnit;

    if (!startAt || !endAt) {
      return NextResponse.json(
        { error: '缺少必要参数: startAt, endAt' },
        { status: 400 }
      );
    }

    const validUnits: TimeUnit[] = ['minute', 'hour', 'day', 'month'];
    if (!validUnits.includes(unit)) {
      return NextResponse.json(
        { error: '无效的 unit 参数，允许值: minute, hour, day, month' },
        { status: 400 }
      );
    }

    // ✅ 捕获 Umami API 连接错误，返回空数组
    try {
      const data = await getPageviews(startAt, endAt, unit);
      return NextResponse.json(data);
    } catch (umamiError) {
      console.error('[Analytics API] Umami 连接失败:', umamiError);
      // 返回空数组，前端调用 .map() 等不会报错
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('[Analytics API] 获取趋势数据失败:', error);
    // 其他意外错误也返回空数组
    return NextResponse.json([]);
  }
}