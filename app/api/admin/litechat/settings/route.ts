// app/api/admin/litechat/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdminSettings, updateAdminSettings } from '@/lib/litechat/services/admin-settings.service';
import { verifyAdminAuth, isAdminAuthSuccess } from '@/lib/auth/admin-check';

export async function GET() {
  const auth = await verifyAdminAuth();
  if (!isAdminAuthSuccess(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const settings = await getCurrentAdminSettings(auth.admin.id);
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await verifyAdminAuth();
  if (!isAdminAuthSuccess(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  try {
    const settings = await updateAdminSettings(auth.admin.id, body);
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}