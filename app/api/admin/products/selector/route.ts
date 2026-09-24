// app/api/admin/products/selector/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/admin';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const locale = searchParams.get('locale') || 'en';
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const size = Math.min(50, Math.max(1, parseInt(searchParams.get('size') || '20', 10)));
    const offset = (page - 1) * size;

    // 1. 查询父产品
    const conditions: any[] = [
      sql`site_id = ${DEFAULT_SITE_ID}`,
      sql`locale = ${locale}`,
      sql`status = 'published'`,
      sql`parent_product_id IS NULL`,
    ];

    if (search.trim()) {
      const pattern = `%${search.trim()}%`;
      conditions.push(sql`(product_name ILIKE ${pattern} OR sku ILIKE ${pattern})`);
    }

    const whereClause = conditions.reduce(
      (acc, c, i) => (i === 0 ? c : sql`${acc} AND ${c}`),
      sql``
    );

    // 总数
    const countRows = await sql<{ count: string }[]>`
      SELECT COUNT(*)::text AS count FROM public.products
      WHERE ${whereClause}
    `;
    const total = parseInt(countRows[0]?.count || '0', 10);

    // 父产品列表
    const parentData = await sql<any[]>`
      SELECT * FROM public.products
      WHERE ${whereClause}
      ORDER BY "updatedAt" DESC
      LIMIT ${size} OFFSET ${offset}
    `;

    const parentIds = parentData.map((item: any) => item.productId);

    // 2. 查询这些父产品的变体
    let variantData: any[] = [];
    if (parentIds.length > 0) {
      variantData = await sql<any[]>`
        SELECT * FROM public.products
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND locale = ${locale}
          AND status = 'published'
          AND parent_product_id IN ${sql(parentIds)}
        ORDER BY "updatedAt" DESC
      `;
    }

    // 3. 构建父产品映射
    const parentMap: Record<string, any> = {};
    for (const item of parentData) {
      parentMap[item.productId] = item;
    }

    // 4. 构建产品列表
    const items: any[] = [];

    const extractPrice = (priceTiers: any): number => {
      if (!priceTiers) return 0;
      let arr = priceTiers;
      if (typeof arr === 'string') {
        try { arr = JSON.parse(arr); } catch { arr = []; }
      }
      if (!Array.isArray(arr) || arr.length === 0) return 0;
      return arr[0]?.price || 0;
    };

    for (const item of parentData) {
      items.push({
        id: item.productId,
        product_name: item.product_name || '未命名产品',
        sku: item.sku || '',
        price: extractPrice(item.price_tiers),
        currency: item.currency || 'USD',
        main_image_url: item.main_image_url || '',
        status: item.status || 'published',
        _isVariant: false,
        parent_product_id: '',
        parent_product_name: '',
        categoryId: item.categoryId || '',
        productLineId: item.productLineId || '',
        seriesId: item.seriesId || '',
        additional_images: item.additional_images || [],
        price_tiers: item.price_tiers || [],
      });
    }

    for (const item of variantData) {
      const parent = parentMap[item.parent_product_id];
      items.push({
        id: item.productId,
        product_name: item.product_name || '未命名变体',
        sku: item.sku || '',
        price: extractPrice(parent?.price_tiers),
        currency: parent?.currency || 'USD',
        main_image_url: item.main_image_url || '',
        status: item.status || 'published',
        _isVariant: true,
        parent_product_id: item.parent_product_id || '',
        parent_product_name: parent?.product_name || '',
        categoryId: item.categoryId || '',
        productLineId: item.productLineId || '',
        seriesId: item.seriesId || '',
        additional_images: item.additional_images || [],
        price_tiers: parent?.price_tiers || [],
      });
    }

    // 5. 重新组织：父产品 + 其变体
    const sortedItems: any[] = [];
    const processedVariantIds = new Set<string>();

    const parents = items.filter(item => !item._isVariant);
    const variants = items.filter(item => item._isVariant);

    for (const parent of parents) {
      sortedItems.push(parent);
      for (const v of variants) {
        if (v.parent_product_id === parent.id) {
          sortedItems.push(v);
          processedVariantIds.add(v.id);
        }
      }
    }

    // 没匹配到父产品的变体也加进去
    for (const v of variants) {
      if (!processedVariantIds.has(v.id)) {
        sortedItems.push(v);
      }
    }

    return NextResponse.json({
      items: sortedItems,
      total,
      page,
      size,
      hasMore: page * size < total,
    });
  } catch (error: any) {
    console.error('获取商品选择器列表失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}