import { NextRequest, NextResponse } from 'next/server';
import { getFilteredProducts, getProductsByProductLine } from '@/lib/products/indexDb';

export async function GET(request: NextRequest, { params }: { params: Promise<{ categoryId: string }> }) {
  const { categoryId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'zh';
  const isProductLine = searchParams.get('isProductLine') === 'true';
  const seriesId = searchParams.get('seriesId') || undefined;
  const availability = searchParams.get('availability') as 'in-stock' | 'out-of-stock' | null;
  const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined;
  const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined;
  const sortColumn = searchParams.get('sortColumn') || 'product_name';
  const sortOrder = (searchParams.get('sortOrder') as 'ASC' | 'DESC') || 'ASC';

  try {
    let items, total;
    if (isProductLine) {
      // 按产品线 ID 查询所有父产品
      const result = getProductsByProductLine(locale, categoryId, 1, 1000); // 可按需分页
      items = result.items;
      total = result.total;
    } else {
      // 原有按分类查询的逻辑
      const result = getFilteredProducts(
        locale, categoryId, seriesId, availability, minPrice, maxPrice, sortColumn, sortOrder
      );
      items = result.items;
      total = result.total;
    }
    return NextResponse.json({ items, total });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}