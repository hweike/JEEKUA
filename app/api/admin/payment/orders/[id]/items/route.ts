// app/api/admin/payment/orders/[id]/items/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { orderItemService } from '@/lib/payment/services/order-item.service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    await orderItemService.addItems(params.id, body.items);
    await orderItemService.recalculateOrderTotal(params.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '添加商品失败' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    await orderItemService.updateItem(body.itemId, body);
    await orderItemService.recalculateOrderTotal(params.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '更新商品失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const itemId = searchParams.get('itemId');
    if (!itemId) {
      return NextResponse.json({ error: 'itemId required' }, { status: 400 });
    }
    await orderItemService.deleteItem(itemId);
    await orderItemService.recalculateOrderTotal(params.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '删除商品失败' },
      { status: 500 }
    );
  }
}