// app/api/admin/productCrawl/[id]/variants/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

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

    // 🔥 从父记录获取 sku_list
    const { data: parentData, error: parentError } = await supabase
      .from('crawler_products')
      .select('sku_list, currency')
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('crawler_id', id)
      .single();

    if (parentError) {
      console.error('❌ 查询父商品失败:', parentError);
      // 降级：尝试从独立变体记录查询
      return getVariantsFromRecords(id);
    }

    // 解析 sku_list
    let skuList = parentData.sku_list || [];
    if (typeof skuList === 'string') {
      try {
        skuList = JSON.parse(skuList);
        console.log(`[Variants API] 从 sku_list 解析变体: ${skuList.length} 个`);
      } catch (e) {
        console.warn('[Variants API] sku_list 解析失败');
        skuList = [];
      }
    }

    // 确保每个变体有必要的字段
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
      variants: variants,
      total: variants.length,
      source: 'sku_list'
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

    const { data, error } = await supabase
      .from('crawler_products')
      .select('*')
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('parent_product_id', parentId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ 查询变体错误:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const variants = (data || []).map((v: any) => {
      let priceTiers = v.price_tiers;
      if (typeof priceTiers === 'string') {
        try {
          priceTiers = JSON.parse(priceTiers);
        } catch (e) {
          priceTiers = [];
        }
      }
      
      let attributes = v.attributes;
      if (typeof attributes === 'string') {
        try {
          attributes = JSON.parse(attributes);
        } catch (e) {
          attributes = {};
        }
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
      variants: variants,
      total: variants.length,
      source: 'records'
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
      return NextResponse.json(
        { error: 'variants 必须是数组' },
        { status: 400 }
      );
    }

    // 准备保存的变体数据
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

    // 🔥 更新父记录的 sku_list
    const { data, error } = await supabase
      .from('crawler_products')
      .update({
        sku_list: JSON.stringify(variantsToSave),
        currency: displayCurrency || 'USD',
        updated_at: new Date().toISOString()
      })
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('crawler_id', id)
      .select();

    if (error) {
      console.error('❌ 更新变体失败:', error);
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

    console.log(`[Variants API] 更新成功: ${variantsToSave.length} 个变体`);

    return NextResponse.json({
      success: true,
      message: `成功更新 ${variantsToSave.length} 个变体`,
      count: variantsToSave.length,
      variants: variantsToSave,
      total: variantsToSave.length
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
      return NextResponse.json(
        { error: '缺少 variantId 参数' },
        { status: 400 }
      );
    }

    console.log('[Variants API] DELETE 变体, variantId:', variantId);

    // 获取当前 sku_list
    const { data: parentData, error: fetchError } = await supabase
      .from('crawler_products')
      .select('sku_list')
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('crawler_id', id)
      .single();

    if (fetchError) {
      console.error('获取父商品失败:', fetchError);
      return NextResponse.json(
        { error: '商品不存在' },
        { status: 404 }
      );
    }

    let skuList = parentData.sku_list || [];
    if (typeof skuList === 'string') {
      try {
        skuList = JSON.parse(skuList);
      } catch (e) {
        skuList = [];
      }
    }

    // 过滤掉要删除的变体
    const updatedSkuList = skuList.filter((v: any) => v.id !== variantId);

    if (updatedSkuList.length === skuList.length) {
      return NextResponse.json(
        { error: '变体不存在' },
        { status: 404 }
      );
    }

    // 更新 sku_list
    const { data, error } = await supabase
      .from('crawler_products')
      .update({
        sku_list: JSON.stringify(updatedSkuList),
        updated_at: new Date().toISOString()
      })
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('crawler_id', id)
      .select();

    if (error) {
      console.error('删除变体失败:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log(`[Variants API] 删除成功, 剩余 ${updatedSkuList.length} 个变体`);

    return NextResponse.json({
      success: true,
      message: '变体删除成功',
      remaining: updatedSkuList.length
    });

  } catch (error) {
    console.error('删除变体失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除失败' },
      { status: 500 }
    );
  }
}