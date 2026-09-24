// app/api/admin/payment/orders/share/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { orderService } from '@/lib/payment/services/order.service';
import { accountService } from '@/lib/payment/services/account.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }  // ✅ 改为 Promise 类型
) {
  try {
    // ✅ 使用 await 解包 params
    const { token } = await params;
    
    const order = await orderService.getByShareToken(token);

    if (!order) {
      return NextResponse.json(
        { error: '订单不存在或已失效' },
        { status: 404 }
      );
    }

    // ✅ 拿支付账号
    let accounts: any[] = [];
    try {
      const selectedIds = (order as any).selected_account_ids || [];

      if (selectedIds.length > 0) {
        for (const id of selectedIds) {
          try {
            const account = await accountService.getById(order.site_id, id);
            if (account) accounts.push(account);
          } catch (e) {
            console.warn('获取账号失败:', id, e);
          }
        }
      } else {
        const methodMap: Record<string, string> = {
          bank_transfer: 'tt',
          online_payment: 'paypal',
          qr_code: 'wechat',
        };
        const method = methodMap[order.payment_method] || 'tt';
        const accountList = await accountService.list(order.site_id, { method });
        if (accountList && accountList.length > 0) {
          const defaultAccount =
            accountList.find((a: any) => a.is_default) || accountList[0];
          accounts.push(defaultAccount);
        }
      }
    } catch (accError) {
      console.warn('获取支付账户失败:', accError);
    }

    return NextResponse.json({ success: true, data: order, accounts });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '获取订单失败' },
      { status: 500 }
    );
  }
}