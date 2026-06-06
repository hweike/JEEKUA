// app/api/admin/products/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { searchProducts } from '@/lib/products/indexDb';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const locale = searchParams.get('locale') || 'zh';
    const keyword = searchParams.get('keyword') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const status = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const size = Math.min(parseInt(searchParams.get('size') || '20', 10), 50);

    const { items, total } = await searchProducts(
      locale,
      status === 'all' ? undefined : status,
      keyword,
      categoryId || undefined,
      undefined, // seriesId
      page,
      size
    );

    const simplified = items.map(p => ({
      productId: p.productId,
      productName: p.product_name,
      sku: p.sku,
      mainImage: p.main_image_url,
      price: p.price_tiers?.[0]?.price,
      currency: p.currency,
    }));

    return NextResponse.json({ items: simplified, total, page, size });
  } catch (error) {
    console.error('[Product Search API]', error);
    return NextResponse.json({ error: '搜索失败' }, { status: 500 });
  }
}