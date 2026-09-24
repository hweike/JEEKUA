// app/api/docs/associated-products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/admin';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const docId = searchParams.get('docId');
  const locale = searchParams.get('locale') || 'zh';

  if (!docId) {
    return NextResponse.json({ error: 'Missing docId' }, { status: 400 });
  }

  try {
    // 1. 查询关联
    let associations: { product_id: string }[];
    try {
      associations = await sql<{ product_id: string }[]>`
        SELECT product_id FROM public.resource_product
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND resource_type = 'document'
          AND resource_id = ${docId}
        ORDER BY sort_order ASC
      `;
    } catch (assocError: any) {
      console.error('[API] Associations query error:', assocError);
      return NextResponse.json(
        { error: `Database error: ${assocError.message}` },
        { status: 500 }
      );
    }

    if (!associations || associations.length === 0) {
      return NextResponse.json({ products: [] });
    }

    const productIds = associations.map((a) => a.product_id);

    // 2. 查询产品详情
    let products: any[];
    try {
      products = await sql<any[]>`
        SELECT "productId", product_name, slug, main_image_url, price_tiers, currency, availability, min_order_quantity
        FROM public.products
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND locale = ${locale}
          AND "productId" IN ${sql(productIds)}
          AND parent_product_id IS NULL
      `;
    } catch (productError: any) {
      console.error('[API] Products query error:', productError);
      return NextResponse.json(
        { error: `Product query error: ${productError.message}` },
        { status: 500 }
      );
    }

    const parsedProducts = products.map((p) => ({
      ...p,
      price_tiers: typeof p.price_tiers === 'string'
        ? JSON.parse(p.price_tiers || '[]')
        : p.price_tiers || [],
    }));

    return NextResponse.json({ products: parsedProducts });
  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}