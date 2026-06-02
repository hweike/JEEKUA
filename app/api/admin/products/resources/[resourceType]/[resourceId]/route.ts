import { NextRequest, NextResponse } from 'next/server';
import { getAssociatedProducts, updateResourceProducts } from '@/lib/products/resourceRelations';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resourceType: string; resourceId: string }> }
) {
  try {
    const { resourceType, resourceId } = await params;
    const products = await getAssociatedProducts(resourceType, resourceId);
    return NextResponse.json({ items: products, total: products.length });
  } catch (error) {
    console.error('[GET Resource Products]', error);
    return NextResponse.json({ error: '加载失败' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ resourceType: string; resourceId: string }> }
) {
  try {
    const { resourceType, resourceId } = await params;
    const { productIds } = await request.json();
    if (!Array.isArray(productIds)) {
      return NextResponse.json({ error: 'productIds must be an array' }, { status: 400 });
    }
    if (productIds.length > 10) {
      return NextResponse.json({ error: '最多关联10个产品' }, { status: 400 });
    }
    await updateResourceProducts(resourceType, resourceId, productIds);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PUT Resource Products]', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}