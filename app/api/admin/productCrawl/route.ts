// app/api/admin/productCrawl/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

const DEFAULT_SITE_ID = '000001';

// ============================================================
// GET - 获取采集数据列表（只显示父商品）
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending';
    const keyword = searchParams.get('keyword') || '';
    const platform = searchParams.get('platform') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const size = parseInt(searchParams.get('size') || '20');

    let query = supabase
      .from('crawler_products')
      .select('*', { count: 'exact' })
      .eq('site_id', DEFAULT_SITE_ID)
      .is('parent_product_id', null);  // 🔥 只显示父商品

    if (status !== 'all') {
      query = query.eq('import_status', status);
    }

    if (platform) {
      query = query.eq('platform', platform);
    }

    if (keyword) {
      query = query.or(`product_name.ilike.%${keyword}%,sku.ilike.%${keyword}%`);
    }

    const from = (page - 1) * size;
    const to = from + size - 1;

    const { data, error, count } = await query
      .order('collected_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      items: data || [],
      total: count || 0,
      page,
      size
    });
  } catch (error) {
    console.error('获取采集数据失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取失败' },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE - 删除采集数据（批量）
// ============================================================

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { crawlerIds } = body;

    if (!crawlerIds || !Array.isArray(crawlerIds) || crawlerIds.length === 0) {
      return NextResponse.json(
        { error: '请提供要删除的 crawlerIds' },
        { status: 400 }
      );
    }

    // 同时删除父商品及其变体
    for (const id of crawlerIds) {
      // 1. 删除该父商品的所有变体
      await supabase
        .from('crawler_products')
        .delete()
        .eq('site_id', DEFAULT_SITE_ID)
        .eq('parent_product_id', id);

      // 2. 删除父商品本身
      await supabase
        .from('crawler_products')
        .delete()
        .eq('site_id', DEFAULT_SITE_ID)
        .eq('crawler_id', id);
    }

    return NextResponse.json({
      success: true,
      deleted_count: crawlerIds.length
    });
  } catch (error) {
    console.error('删除采集数据失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除失败' },
      { status: 500 }
    );
  }
}