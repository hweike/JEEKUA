// app/api/admin/payment/orders/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { orderService } from '@/lib/payment/services/order.service';
import { getSiteId, getOperator } from '@/lib/utils/request';

// ==================== GET ====================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const siteId = await getSiteId(request);
    
    const order = await orderService.getById(siteId, id);
    return NextResponse.json({ success: true, data: order });
  } catch (error: any) {
    console.error('GET /api/admin/payment/orders/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取订单详情失败' },
      { status: 500 }
    );
  }
}

// ==================== PUT ====================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const siteId = await getSiteId(request);
    const body = await request.json();
    const operator = await getOperator(request);

    // ✅ 不再在 route 层重复计算金额，交给 service 层处理
    // 直接调用 service 层的 update 方法，它会处理金额计算
    const result = await orderService.update(siteId, id, body, operator);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    // ✅ 修复：使用保存的 id 或从 params 获取
    let idForLog: string;
    try {
      const { id } = await params;
      idForLog = id;
    } catch {
      idForLog = 'unknown';
    }
    
    console.error(`PUT /api/admin/payment/orders/${idForLog} error:`, error);
    
    // ✅ 处理不同的错误类型
    let statusCode = 500;
    let errorMessage = error.message || '更新订单失败';
    
    if (errorMessage.includes('只有草稿状态的订单可以编辑')) {
      statusCode = 400;
    } else if (errorMessage.includes('订单不存在')) {
      statusCode = 404;
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}

// ==================== DELETE ====================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let orderId: string | undefined;
  
  try {
    const { id } = await params;
    orderId = id;
    const siteId = await getSiteId(request);
    
    await orderService.delete(siteId, id);
    return NextResponse.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    // ✅ 使用保存的 orderId
    let idForLog = orderId;
    if (!idForLog) {
      try {
        const { id } = await params;
        idForLog = id;
      } catch {
        idForLog = 'unknown';
      }
    }
    
    console.error(`DELETE /api/admin/payment/orders/${idForLog} error:`, error);
    
    let statusCode = 500;
    let errorMessage = error.message || '删除订单失败';
    
    if (errorMessage.includes('不允许删除') || errorMessage.includes('当前状态')) {
      statusCode = 400;
    } else if (errorMessage.includes('不存在')) {
      statusCode = 404;
    } else if (errorMessage.includes('foreign key') || errorMessage.includes('关联')) {
      errorMessage = '订单存在关联数据，无法删除';
      statusCode = 409;
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}