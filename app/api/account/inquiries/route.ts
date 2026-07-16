// app/api/account/inquiries/route.ts
import { NextResponse } from 'next/server';
import { createInquiryWithCustomer } from '@/lib/CRM/repository';
import { verifyCustomerToken } from '@/lib/account/server';
import { supabase } from '@/lib/supabase/client';

// 辅助：获取当前用户 ID
async function getCustomerIdFromRequest(request: Request): Promise<string> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('未登录');
  const token = authHeader.replace('Bearer ', '');
  const payload = await verifyCustomerToken(token);
  if (!payload || !payload.customerId) throw new Error('无效的登录凭证');
  return payload.customerId;
}

// ---------- GET：获取当前用户的所有询盘 ----------
export async function GET(request: Request) {
  try {
    const customerId = await getCustomerIdFromRequest(request);

    const { data, error } = await supabase
      .from('inquiries')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('GET /api/account/inquiries error:', error);
    return NextResponse.json(
      { error: error.message || '服务器内部错误' },
      { status: error.message === '未登录' ? 401 : 500 }
    );
  }
}

// ---------- POST：发起新询盘 ----------
export async function POST(request: Request) {
  try {
    const customerId = await getCustomerIdFromRequest(request);

    const body = await request.json();
    const { message, product_id } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: '询盘内容不能为空' }, { status: 400 });
    }

    const inquiry = await createInquiryWithCustomer({
      customer_id: customerId,
      message: message.trim(),
      product_id: product_id || undefined,
    });

    return NextResponse.json({ success: true, inquiry }, { status: 201 });
  } catch (error: any) {
    console.error('用户发起询盘失败:', error);
    return NextResponse.json(
      { error: error.message || '服务器内部错误' },
      { status: error.message === '未登录' ? 401 : 500 }
    );
  }
}