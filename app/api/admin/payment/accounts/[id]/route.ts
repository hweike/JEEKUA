// app/api/admin/payment/accounts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { accountService } from '@/lib/payment/services/account.service';
import { getSiteId, getOperator } from '@/lib/utils/request';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const siteId = await getSiteId(request);
    const account = await accountService.getById(siteId, id);
    return NextResponse.json({ success: true, data: account });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '获取账号详情失败' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const siteId = await getSiteId(request);
    const body = await request.json();
    const operator = await getOperator(request);

    const account = await accountService.update(siteId, id, body, operator);
    return NextResponse.json({ success: true, data: account });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '更新账号失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const siteId = await getSiteId(request);
    await accountService.delete(siteId, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '删除账号失败' },
      { status: 500 }
    );
  }
}