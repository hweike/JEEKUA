// app/api/docs/content/route.ts
import { NextRequest, NextResponse } from 'next/server';
import NodeCache from 'node-cache';
import { getCachedDocsLibBySlug, getCachedDocBySlug } from '@/lib/docs';
import sql from '@/lib/db/admin';

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
    // 1. 查询关联
    const associations = await sql<{ product_id: string }[]>`
      SELECT product_id FROM public.resource_product
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND resource_type = 'document'
        AND resource_id = ${docId}
      ORDER BY sort_order ASC
    `;

    if (!associations || associations.length === 0) {
      return [];
    }

    const productIds = associations.map((a) => a.product_id);

    // 2. 查询产品详情
    const products = await sql<any[]>`
      SELECT "productId", product_name, slug, main_image_url, price_tiers, currency, availability, min_order_quantity
      FROM public.products
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND locale = ${locale}
        AND "productId" IN ${sql(productIds)}
        AND parent_product_id IS NULL
    `;

    return products.map((p) => {
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