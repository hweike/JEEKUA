// app/api/admin/inquiries/[id]/replies/route.ts（简化版）
import { NextRequest, NextResponse } from 'next/server';
import { addReply, getInquiryWithDetails, updateInquiryStatus } from '@/lib/CRM/repository';
import { verifyAdminAuth, isAdminAuthSuccess } from '@/lib/auth/admin-check';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const inquiryId = Number(id);

  if (isNaN(inquiryId) || inquiryId <= 0) {
    return NextResponse.json({ error: '无效的询盘ID' }, { status: 400 });
  }

  const body = await request.json();
  const { content, is_internal } = body;

  if (!content || !content.trim()) {
    return NextResponse.json({ error: '内容不能为空' }, { status: 400 });
  }

  const auth = await verifyAdminAuth();
  if (!isAdminAuthSuccess(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const adminId = auth.admin.id;
  const adminEmail = auth.admin.email || 'admin@admin.com';
  const adminName = auth.admin.name || '管理员';

  const { inquiry } = await getInquiryWithDetails(inquiryId);
  if (!inquiry) {
    return NextResponse.json({ error: '询盘不存在' }, { status: 404 });
  }

  try {
    await addReply({
      inquiry_id: inquiryId,
      sender_type: 'admin',
      sender_email: adminEmail,
      sender_name: adminName,
      admin_id: Number(adminId),
      customer_id: inquiry.customer_id,
      content: content.trim(),
      is_internal: is_internal || false,
    });

    if (!is_internal) {
      try {
        await updateInquiryStatus(inquiryId, '已回复', inquiry.site_id);
      } catch (statusError) {
        console.warn(`自动更新状态失败 (inquiry ${inquiryId}):`, statusError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('回复失败:', error);
    return NextResponse.json({ error: '回复失败' }, { status: 500 });
  }
}