import { NextResponse } from 'next/server';
import { verifyCustomerToken } from '@/lib/account/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(
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

    // 3. 查询询盘（同时验证所有权）
    const { data: inquiry, error: inqErr } = await supabase
      .from('inquiries')
      .select('*')
      .eq('id', inquiryId)
      .eq('customer_id', payload.customerId)  // 直接过滤，避免二次检查
      .maybeSingle();

    if (inqErr || !inquiry) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    // 4. 查询回复
    const { data: replies, error: repErr } = await supabase
      .from('inquiry_replies')
      .select('*')
      .eq('inquiry_id', inquiryId)
      .order('created_at', { ascending: true });

    if (repErr) {
      console.error('Replies fetch error:', repErr);
      return NextResponse.json({ error: 'Failed to fetch replies' }, { status: 500 });
    }

    return NextResponse.json({ inquiry, replies: replies || [] });
  } catch (error) {
    console.error('GET /api/account/inquiries/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}