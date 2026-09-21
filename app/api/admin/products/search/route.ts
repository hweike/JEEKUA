import { NextRequest, NextResponse } from 'next/server';
import NodeCache from 'node-cache';
import { searchProducts } from '@/lib/products/indexDb';

const searchCache = new NodeCache({ stdTTL: 60, checkperiod: 30 });

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const locale = searchParams.get('locale') || 'zh';
    const keyword = searchParams.get('keyword') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const seriesId = searchParams.get('seriesId') || '';
    const status = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const size = Math.min(parseInt(searchParams.get('size') || '20', 10), 50);

    const cacheKey = `search:${locale}:${status}:${keyword}:${categoryId}:${seriesId}:${page}:${size}`;
    const cached = searchCache.get<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'X-Cache': 'HIT' },
      });
    }

    const { items, total } = await searchProducts(
      locale,
      status === 'all' ? undefined : status,
      keyword,
      categoryId || undefined,
      seriesId || undefined,  // ✅ 修 bug
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

    const result = { items: simplified, total, page, size };
    searchCache.set(cacheKey, result);

    return NextResponse.json(result, {
      headers: { 'X-Cache': 'MISS' },
    });
  } catch (error) {
    console.error('[Product Search API]', error);
    return NextResponse.json({ error: '搜索失败' }, { status: 500 });
  }
}