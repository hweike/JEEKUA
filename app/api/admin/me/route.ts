import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { findUserByEmail } from '@/lib/auth/users';

export async function GET() {
  const payload = await getCurrentUser();
  if (!payload) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  const user = await findUserByEmail(payload.username);
  if (!user) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  }
  return NextResponse.json({
    email: user.email,
    name: user.name,
    englishName: user.englishName,
    role: user.role,   // 关键：返回角色
  });
}