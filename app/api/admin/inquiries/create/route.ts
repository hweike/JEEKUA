// app/api/admin/inquiries/create/route.ts
import { NextResponse } from 'next/server';
import { createAdminInquiry } from '@/lib/CRM/repository';

async function getAdminId(): Promise<number | null> {
  return 1; // 示例
}

export async function POST(request: Request) {
  const body = await request.json();
  const { customer_id, message, product_id } = body;

  if (!customer_id || !message) {
    return NextResponse.json({ error: '客户ID和内容为必填' }, { status: 400 });
  }

  const adminId = await getAdminId();
  if (!adminId) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    const inquiry = await createAdminInquiry({
      customer_id,
      message,
      product_id,
      admin_id: adminId,
    });
    return NextResponse.json(inquiry, { status: 201 });
  } catch (error: any) {
    console.error('管理员发起询盘失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}