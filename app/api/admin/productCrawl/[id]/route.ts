// app/api/admin/productCrawl/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/admin';

const DEFAULT_SITE_ID = '000001';

// ============================================================
// GET - 获取单条采集数据
// ============================================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log('🔍 查询 crawler_id:', id);

    let data: any;
    try {
      const rows = await sql<any[]>`
        SELECT * FROM public.crawler_products
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND crawler_id = ${id}
        LIMIT 1
      `;
      data = rows[0];
    } catch (error: any) {
      console.error('❌ 查询错误:', error);
      return NextResponse.json(
        { error: '商品不存在: ' + error.message },
        { status: 404 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: '商品不存在' }, { status: 404 });
    }

    // 解析 JSON 字段（postgres 库自动反序列化 jsonb，但为兼容 text 类型保留兜底）
    const parseField = (val: any, fallback: any) => {
      if (val == null) return fallback;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return fallback; }
      }
      return val;
    };

    data.sku_list = parseField(data.sku_list, []);
    data.price_tiers = parseField(data.price_tiers, []);
    data.additional_images = parseField(data.additional_images, []);
    data.attributes = parseField(data.attributes, {});

    return NextResponse.json(data);
  } catch (error) {
    console.error('获取商品失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取失败' },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT - 更新采集数据
// ============================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    console.log('🔄 更新 crawler_id:', id);

    // 序列化 JSON 字段（crawler_products 里的 JSON 字段可能是 text 类型）
    const skuListJson = body.sku_list && body.sku_list.length > 0
      ? JSON.stringify(body.sku_list)
      : JSON.stringify([]);

    const priceTiersJson = body.price_tiers
      ? (typeof body.price_tiers === 'string' ? body.price_tiers : JSON.stringify(body.price_tiers))
      : null;

    const additionalImagesJson = body.additional_images
      ? (typeof body.additional_images === 'string' ? body.additional_images : JSON.stringify(body.additional_images))
      : null;

    const attributesJson = body.attributes
      ? (typeof body.attributes === 'string' ? body.attributes : JSON.stringify(body.attributes))
      : null;

    // 动态 SET
    const setClauses: any[] = [];
    if (body.product_name !== undefined) setClauses.push(sql`product_name = ${body.product_name}`);
    if (body.sku !== undefined) setClauses.push(sql`sku = ${body.sku}`);
    if (body.brand !== undefined) setClauses.push(sql`brand = ${body.brand}`);
    if (priceTiersJson !== null) setClauses.push(sql`price_tiers = ${priceTiersJson}`);
    if (body.currency !== undefined) setClauses.push(sql`currency = ${body.currency || 'USD'}`);
    if (body.min_order_quantity !== undefined) setClauses.push(sql`min_order_quantity = ${body.min_order_quantity || 1}`);
    if (body.main_image_url !== undefined) setClauses.push(sql`main_image_url = ${body.main_image_url}`);
    if (additionalImagesJson !== null) setClauses.push(sql`additional_images = ${additionalImagesJson}`);
    if (body.description !== undefined) setClauses.push(sql`description = ${body.description}`);
    if (body.short_description !== undefined) setClauses.push(sql`short_description = ${body.short_description}`);
    if (attributesJson !== null) setClauses.push(sql`attributes = ${attributesJson}`);
    if (body.slug !== undefined) setClauses.push(sql`slug = ${body.slug}`);
    if (body.availability !== undefined) setClauses.push(sql`availability = ${body.availability || 'in_stock'}`);
    setClauses.push(sql`sku_list = ${skuListJson}`);
    setClauses.push(sql`"updatedAt" = ${new Date().toISOString()}`);

    const setClause = setClauses.reduce(
      (acc, c, i) => (i === 0 ? c : sql`${acc}, ${c}`),
      sql``
    );

    let data: any;
    try {
      const rows = await sql<any[]>`
        UPDATE public.crawler_products
        SET ${setClause}
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND crawler_id = ${id}
        RETURNING *
      `;
      data = rows[0];
    } catch (error: any) {
      console.error('❌ 更新错误:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: '商品不存在' }, { status: 404 });
    }

    console.log('✅ 更新成功');

    // 解析 JSON 字段
    const parseField = (val: any, fallback: any) => {
      if (val == null) return fallback;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return fallback; }
      }
      return val;
    };

    data.sku_list = parseField(data.sku_list, []);
    data.price_tiers = parseField(data.price_tiers, []);
    data.additional_images = parseField(data.additional_images, []);
    data.attributes = parseField(data.attributes, {});

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('更新商品失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新失败' },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE - 删除采集数据
// ============================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log('🗑️ 删除 crawler_id:', id);

    let data: any[];
    try {
      data = await sql<any[]>`
        DELETE FROM public.crawler_products
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND crawler_id = ${id}
        RETURNING *
      `;
    } catch (error: any) {
      console.error('❌ 删除错误:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: '商品不存在' }, { status: 404 });
    }

    console.log('✅ 删除成功');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除商品失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除失败' },
      { status: 500 }
    );
  }
}