import { NextResponse } from 'next/server';
import { getActiveTheme } from '@/lib/theme-utils';

export async function GET() {
  const theme = await getActiveTheme(); // ✅ 添加 await
  return NextResponse.json(theme);
}

export async function PUT(request: Request) {
  // 只解析 body，但不需要持久化
  // 激活主题的持久化已由 /api/themes 的 PUT 完成
  await request.json(); // 消耗 body 避免未使用警告
  return NextResponse.json({ success: true });
}