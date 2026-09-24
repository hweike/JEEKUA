// app/api/admin/payment/accounts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { accountService } from '@/lib/payment/services/account.service';
import { getSiteId, getOperator } from '@/lib/utils/request';
// ✅ 新增类型 import
import type { PaymentType, PaymentMethodType, AccountType } from '@/lib/payment/types/account';

export async function GET(request: NextRequest) {
  try {
    const siteId = await getSiteId(request);
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || undefined;
    const method = searchParams.get('method') || undefined;
    const accountTypeParam = searchParams.get('account_type') || undefined;
    const isActiveParam = searchParams.get('is_active');

    // ✅ 用 as 断言解决类型不匹配
    const accounts = await accountService.list(siteId, { 
      type: type as PaymentType | undefined, 
      method: method as PaymentMethodType | undefined, 
      account_type: accountTypeParam as AccountType | 'null' | 'NULL' | undefined 
    });

    // ✅ 过滤 is_active
    const filtered = isActiveParam === 'true'
      ? accounts.filter((a: any) => a.is_active !== false)
      : isActiveParam === 'false'
        ? accounts.filter((a: any) => a.is_active === false)
        : accounts;

    return NextResponse.json({ success: true, data: filtered });
  } catch (error: any) {
    console.error('❌ GET /api/admin/payment/accounts 错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || '获取账号列表失败',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const siteId = await getSiteId(request);
    const body = await request.json();
    const operator = await getOperator(request);

    const account = await accountService.create(siteId, body, operator);
    return NextResponse.json({ success: true, data: account });
  } catch (error: any) {
    console.error('❌ POST /api/admin/payment/accounts 错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || '创建账号失败',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}