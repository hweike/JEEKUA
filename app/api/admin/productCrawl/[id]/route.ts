// app/api/admin/productCrawl/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

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

    const { data, error } = await supabase
      .from('crawler_products')
      .select('*')
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('crawler_id', id)
      .single();

    if (error) {
      console.error('❌ 查询错误:', error);
      return NextResponse.json(
        { error: '商品不存在: ' + error.message },
        { status: 404 }
      );
    }

    // 🔥 如果 sku_list 是字符串，解析为数组
    if (data.sku_list && typeof data.sku_list === 'string') {
      try {
        data.sku_list = JSON.parse(data.sku_list);
        console.log(`✅ 解析 sku_list: ${data.sku_list?.length || 0} 个变体`);
      } catch (e) {
        console.warn('⚠️ sku_list 解析失败，设置为空数组');
        data.sku_list = [];
      }
    } else if (!data.sku_list) {
      data.sku_list = [];
    }

    // 🔥 如果 price_tiers 是字符串，解析为数组
    if (data.price_tiers && typeof data.price_tiers === 'string') {
      try {
        data.price_tiers = JSON.parse(data.price_tiers);
      } catch (e) {
        console.warn('⚠️ price_tiers 解析失败');
        data.price_tiers = [];
      }
    }

    // 🔥 如果 additional_images 是字符串，解析为数组
    if (data.additional_images && typeof data.additional_images === 'string') {
      try {
        data.additional_images = JSON.parse(data.additional_images);
      } catch (e) {
        console.warn('⚠️ additional_images 解析失败');
        data.additional_images = [];
      }
    }

    // 🔥 如果 attributes 是字符串，解析为对象
    if (data.attributes && typeof data.attributes === 'string') {
      try {
        data.attributes = JSON.parse(data.attributes);
      } catch (e) {
        console.warn('⚠️ attributes 解析失败');
        data.attributes = {};
      }
    }

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
    console.log('📦 收到 sku_list 数量:', body.sku_list?.length || 0);

    // ============================================================
    // 1. 准备更新数据
    // ============================================================

    // 🔥 将 sku_list 转换为 JSON 字符串存储
    let skuListJson = null;
    if (body.sku_list && body.sku_list.length > 0) {
      try {
        skuListJson = JSON.stringify(body.sku_list);
        console.log(`📦 sku_list 已序列化: ${body.sku_list.length} 个变体`);
      } catch (e) {
        console.error('❌ sku_list 序列化失败:', e);
        skuListJson = JSON.stringify([]);
      }
    } else {
      skuListJson = JSON.stringify([]);
    }

    // 🔥 处理其他 JSON 字段
    let priceTiersJson = null;
    if (body.price_tiers) {
      try {
        priceTiersJson = typeof body.price_tiers === 'string' 
          ? body.price_tiers 
          : JSON.stringify(body.price_tiers);
      } catch (e) {
        priceTiersJson = JSON.stringify([]);
      }
    }

    let additionalImagesJson = null;
    if (body.additional_images) {
      try {
        additionalImagesJson = typeof body.additional_images === 'string'
          ? body.additional_images
          : JSON.stringify(body.additional_images);
      } catch (e) {
        additionalImagesJson = JSON.stringify([]);
      }
    }

    let attributesJson = null;
    if (body.attributes) {
      try {
        attributesJson = typeof body.attributes === 'string'
          ? body.attributes
          : JSON.stringify(body.attributes);
      } catch (e) {
        attributesJson = JSON.stringify({});
      }
    }

    const updateData: any = {
      product_name: body.product_name,
      sku: body.sku,
      brand: body.brand,
      price_tiers: priceTiersJson,
      currency: body.currency || 'USD',
      min_order_quantity: body.min_order_quantity || 1,
      main_image_url: body.main_image_url,
      additional_images: additionalImagesJson,
      description: body.description,
      short_description: body.short_description,
      attributes: attributesJson,
      slug: body.slug,
      availability: body.availability || 'in_stock',
      sku_list: skuListJson,  // 🔥 存储变体数据
      updated_at: new Date().toISOString()
    };

    // 移除 undefined 字段
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === null) {
        delete updateData[key];
      }
    });

    console.log('📦 更新数据:', {
      product_name: updateData.product_name,
      sku: updateData.sku,
      currency: updateData.currency,
      sku_list_length: body.sku_list?.length || 0
    });

    // ============================================================
    // 2. 执行更新
    // ============================================================

    const { data, error } = await supabase
      .from('crawler_products')
      .update(updateData)
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('crawler_id', id)
      .select();

    if (error) {
      console.error('❌ 更新错误:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: '商品不存在' },
        { status: 404 }
      );
    }

    console.log('✅ 更新成功');

    // ============================================================
    // 3. 返回结果（解析 JSON 字段）
    // ============================================================

    const result = data[0];
    
    // 解析 sku_list
    if (result.sku_list && typeof result.sku_list === 'string') {
      try {
        result.sku_list = JSON.parse(result.sku_list);
      } catch (e) {
        result.sku_list = [];
      }
    }

    // 解析 price_tiers
    if (result.price_tiers && typeof result.price_tiers === 'string') {
      try {
        result.price_tiers = JSON.parse(result.price_tiers);
      } catch (e) {
        result.price_tiers = [];
      }
    }

    // 解析 additional_images
    if (result.additional_images && typeof result.additional_images === 'string') {
      try {
        result.additional_images = JSON.parse(result.additional_images);
      } catch (e) {
        result.additional_images = [];
      }
    }

    // 解析 attributes
    if (result.attributes && typeof result.attributes === 'string') {
      try {
        result.attributes = JSON.parse(result.attributes);
      } catch (e) {
        result.attributes = {};
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: result
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

    const { data, error } = await supabase
      .from('crawler_products')
      .delete()
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('crawler_id', id)
      .select();

    if (error) {
      console.error('❌ 删除错误:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: '商品不存在' },
        { status: 404 }
      );
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