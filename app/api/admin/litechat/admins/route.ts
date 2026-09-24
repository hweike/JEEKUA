// app/api/admin/litechat/admins/route.ts
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import sql from '@/lib/db/admin';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const admins = await sql<any[]>`
      SELECT id, email, name, nickname, avatar_url, online_status
      FROM public.admin_users
      ORDER BY name ASC
    `;
    return NextResponse.json(admins);
  } catch (error) {
    console.error('获取管理员列表失败:', error);
    return NextResponse.json({ error: '获取管理员列表失败' }, { status: 500 });
  }
}