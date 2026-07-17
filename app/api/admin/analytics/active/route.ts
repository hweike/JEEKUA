// app/api/admin/analytics/active/route.ts

import { NextResponse } from 'next/server';
import { getActiveVisitors } from '@/lib/umami';

export async function GET() {
  try {
    const data = await getActiveVisitors();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Analytics API] 获取实时在线失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器内部错误' },
      { status: 500 }
    );
  }
}