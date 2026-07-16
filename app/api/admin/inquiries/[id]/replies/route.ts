// app/api/admin/inquiries/[id]/replies/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { addReply, getInquiryWithDetails, updateInquiryStatus } from '@/lib/CRM/repository';
import { getCurrentUser } from '@/lib/auth/jwt';
import { supabase } from '@/lib/supabase/client';

// 从 admin_users 表查询管理员信息
async function getAdminInfo(userId: string) {
  const { data, error } = await supabase
    .from('admin_users')
    .select('email, name')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('查询管理员信息失败:', error);
    return null;
  }
  return data;
}

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

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const adminId = user.id;
  const adminInfo = await getAdminInfo(adminId);
  let adminEmail = adminInfo?.email || user.email || 'admin@admin.com';
  let adminName = adminInfo?.name || user.name || '管理员';

  if (!adminInfo && (!user.email || !user.name)) {
    console.warn(`管理员 ${adminId} 信息不完整，使用默认值 (email: ${adminEmail}, name: ${adminName})`);
  }

  const { inquiry } = await getInquiryWithDetails(inquiryId);
  if (!inquiry) {
    return NextResponse.json({ error: '询盘不存在' }, { status: 404 });
  }

  try {
    // 1. 添加回复（核心操作）
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

    // 2. 如果是非内部回复，尝试自动更新状态为“已回复”
    //    即使失败也不影响回复成功，只记录日志
    if (!is_internal) {
      try {
        await updateInquiryStatus(inquiryId, '已回复', inquiry.site_id);
      } catch (statusError) {
        console.warn(`自动更新状态失败 (inquiry ${inquiryId}):`, statusError);
        // 不抛出，继续返回成功
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('回复失败:', error);
    return NextResponse.json({ error: '回复失败' }, { status: 500 });
  }
}