// app/api/productCrawl/collection/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import type { ProductCrawlData } from '@/lib/productCrawl/types';
import { saveCrawledProduct } from '@/lib/productCrawl/services/collection.service';

const DEFAULT_SITE_ID = '000001';

// ============================================================
// POST - 写入采集数据到临时表（每个产品只创建 1 条记录）
// ============================================================

export async function POST(request: NextRequest) {
  try {
    // 1. 验证 Token
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { 
          success: false, 
          error: '缺少认证 Token，请先登录独立站获取 Token' 
        },
        { status: 401 }
      );
    }

    const { data: user, error: userError } = await supabase
      .from('admin_users')
      .select('id, api_token_expires_at')
      .eq('api_token', token)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token 无效，请重新获取' 
        },
        { status: 401 }
      );
    }

    if (user.api_token_expires_at && new Date(user.api_token_expires_at) < new Date()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token 已过期，请重新获取' 
        },
        { status: 401 }
      );
    }

    // 2. 解析请求体
    const body = await request.json();
    const products: ProductCrawlData[] = Array.isArray(body) ? body : [body];

    if (products.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有数据' },
        { status: 400 }
      );
    }

    // 3. 验证必填字段
    const missingFields: string[] = [];
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (!p.platform) missingFields.push(`[${i}] platform`);
      if (!p.source_url) missingFields.push(`[${i}] source_url`);
      if (!p.sku) missingFields.push(`[${i}] sku`);
      if (!p.product_name) missingFields.push(`[${i}] product_name`);
    }

    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `缺少必填字段: ${missingFields.join(', ')}`,
          missingFields 
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const results: Array<{
      sku: string;
      source_url: string;
      status: 'saved' | 'exists' | 'failed';
      message: string;
      crawler_id?: string;
    }> = [];

    // 4. 🔥 辅助函数：插入单条记录（变体存储在 sku_list JSON 字段中）
    async function insertProductRecord(productData: any, crawlerId: string, productId: string) {
      return await supabase
        .from('crawler_products')
        .insert({
          crawler_id: crawlerId,
          site_id: DEFAULT_SITE_ID,
          product_id: productId,
          parent_product_id: productData.parent_product_id || null,
          sku: productData.sku,
          sku_list: productData.sku_list || [],
          product_name: productData.product_name,
          brand: productData.brand || '',
          price_tiers: productData.price_tiers || [],
          currency: productData.currency || 'USD',
          availability: productData.availability || 'in_stock',
          min_order_quantity: productData.min_order_quantity || 1,
          main_image_url: productData.main_image_url || '',
          additional_images: productData.additional_images || [],
          description: productData.description || '',
          short_description: productData.short_description || '',
          attributes: productData.attributes || {},
          spec_text: productData.spec_text || '',
          slug: productData.slug || '',
          status: 'draft',
          template_id: productData.templateId || '',
          platform: productData.platform,
          source_url: productData.source_url,
          source_product_id: productData.source_product_id || '',
          collected_at: productData.collected_at || now,
          collected_by: productData.collected_by || 'plugin',
          import_status: 'pending',
          updated_at: now,
          created_at: now,
        });
    }

    // 5. 🔥 逐条处理 - 每个产品只创建 1 条记录
    for (const product of products) {
      try {
        // 去重检查（基于 source_url）
        const { data: existing, error: checkError } = await supabase
          .from('crawler_products')
          .select('crawler_id, import_status')
          .eq('site_id', DEFAULT_SITE_ID)
          .eq('source_url', product.source_url)
          .maybeSingle();

        if (checkError) {
          console.warn('去重检查失败:', checkError.message);
        }

        if (existing) {
          results.push({
            sku: product.sku,
            source_url: product.source_url,
            status: 'exists',
            message: `该商品已采集，状态: ${existing.import_status === 'pending' ? '待导入' : '已导入'}`,
            crawler_id: existing.crawler_id
          });
          continue;
        }

        const variants = product.sku_list || [];

        // 🔥 生成唯一 ID
        const crawlerId = `crawl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const productId = product.productId || `imported_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        // 🔥 构建要插入的数据 - 只创建 1 条记录，变体存储在 sku_list 中
        const recordData = {
          ...product,
          parent_product_id: product.parent_product_id || null,
          sku_list: variants,  // 🔥 所有变体都在这个 JSON 字段中
        };

        const { error: insertError } = await insertProductRecord(
          recordData,
          crawlerId,
          productId
        );

        if (insertError) {
          console.error('插入失败:', insertError);
          results.push({
            sku: product.sku,
            source_url: product.source_url,
            status: 'failed',
            message: `保存失败: ${insertError.message}`
          });
          continue;
        }

        results.push({
          sku: product.sku,
          source_url: product.source_url,
          status: 'saved',
          message: variants.length > 0 
            ? `✅ 已存入，包含 ${variants.length} 个变体（存储在 sku_list 中）`
            : '已存入临时库，等待管理员审核导入',
          crawler_id: crawlerId
        });

      } catch (err) {
        console.error('处理商品失败:', err);
        results.push({
          sku: product.sku,
          source_url: product.source_url,
          status: 'failed',
          message: err instanceof Error ? err.message : '未知错误'
        });
      }
    }

    // 6. 统计结果
    const saved = results.filter(r => r.status === 'saved').length;
    const exists = results.filter(r => r.status === 'exists').length;
    const failed = results.filter(r => r.status === 'failed').length;

    return NextResponse.json({
      success: failed === 0,
      total: products.length,
      saved,
      exists,
      failed,
      results,
      message: failed === 0 
        ? `✅ 成功 ${saved} 条${exists > 0 ? `，${exists} 条已存在` : ''}`
        : `⚠️ 成功 ${saved} 条${exists > 0 ? `，${exists} 条已存在` : ''}，${failed} 条失败`
    });

  } catch (error) {
    console.error('保存采集数据失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '保存失败，请稍后重试' 
      },
      { status: 500 }
    );
  }
}

