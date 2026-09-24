// app/api/account/orders/route.ts
import { NextResponse } from 'next/server';
import { verifyCustomerToken, getCustomerById } from '@/lib/account/server';
import { orderService } from '@/lib/payment/services/order.service';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function GET(request: Request) {
  // 1. 拿 token
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. 验证 token
  const payload = await verifyCustomerToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    // 3. 拿客户信息
    const customer = await getCustomerById(payload.customerId);
    if (!customer?.email) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // 4. ✅ 调服务层（复用 slug 注入、items 分组、分页、状态过滤）
    const result = await orderService.listWithItems({
      site_id: DEFAULT_SITE_ID,
      buyer_email: customer.email,
      status: ['formal', 'paid', 'completed', 'cancelled', 'expired'],
      page: 1,
      page_size: 100,
    });

    return NextResponse.json({
      success: true,
      items: result.items || [],
      total: result.total || 0,
      page: result.page,
      page_size: result.page_size,
      total_pages: result.total_pages,
    });
  } catch (error: any) {
    console.error('GET /api/account/orders error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}