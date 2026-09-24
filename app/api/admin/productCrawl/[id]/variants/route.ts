// app/api/admin/productCrawl/[id]/variants/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/admin';

const DEFAULT_SITE_ID = '000001';

// ============================================================
// GET - 从 sku_list 字段读取变体
// ============================================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log('[Variants API] GET 变体, parentId:', id);

    // 从父记录获取 sku_list
    let parentData: { sku_list: any; currency: string | null } | undefined;
    try {
      const rows = await sql<{ sku_list: any; currency: string | null }[]>`
        SELECT sku_list, currency FROM public.crawler_products
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND crawler_id = ${id}
        LIMIT 1
      `;
      parentData = rows[0];
    } catch (parentError: any) {
      console.error('❌ 查询父商品失败:', parentError);
      return getVariantsFromRecords(id);
    }

    if (!parentData) {
      return getVariantsFromRecords(id);
    }

    // 解析 sku_list
    let skuList = parentData.sku_list || [];
    if (typeof skuList === 'string') {
      try {
        skuList = JSON.parse(skuList);
        console.log(`[Variants API] 从 sku_list 解析变体: ${skuList.length} 个`);
      } catch {
        console.warn('[Variants API] sku_list 解析失败');
        skuList = [];
      }
    }

    const variants = skuList.map((v: any, idx: number) => ({
      id: v.id || v.sku_code || `variant_${idx}`,
      name: v.name || '变体',
      price: v.price || null,
      currency: v.currency || parentData.currency || 'USD',
      stock: v.stock || 0,
      sku_code: v.sku_code || '',
      attributes: v.attributes || {},
      image_url: v.image_url || '',
    }));

    console.log('[Variants API] 返回变体数量:', variants.length);

    return NextResponse.json({
      variants,
      total: variants.length,
      source: 'sku_list',
    });
  } catch (error) {
    console.error('获取变体失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取失败' },
      { status: 500 }
    );
  }
}

// ============================================================
// 降级方案：从独立变体记录查询
// ============================================================
async function getVariantsFromRecords(parentId: string) {
  try {
    console.log('[Variants API] 降级: 从独立变体记录查询, parentId:', parentId);

    let data: any[];
    try {
      data = await sql<any[]>`
        SELECT * FROM public.crawler_products
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND parent_product_id = ${parentId}
        ORDER BY created_at ASC
      `;
    } catch (error: any) {
      console.error('❌ 查询变体错误:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const variants = data.map((v: any) => {
      let priceTiers = v.price_tiers;
      if (typeof priceTiers === 'string') {
        try { priceTiers = JSON.parse(priceTiers); } catch { priceTiers = []; }
      }

      let attributes = v.attributes;
      if (typeof attributes === 'string') {
        try { attributes = JSON.parse(attributes); } catch { attributes = {}; }
      }

      return {
        id: v.crawler_id,
        name: v.product_name || '变体',
        price: priceTiers?.[0]?.price || null,
        currency: v.currency || 'USD',
        stock: v.min_order_quantity || 0,
        sku_code: v.sku || '',
        attributes: attributes || {},
        image_url: v.main_image_url || '',
      };
    });

    console.log('[Variants API] 降级返回变体数量:', variants.length);

    return NextResponse.json({
      variants,
      total: variants.length,
      source: 'records',
    });
  } catch (error) {
    console.error('降级查询变体失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取失败' },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT - 更新 sku_list
// ============================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { variants, displayCurrency } = body;

    console.log('[Variants API] PUT 更新变体, parentId:', id);
    console.log('[Variants API] 变体数量:', variants?.length || 0);

    if (!variants || !Array.isArray(variants)) {
      return NextResponse.json({ error: 'variants 必须是数组' }, { status: 400 });
    }

    const variantsToSave = variants.map((v: any) => ({
      id: v.id || `variant_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: v.name || '变体',
      price: v.price || 0,
      currency: v.currency || displayCurrency || 'USD',
      stock: v.stock || 0,
      sku_code: v.sku_code || '',
      attributes: v.attributes || {},
      image_url: v.image_url || '',
    }));

    let data: any[];
    try {
      data = await sql<any[]>`
        UPDATE public.crawler_products
        SET sku_list = ${JSON.stringify(variantsToSave)},
            currency = ${displayCurrency || 'USD'},
            "updatedAt" = ${new Date().toISOString()}
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND crawler_id = ${id}
        RETURNING *
      `;
    } catch (error: any) {
      console.error('❌ 更新变体失败:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: '商品不存在' }, { status: 404 });
    }

    console.log(`[Variants API] 更新成功: ${variantsToSave.length} 个变体`);

    return NextResponse.json({
      success: true,
      message: `成功更新 ${variantsToSave.length} 个变体`,
      count: variantsToSave.length,
      variants: variantsToSave,
      total: variantsToSave.length,
    });
  } catch (error) {
    console.error('[Variants API] PUT 错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新失败' },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE - 从 sku_list 中删除变体
// ============================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const url = new URL(request.url);
    const variantId = url.searchParams.get('variantId');

    if (!variantId) {
      return NextResponse.json({ error: '缺少 variantId 参数' }, { status: 400 });
    }

    console.log('[Variants API] DELETE 变体, variantId:', variantId);

    let parentData: { sku_list: any } | undefined;
    try {
      const rows = await sql<{ sku_list: any }[]>`
        SELECT sku_list FROM public.crawler_products
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND crawler_id = ${id}
        LIMIT 1
      `;
      parentData = rows[0];
    } catch (fetchError: any) {
      console.error('获取父商品失败:', fetchError);
      return NextResponse.json({ error: '商品不存在' }, { status: 404 });
    }

    if (!parentData) {
      return NextResponse.json({ error: '商品不存在' }, { status: 404 });
    }

    let skuList = parentData.sku_list || [];
    if (typeof skuList === 'string') {
      try { skuList = JSON.parse(skuList); } catch { skuList = []; }
    }

    const updatedSkuList = skuList.filter((v: any) => v.id !== variantId);

    if (updatedSkuList.length === skuList.length) {
      return NextResponse.json({ error: '变体不存在' }, { status: 404 });
    }

    try {
      await sql`
        UPDATE public.crawler_products
        SET sku_list = ${JSON.stringify(updatedSkuList)},
            "updatedAt" = ${new Date().toISOString()}
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND crawler_id = ${id}
      `;
    } catch (error: any) {
      console.error('删除变体失败:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[Variants API] 删除成功, 剩余 ${updatedSkuList.length} 个变体`);

    return NextResponse.json({
      success: true,
      message: '变体删除成功',
      remaining: updatedSkuList.length,
    });
  } catch (error) {
    console.error('删除变体失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除失败' },
      { status: 500 }
    );
  }
}