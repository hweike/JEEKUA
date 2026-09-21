// app/api/resources/[resourceType]/[resourceId]/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import NodeCache from 'node-cache';
import { supabase } from '@/lib/supabase/client';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

// 缓存 5 分钟
const relatedProductsCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ resourceType: string; resourceId: string }> }
) {
  const { resourceType, resourceId } = await params;
  const searchParams = req.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'zh';

  // 允许的资源类型
  const allowedTypes = ['blog', 'document', 'video'];
  if (!allowedTypes.includes(resourceType)) {
    return NextResponse.json({ error: 'Invalid resource type' }, { status: 400 });
  }

  const cacheKey = `related-products:${resourceType}:${resourceId}:${locale}`;

  // 1. 命中缓存
  const cached = relatedProductsCache.get<{ items: any[] }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': 'HIT',
      },
    });
  }

  // 2. 查库
  try {
    // 1. 从 resource_product 表查询关联的产品 ID 及排序
    const { data: relations, error: relError } = await supabase
      .from('resource_product')
      .select('product_id, sort_order')
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .order('sort_order', { ascending: true });

    if (relError) {
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

    // 2. 从 products 索引表获取产品详细信息（按 locale 过滤）
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('productId, product_name, main_image_url, slug, price_tiers, currency, sku')
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('locale', locale)          // ✅ 新增
      .in('productId', productIds);

    if (prodError) {
      console.error('查询 products 失败:', prodError);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    // 3. 按 sort_order 顺序组装结果，并生成价格显示
    const items = relations
      .map(rel => {
        const product = products?.find(p => p.productId === rel.product_id);
        if (!product) return null;

        let priceTiersArray: any[] = [];
        if (product.price_tiers) {
          try {
            priceTiersArray =
              typeof product.price_tiers === 'string'
                ? JSON.parse(product.price_tiers)
                : product.price_tiers;
          } catch (e) {
            console.error('解析 price_tiers 失败:', e);
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