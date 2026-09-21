import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const docId = searchParams.get('docId');
  const locale = searchParams.get('locale') || 'zh';

  if (!docId) {
    return NextResponse.json({ error: 'Missing docId' }, { status: 400 });
  }

  try {
    // 使用 resource_product 表（根据你的实际表名）
    const { data: associations, error: assocError } = await supabase
      .from('resource_product')  // 改为你的实际表名
      .select('product_id')
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('resource_type', 'document')
      .eq('resource_id', docId)
      .order('sort_order', { ascending: true });

    if (assocError) {
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

    // 查询产品详情
    const { data: products, error: productError } = await supabase
      .from('products')
      .select(
        'productId, product_name, slug, main_image_url, price_tiers, currency, availability, min_order_quantity'
      )
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('locale', locale)
      .in('productId', productIds)
      .is('parent_product_id', null);

    if (productError) {
      console.error('[API] Products query error:', productError);
      return NextResponse.json(
        { error: `Product query error: ${productError.message}` },
        { status: 500 }
      );
    }

    const parsedProducts = (products || []).map((p) => ({
      ...p,
      price_tiers: JSON.parse(p.price_tiers || '[]'),
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