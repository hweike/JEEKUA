// app/api/admin/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/auth/password';
import { findUserByEmail } from '@/lib/auth/users';
import { setAuthCookie } from '@/lib/auth/jwt';
import { logLogin } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  // 增强 IP 获取逻辑
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() 
        : request.headers.get('x-real-ip') 
        || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  if (!email || !password) {
    await logLogin(email, ip, userAgent, false, '邮箱或密码为空');
    return NextResponse.json({ error: '邮箱和密码不能为空' }, { status: 400 });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    await logLogin(email, ip, userAgent, false, '用户不存在');
    return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    await logLogin(email, ip, userAgent, false, '密码错误');
    return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
  }

  await setAuthCookie(user.email, user.id);
  await logLogin(email, ip, userAgent, true, '登录成功');

  return NextResponse.json({
    success: true,
    mustChangePassword: user.mustChangePassword,
    name: user.name,
  });
}