// ============================================================
// GET - 查询采集数据
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, error: '缺少认证 Token' },
        { status: 401 }
      );
    }

    const { data: user, error: userError } = await supabase
      .from('admin_users')
      .select('id, api_token_expires_at')
      .eq('api_token', token)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Token 无效' },
        { status: 401 }
      );
    }

    if (user.api_token_expires_at && new Date(user.api_token_expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Token 已过期' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const sourceUrl = searchParams.get('sourceUrl');
    const limit = parseInt(searchParams.get('limit') || '10');

    let query = supabase
      .from('crawler_products')
      .select('*')
      .eq('site_id', DEFAULT_SITE_ID)
      .order('collected_at', { ascending: false })
      .limit(Math.min(limit, 100));

    if (sourceUrl) {
      query = query.eq('source_url', sourceUrl);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    // 🔥 解析 JSON 字段
    const items = (data || []).map((item: any) => {
      // 解析 sku_list
      if (item.sku_list && typeof item.sku_list === 'string') {
        try {
          item.sku_list = JSON.parse(item.sku_list);
        } catch (e) {
          item.sku_list = [];
        }
      }
      
      // 解析 price_tiers
      if (item.price_tiers && typeof item.price_tiers === 'string') {
        try {
          item.price_tiers = JSON.parse(item.price_tiers);
        } catch (e) {
          item.price_tiers = [];
        }
      }
      
      // 解析 additional_images
      if (item.additional_images && typeof item.additional_images === 'string') {
        try {
          item.additional_images = JSON.parse(item.additional_images);
        } catch (e) {
          item.additional_images = [];
        }
      }
      
      // 解析 attributes
      if (item.attributes && typeof item.attributes === 'string') {
        try {
          item.attributes = JSON.parse(item.attributes);
        } catch (e) {
          item.attributes = {};
        }
      }
      
      return item;
    });

    return NextResponse.json({
      success: true,
      items: items,
      total: items.length
    });

  } catch (error) {
    console.error('查询采集数据失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '查询失败' },
      { status: 500 }
    );
  }
}