// app/api/payment/paypal/status/[orderId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { orderService } from '@/lib/payment/services/order.service';
import { accountService } from '@/lib/payment/services/account.service';
import { paypalService } from '@/lib/payment/services/paypal.service';
import { getSiteId } from '@/lib/utils/request';

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const siteId = await getSiteId(request);
    const order = await orderService.getById(siteId, params.orderId);

    if (!order.paypal_order_id) {
      return NextResponse.json(
        { success: false, error: '该订单未发起 PayPal 支付' },
        { status: 400 }
      );
    }

    // 获取 PayPal 账号配置
    const accounts = await accountService.list(siteId, {
      method: 'paypal',
    });

    const paypalAccount = accounts.find((acc) => acc.is_default) || accounts[0];
    if (!paypalAccount) {
      return NextResponse.json(
        { success: false, error: '未配置 PayPal 收款账号' },
        { status: 400 }
      );
    }

    // 查询 PayPal 订单状态
    const status = await paypalService.getOrderStatus(
      paypalAccount,
      order.paypal_order_id
    );

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        paypalOrderId: order.paypal_order_id,
        status,
        orderStatus: order.status,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '查询支付状态失败' },
      { status: 500 }
    );
  }
}