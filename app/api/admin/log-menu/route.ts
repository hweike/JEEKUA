// app/api/admin/log-menu/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { logMenuAccess } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  const { path, menuName, userAgent } = await request.json();

  // 增强 IP 获取逻辑（从请求头直接获取，不依赖前端传递）
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() 
        : request.headers.get('x-real-ip') 
        || 'unknown';
  const ua = userAgent || request.headers.get('user-agent') || 'unknown';

  await logMenuAccess(user.username, path, menuName || path, ip, ua);
  return NextResponse.json({ success: true });
}