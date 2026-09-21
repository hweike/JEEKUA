// app/api/admin/payment/orders/share/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { orderService } from '@/lib/payment/services/order.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const order = await orderService.getByShareToken(params.token);
    
    if (!order) {
      return NextResponse.json(
        { error: '订单不存在或已失效' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '获取订单失败' },
      { status: 500 }
    );
  }
}