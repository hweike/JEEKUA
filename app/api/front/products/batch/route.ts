// app/api/front/products/batch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getProductsForShowcase } from '@/lib/products/services/product.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ids, locale = 'zh' } = body as { ids: string[]; locale?: string };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const safeIds = ids.slice(0, 50);

    // ✅ 用轻量函数，只查索引表
    const products = await getProductsForShowcase(locale, safeIds);

    // ✅ 直接返回，格式已经匹配组件需求
    return NextResponse.json({ items: products });
  } catch (err) {
    console.error('[api/front/products/batch]', err);
    return NextResponse.json(
      { items: [], error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}