// app/api/admin/logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { findUserByEmail } from '@/lib/auth/users';
import { getLogs } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const payload = await getCurrentUser(request);
  if (!payload) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const user = await findUserByEmail(payload.username);
  if (user?.role !== 'super') {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as 'login' | 'admin' | 'menu' | undefined;
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');

  const result = await getLogs({ type, startDate, endDate, page, limit });
  return NextResponse.json(result);
}