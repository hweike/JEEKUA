// app/api/admin/payment/orders/[id]/pay/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';  // ✅ 添加 supabase 导入
import { orderService } from '@/lib/payment/services/order.service';
import { accountService } from '@/lib/payment/services/account.service';
import { paypalService } from '@/lib/payment/services/paypal.service';
import { getSiteId } from '@/lib/utils/request';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // ✅ 改为 Promise
) {
  try {
    const { id } = await params;  // ✅ 使用 await
    const siteId = await getSiteId(request);
    const order = await orderService.getById(siteId, id);

    // ✅ 检查订单状态：正式订单（formal）且已发送（sent）才能支付
    if (order.status !== 'formal' || order.sent_status !== 'sent') {
      return NextResponse.json(
        { success: false, error: '当前订单状态不支持支付' },
        { status: 400 }
      );
    }

    // ✅ 检查支付方式：bank_transfer | qr_code | online_payment
    // PayPal 属于 online_payment
    if (order.payment_method !== 'online_payment') {
      return NextResponse.json(
        { success: false, error: '该订单不支持 PayPal 支付' },
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

    // 构建商品列表
    const items = order.items.map((item) => ({
      name: item.product_name,
      price: Number(item.price),
      quantity: item.quantity,
      sku: item.sku || undefined,
    }));

    // 构建回调 URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const returnUrl = `${baseUrl}/payment/success?order_id=${order.id}`;
    const cancelUrl = `${baseUrl}/payment/cancel?order_id=${order.id}`;

    // 创建 PayPal 订单
    const result = await paypalService.createOrder(
      paypalAccount,
      order.id,
      order.order_no,
      order.currency,
      Number(order.total_amount),
      items,
      returnUrl,
      cancelUrl
    );

    // ✅ 更新订单的 PayPal 订单 ID
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        paypal_order_id: result.paypalOrderId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('更新 PayPal 订单 ID 失败:', updateError);
    }

    return NextResponse.json({
      success: true,
      data: {
        paypalOrderId: result.paypalOrderId,
        approvalUrl: result.approvalUrl,
      },
    });
  } catch (error: any) {
    console.error('发起 PayPal 支付失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '发起支付失败' },
      { status: 500 }
    );
  }
}