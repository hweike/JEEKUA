// app/api/admin/payment/orders/[id]/shipping-records/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
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

    // 验证订单存在且状态为 completed
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('status')
      .eq('site_id', siteId)
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
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

    // 更新 shipping_records
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        shipping_records,
        updated_at: new Date().toISOString(),
      })
      .eq('site_id', siteId)
      .eq('id', id);

    if (updateError) {
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