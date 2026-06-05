import { NextResponse } from 'next/server';
import { getAllInquiries, getInquiryById, updateInquiryStatus } from '@/lib/CRM/repository';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  try {
    if (id) {
      const inquiry = await getInquiryById(Number(id));
      if (!inquiry) {
        return NextResponse.json({ error: '询盘不存在' }, { status: 404 });
      }
      return NextResponse.json(inquiry);
    }

    const inquiries = await getAllInquiries();
    return NextResponse.json(inquiries);
  } catch (error) {
    console.error('GET /api/admin/inquiries error:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 });
  }

  let newStatus = '已联系';
  try {
    const body = await request.json();
    if (body.status) newStatus = body.status;
  } catch {
    // 忽略，使用默认值
  }

  try {
    const success = await updateInquiryStatus(Number(id), newStatus);
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: '标记失败' }, { status: 500 });
    }
  } catch (error) {
    console.error('PATCH /api/admin/inquiries error:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}