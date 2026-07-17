// app/api/admin/analytics/compare/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getCompareStats } from '@/lib/umami';
import type { CompareMode } from '@/lib/umami';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startAt = parseInt(searchParams.get('startAt') || '0');
    const endAt = parseInt(searchParams.get('endAt') || '0');
    const compare = (searchParams.get('compare') || 'prev') as CompareMode;

    if (!startAt || !endAt) {
      return NextResponse.json(
        { error: '缺少必要参数: startAt, endAt' },
        { status: 400 }
      );
    }

    if (compare !== 'prev' && compare !== 'yoy') {
      return NextResponse.json(
        { error: '无效的 compare 参数，允许值: prev, yoy' },
        { status: 400 }
      );
    }

    try {
      const data = await getCompareStats(startAt, endAt, compare);
      return NextResponse.json(data);
    } catch (umamiError) {
      console.error('[Analytics API] Umami 连接失败 (compare):', umamiError);
      // 返回 null，前端会显示“无法获取比较数据”
      return NextResponse.json(null);
    }
  } catch (error) {
    console.error('[Analytics API] 获取比较数据失败:', error);
    return NextResponse.json(null);
  }
}