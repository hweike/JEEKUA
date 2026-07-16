// app/api/admin/inquiries/route.ts

import { NextResponse } from 'next/server';
import {
  getAllInquiriesWithCustomer,
  getInquiryWithDetails,
  updateInquiryStatus,
} from '@/lib/CRM/repository';

// ---------- GET ----------
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  try {
    if (id) {
      const result = await getInquiryWithDetails(Number(id));
      if (!result.inquiry) {
        return NextResponse.json({ error: '询盘不存在' }, { status: 404 });
      }
      return NextResponse.json(result);
    }

    const inquiries = await getAllInquiriesWithCustomer();
    return NextResponse.json(inquiries);
  } catch (error: any) {
    console.error('[GET /api/admin/inquiries] 错误:', error.message);
    return NextResponse.json(
      { error: error.message || '服务器内部错误' },
      { status: 500 }
    );
  }
}

// ---------- PATCH ----------
export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 });
  }

  let newStatus = '待处理';
  try {
    const body = await request.json();
    if (body.status) newStatus = body.status;
  } catch {
    // 忽略无法解析的 body
  }

  const validStatuses = ['待处理', '处理中', '已回复', '已关闭'];
  if (!validStatuses.includes(newStatus)) {
    return NextResponse.json({ error: '无效状态' }, { status: 400 });
  }

  try {
    // 先获取询盘信息以取出 site_id
    const { inquiry } = await getInquiryWithDetails(Number(id));
    if (!inquiry) {
      return NextResponse.json({ error: '询盘不存在' }, { status: 404 });
    }

    const success = await updateInquiryStatus(Number(id), newStatus, inquiry.site_id);

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: '更新失败，未找到该询盘或无权操作' }, { status: 404 });
    }
  } catch (error: any) {
    console.error('[PATCH /api/admin/inquiries] 更新异常:', error.message);
    return NextResponse.json(
      { error: error.message || '服务器内部错误' },
      { status: 500 }
    );
  }
}