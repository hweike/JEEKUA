// app/api/admin/analytics/sessions/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getSessions } from '@/lib/umami';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startAt = parseInt(searchParams.get('startAt') || '0');
    const endAt = parseInt(searchParams.get('endAt') || '0');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';

    if (!startAt || !endAt) {
      return NextResponse.json(
        { error: '缺少必要参数: startAt, endAt' },
        { status: 400 }
      );
    }

    if (page < 1) {
      return NextResponse.json(
        { error: 'page 必须大于 0' },
        { status: 400 }
      );
    }

    if (pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        { error: 'pageSize 必须在 1 到 100 之间' },
        { status: 400 }
      );
    }

    try {
      const data = await getSessions(startAt, endAt, page, pageSize);
      
      // 如果有搜索关键词，在返回数据中过滤（Umami API 本身可能不支持搜索，
      // 我们在前端过滤，但为了更好的体验，这里也可以做过滤）
      // 实际上 Umami 的搜索是在前端做的，我们保持一致性
      
      return NextResponse.json(data);
    } catch (umamiError) {
      console.error('[Analytics API] Umami 连接失败 (sessions):', umamiError);
      return NextResponse.json({
        data: [],
        total: 0,
        page: page,
        pageSize: pageSize,
      });
    }
  } catch (error) {
    console.error('[Analytics API] 获取会话列表失败:', error);
    return NextResponse.json({
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
  }
}