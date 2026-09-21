// app/api/admin/me/route.ts
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { findUserByEmail } from '@/lib/auth/users';

export async function GET() {
  try {
    const payload = await getCurrentUser();
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    if (!payload.username) {
      console.error('JWT payload missing username:', payload);
      return NextResponse.json({ error: 'Token 无效' }, { status: 401 });
    }

    const user = await findUserByEmail(payload.username);
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // ✅ 返回 id 字段
    return NextResponse.json({
      id: user.id,                    // ✅ 添加 id
      email: user.email,
      name: user.name,
      englishName: user.englishName,
      role: user.role,
    });
  } catch (error) {
    console.error('[/api/admin/me] 错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}