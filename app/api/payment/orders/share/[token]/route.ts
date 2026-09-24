// app/api/payment/orders/share/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { orderService } from '@/lib/payment/services/order.service';
import { accountService } from '@/lib/payment/services/account.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    const order = await orderService.getByShareToken(token);

    if (!order) {
      return NextResponse.json(
        { error: '订单不存在或已失效' },
        { status: 404 }
      );
    }

    // ✅ 获取支付账号
    let accounts: any[] = [];
    try {
      const selectedIds = (order as any).selected_account_ids || [];

      if (selectedIds.length > 0) {
        // ✅ 订单已指定账号，获取所有选中的账号
        for (const id of selectedIds) {
          try {
            const account = await accountService.getById(order.site_id, id);
            if (account) accounts.push(account);
          } catch (e) {
            console.warn('获取账号失败:', id, e);
          }
        }
      } else {
        // ✅ 订单未指定账号，根据支付方式获取默认账号
        const methodMap: Record<string, string[]> = {
          bank_transfer: ['tt'],
          online_payment: ['paypal'],
          qr_code: ['wechat', 'alipay'],  // ✅ QR Code 支持微信和支付宝
        };
        const methods = methodMap[order.payment_method] || ['tt'];
        
        // 获取所有匹配的账号
        for (const method of methods) {
          try {
            const accountList = await accountService.list(order.site_id, { method });
            if (accountList && accountList.length > 0) {
              // 优先使用默认账号，否则使用第一个
              const defaultAccount = accountList.find((a: any) => a.is_default) || accountList[0];
              accounts.push(defaultAccount);
            }
          } catch (e) {
            console.warn(`获取 ${method} 账号失败:`, e);
          }
        }
      }
    } catch (accError) {
      console.warn('获取支付账户失败:', accError);
    }

    return NextResponse.json({ success: true, data: order, accounts });
  } catch (error: any) {
    console.error('[API] 获取分享订单失败:', error);
    return NextResponse.json(
      { error: error.message || '获取订单失败' },
      { status: 500 }
    );
  }
}