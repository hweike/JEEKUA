// app/api/admin/litechat/admins/route.ts
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { supabase } from '@/lib/supabase/client';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const { data: admins, error } = await supabase
    .from('admin_users')
    .select('id, email, name, nickname, avatar_url, online_status')
    .order('name', { ascending: true });

  if (error) {
    console.error('获取管理员列表失败:', error);
    return NextResponse.json({ error: '获取管理员列表失败' }, { status: 500 });
  }

  return NextResponse.json(admins);
}