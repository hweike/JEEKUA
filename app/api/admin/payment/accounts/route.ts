// app/api/admin/payment/accounts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { accountService } from '@/lib/payment/services/account.service';
import { getSiteId, getOperator } from '@/lib/utils/request';

export async function GET(request: NextRequest) {
  try {
    const siteId = await getSiteId(request);
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || undefined;
    const method = searchParams.get('method') || undefined;
    // ✅ 修复：重命名变量避免与参数名冲突
    const accountTypeParam = searchParams.get('account_type') || undefined;

    const accounts = await accountService.list(siteId, { 
      type, 
      method, 
      account_type: accountTypeParam 
    });
    return NextResponse.json({ success: true, data: accounts });
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