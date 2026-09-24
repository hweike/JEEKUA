// app/api/resources/[resourceType]/[resourceId]/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import NodeCache from 'node-cache';
import sql from '@/lib/db/admin';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

const relatedProductsCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ resourceType: string; resourceId: string }> }
) {
  const { resourceType, resourceId } = await params;
  const searchParams = req.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'zh';

  const allowedTypes = ['blog', 'document', 'video'];
  if (!allowedTypes.includes(resourceType)) {
    return NextResponse.json({ error: 'Invalid resource type' }, { status: 400 });
  }

  const cacheKey = `related-products:${resourceType}:${resourceId}:${locale}`;

  // 1. 缓存
  const cached = relatedProductsCache.get<{ items: any[] }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': 'HIT',
      },
    });
  }

  try {
    // 1. 查询关联的产品 ID
    let relations: { product_id: string; sort_order: number }[];
    try {
      relations = await sql<{ product_id: string; sort_order: number }[]>`
        SELECT product_id, sort_order FROM public.resource_product
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND resource_type = ${resourceType}
          AND resource_id = ${resourceId}
        ORDER BY sort_order ASC
      `;
    } catch (relError: any) {
      console.error('查询 resource_product 失败:', relError);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    if (!relations || relations.length === 0) {
      const emptyResult = { items: [] };
      relatedProductsCache.set(cacheKey, emptyResult);
      return NextResponse.json(emptyResult, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'X-Cache': 'MISS',
        },
      });
    }

    const productIds = relations.map(r => r.product_id);

    // 2. 查询产品详情
    let products: any[];
    try {
      products = await sql<any[]>`
        SELECT "productId", product_name, main_image_url, slug, price_tiers, currency, sku
        FROM public.products
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND locale = ${locale}
          AND "productId" IN ${sql(productIds)}
      `;
    } catch (prodError: any) {
      console.error('查询 products 失败:', prodError);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    // 3. 组装
    const items = relations
      .map(rel => {
        const product = products.find(p => p.productId === rel.product_id);
        if (!product) return null;

        let priceTiersArray: any[] = [];
        if (product.price_tiers) {
          try {
            priceTiersArray = typeof product.price_tiers === 'string'
              ? JSON.parse(product.price_tiers)
              : product.price_tiers;
          } catch {
            priceTiersArray = [];
          }
        }

        let priceDisplay = '价格面议';
        if (Array.isArray(priceTiersArray) && priceTiersArray.length > 0) {
          const firstTier = priceTiersArray[0];
          const price = firstTier?.price;
          if (price !== undefined && price !== null && price !== '') {
            const currency = product.currency || 'CNY';
            priceDisplay = `${price} ${currency}`;
            if (priceTiersArray.length > 1) {
              priceDisplay = `${price} ${currency} 起`;
            }
          }
        }

        return {
          id: product.productId,
          name: product.product_name,
          image: product.main_image_url,
          slug: product.slug,
          sku: product.sku,
          priceDisplay,
          sortOrder: rel.sort_order,
        };
      })
      .filter(item => item !== null);

    const result = { items };
    relatedProductsCache.set(cacheKey, result);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error(`获取资源 ${resourceType}/${resourceId} 关联产品失败:`, error);
    return NextResponse.json({ error: '内部服务器错误' }, { status: 500 });
  }
}