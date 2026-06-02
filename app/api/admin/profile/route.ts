import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { findUserByEmail, updateUserProfile } from '@/lib/auth/users';

export async function PUT(request: NextRequest) {
  const payload = await getCurrentUser();
  if (!payload) return NextResponse.json({ error: '未授权' }, { status: 401 });
  
  const { name, englishName, email } = await request.json();
  if (!name || !englishName || !email) {
    return NextResponse.json({ error: '缺少必要字段' }, { status: 400 });
  }
  
  const currentUser = await findUserByEmail(payload.username);
  if (!currentUser) return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  
  const result = await updateUserProfile(currentUser.email, { name, englishName, email });
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  
  // 如果邮箱被修改，需要更新 JWT 中的 username
  if (email !== currentUser.email) {
    const { setAuthCookie } = await import('@/lib/auth/jwt');
    await setAuthCookie(email, currentUser.id);
  }
  
  return NextResponse.json({ success: true });
}