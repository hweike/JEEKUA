// app/api/admin/log-menu/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { logMenuAccess } from '@/lib/logger';

export async function POST(request: NextRequest) {
  // 鉴权依然同步（很快）
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    const { path, menuName, userAgent } = await request.json();

    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded
      ? forwarded.split(',')[0].trim()
      : request.headers.get('x-real-ip') || 'unknown';
    const ua = userAgent || request.headers.get('user-agent') || 'unknown';

    // ✅ 关键：不 await，立刻返回
    logMenuAccess(user.username, path, menuName || path, ip, ua)
      .catch(err => console.error('[log-menu] 异步写入失败:', err));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[log-menu] 处理失败:', error);
    // 即使失败也不影响用户
    return NextResponse.json({ success: true });
  }
}