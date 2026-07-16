import { NextResponse } from 'next/server';
import { verifyCustomerToken } from '@/lib/account/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. 验证 token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = await verifyCustomerToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 2. 解析 id
    const { id } = await params;
    const inquiryId = Number(id);
    if (isNaN(inquiryId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // 3. 解析请求体
    const body = await request.json();
    const { content } = body;
    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 });
    }

    // 4. 验证询盘归属并获取客户信息（用于填充 sender 字段）
    const { data: inquiry, error: inqErr } = await supabase
      .from('inquiries')
      .select('customer_id, email, name')
      .eq('id', inquiryId)
      .eq('customer_id', payload.customerId)
      .maybeSingle();

    if (inqErr || !inquiry) {
      return NextResponse.json({ error: 'Inquiry not found or unauthorized' }, { status: 404 });
    }

    // 5. 插入回复
    const { data: reply, error: repErr } = await supabase
      .from('inquiry_replies')
      .insert({
        inquiry_id: inquiryId,
        site_id: '000001', // 若需要动态可传
        sender_type: 'user',
        sender_email: inquiry.email || 'user@example.com',
        sender_name: inquiry.name || '用户',
        customer_id: payload.customerId,
        content: content.trim(),
        is_internal: false,
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (repErr) {
      console.error('Insert reply error:', repErr);
      return NextResponse.json({ error: 'Failed to save reply' }, { status: 500 });
    }

    // 6. 可选：更新主表的 updated_at
    await supabase
      .from('inquiries')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', inquiryId);

    return NextResponse.json({ success: true, reply }, { status: 201 });
  } catch (error) {
    console.error('POST /api/account/inquiries/[id]/replies error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}