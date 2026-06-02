import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { verifyPassword, hashPassword } from '@/lib/auth/password';
import { findUserByEmail, updatePassword } from '@/lib/auth/users';

export async function POST(request: NextRequest) {
  const userPayload = await getCurrentUser(request);
  if (!userPayload) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const { oldPassword, newPassword } = await request.json();
  if (!oldPassword || !newPassword) {
    return NextResponse.json({ error: '请填写完整信息' }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: '新密码长度至少6位' }, { status: 400 });
  }

  // 使用邮箱查找用户
  const user = await findUserByEmail(userPayload.username);
  if (!user) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  }

  const isValid = await verifyPassword(oldPassword, user.passwordHash);
  if (!isValid) {
    return NextResponse.json({ error: '旧密码错误' }, { status: 401 });
  }

  const newHash = await hashPassword(newPassword);
  await updatePassword(user.email, newHash);
  return NextResponse.json({ success: true });
}