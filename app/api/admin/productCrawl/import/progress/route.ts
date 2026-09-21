// app/api/admin/productCrawl/import/progress/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getProgress } from '@/lib/productCrawl/import-progress';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { error: '缺少 taskId 参数' },
        { status: 400 }
      );
    }

    const progress = getProgress(taskId);
    if (!progress) {
      return NextResponse.json(
        { error: '任务不存在或已过期' },
        { status: 404 }
      );
    }

    return NextResponse.json(progress);
  } catch (error) {
    console.error('获取进度失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取进度失败' },
      { status: 500 }
    );
  }
}