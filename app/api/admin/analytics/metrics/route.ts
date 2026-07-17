// app/api/admin/analytics/metrics/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getMetrics } from '@/lib/umami';
import type { MetricType } from '@/lib/umami';

const VALID_TYPES: MetricType[] = [
  'url', 'referrer', 'browser', 'os', 
  'device', 'country', 'city', 'language'
];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startAt = parseInt(searchParams.get('startAt') || '0');
    const endAt = parseInt(searchParams.get('endAt') || '0');
    const type = searchParams.get('type') as MetricType;
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!startAt || !endAt) {
      return NextResponse.json(
        { error: '缺少必要参数: startAt, endAt' },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { error: '缺少必要参数: type' },
        { status: 400 }
      );
    }

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `无效的 type 参数，允许值: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'limit 必须在 1 到 100 之间' },
        { status: 400 }
      );
    }

    // 捕获 Umami 连接错误，返回空数组
    try {
      const data = await getMetrics(startAt, endAt, type, limit);
      return NextResponse.json(data);
    } catch (umamiError) {
      console.error('[Analytics API] Umami 连接失败 (metrics):', umamiError);
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('[Analytics API] 获取维度数据失败:', error);
    return NextResponse.json([]);
  }
}