// app/api/admin/payment/orders/[id]/shipping-records/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/admin';
import { getSiteId, getOperator } from '@/lib/utils/request';
import type { ShippingRecord } from '@/lib/payment/types/order';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const siteId = await getSiteId(request);
    const body = await request.json();
    const { shipping_records } = body;

    if (!shipping_records || !Array.isArray(shipping_records)) {
      return NextResponse.json(
        { success: false, error: 'shipping_records 必须是数组' },
        { status: 400 }
      );
    }

    // 1. 验证订单存在且状态为 completed
    let order: { status: string } | undefined;
    try {
      const rows = await sql<{ status: string }[]>`
        SELECT status FROM public.orders
        WHERE site_id = ${siteId}
          AND id = ${id}
        LIMIT 1
      `;
      order = rows[0];
    } catch (fetchError: any) {
      console.error('[PUT /shipping-records] 获取订单失败:', fetchError);
      return NextResponse.json(
        { success: false, error: '获取订单失败' },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        { success: false, error: '订单不存在' },
        { status: 404 }
      );
    }

    if (order.status !== 'completed') {
      return NextResponse.json(
        { success: false, error: '只有已完成订单可以修改发货信息' },
        { status: 400 }
      );
    }

    // 2. 更新 shipping_records（jsonb 类型）
    try {
      await sql`
        UPDATE public.orders
        SET shipping_records = ${sql.json(shipping_records)},
            updated_at = ${new Date().toISOString()}
        WHERE site_id = ${siteId}
          AND id = ${id}
      `;
    } catch (updateError: any) {
      console.error('[PUT /shipping-records] 更新失败:', updateError);
      return NextResponse.json(
        { success: false, error: '更新发货记录失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '发货记录已更新',
    });
  } catch (error: any) {
    console.error('PUT /api/admin/payment/orders/[id]/shipping-records error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '更新失败' },
      { status: 500 }
    );
  }
}