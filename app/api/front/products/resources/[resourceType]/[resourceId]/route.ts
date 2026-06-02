import { NextRequest, NextResponse } from 'next/server';
import { getAssociatedProducts } from '@/lib/products/resourceRelations';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resourceType: string; resourceId: string }> }
) {
  try {
    const { resourceType, resourceId } = await params;
    const products = await getAssociatedProducts(resourceType, resourceId);
    // 可添加额外字段（如价格、主图），已在数据库查询中获取
    return NextResponse.json(products);
  } catch (error) {
    console.error('[Frontend Resource Products]', error);
    return NextResponse.json({ error: '加载失败' }, { status: 500 });
  }
}