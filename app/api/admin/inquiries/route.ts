import { NextResponse } from 'next/server';
import { getAllInquiries, getInquiryById, updateInquiryStatus } from '@/lib/CRM/repository';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (id) {
    const inquiry = getInquiryById(Number(id));
    if (!inquiry) {
      return NextResponse.json({ error: '询盘不存在' }, { status: 404 });
    }
    return NextResponse.json(inquiry);
  }

  const inquiries = getAllInquiries();
  return NextResponse.json(inquiries);
}

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 });
  }

  // 可选：从请求体中读取新状态，默认为“已联系”
  let newStatus = '已联系';
  try {
    const body = await request.json();
    if (body.status) newStatus = body.status;
  } catch {
    // 忽略，使用默认值
  }

  const success = updateInquiryStatus(Number(id), newStatus);
  if (success) {
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json({ error: '标记失败' }, { status: 500 });
  }
}