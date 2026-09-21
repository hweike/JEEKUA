// app/api/docs/content/route.ts
import { NextRequest, NextResponse } from 'next/server';
import NodeCache from 'node-cache';
import { getCachedDocsLibBySlug, getCachedDocBySlug } from '@/lib/docs';
import { supabase } from '@/lib/supabase/client';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

const docCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const libSlug = searchParams.get('libSlug');
  const docSlug = searchParams.get('docSlug');
  const locale = searchParams.get('locale') || 'zh';

  if (!libSlug || !docSlug) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  const cacheKey = `doc-content:${locale}:${libSlug}:${docSlug}`;

  const cached = docCache.get<any>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': 'HIT',
      },
    });
  }

  try {
    const library = await getCachedDocsLibBySlug(libSlug, locale);
    if (!library) {
      return NextResponse.json({ error: 'Library not found' }, { status: 404 });
    }

    const docData = await getCachedDocBySlug(locale, library.id, docSlug);
    if (!docData) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // ✅ 修复：docData 直接就是 { id, title, slug, content, seo_* }
    const docId = docData.id;
    const products = await getAssociatedProducts(docId, locale);

    const result = {
      doc: {
        id: docData.id,
        title: docData.title,
        slug: docData.slug,
        content: docData.content,
        seo_title: docData.seo_title || '',
        seo_description: docData.seo_description || '',
        seo_keywords: docData.seo_keywords || '',
        templateId: docData.templateId || null,
      },
      products,
    };

    docCache.set(cacheKey, result);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('[API] Failed to get document content:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getAssociatedProducts(docId: string, locale: string) {
  try {
    const { data: associations, error: assocError } = await supabase
      .from('resource_product')
      .select('product_id')
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('resource_type', 'document')
      .eq('resource_id', docId)
      .order('sort_order', { ascending: true });

    if (assocError || !associations || associations.length === 0) {
      return [];
    }

    const productIds = associations.map((a) => a.product_id);

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
      return [];
    }

    return (products || []).map((p) => {
      let priceTiers: any[] = [];
      if (p.price_tiers) {
        try {
          priceTiers =
            typeof p.price_tiers === 'string'
              ? JSON.parse(p.price_tiers)
              : p.price_tiers;
        } catch {
          priceTiers = [];
        }
      }
      return { ...p, price_tiers: priceTiers };
    });
  } catch (error) {
    console.error('[API] getAssociatedProducts error:', error);
    return [];
  }
}