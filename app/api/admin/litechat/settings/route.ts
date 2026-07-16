// app/api/admin/litechat/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdminSettings, updateAdminSettings } from '@/lib/litechat/services/admin-settings.service';
import { getCurrentUser } from '@/lib/auth/jwt';
import { supabase } from '@/lib/supabase/client';

async function verifyAdmin(request: Request) {
  const user = await getCurrentUser();
  if (!user) return { error: '未登录', status: 401 };
  const { data: admin } = await supabase
    .from('admin_users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();
  if (!admin) return { error: '无权访问', status: 403 };
  return admin;
}

// GET - 获取当前管理员设置
export async function GET(request: Request) {
  const admin = await verifyAdmin(request);
  if ('error' in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const settings = await getCurrentAdminSettings(admin.id);
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

// PUT - 更新设置
export async function PUT(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if ('error' in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const body = await request.json();
  try {
    const settings = await updateAdminSettings(admin.id, body);
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}