import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ resourceType: string; resourceId: string }> }
) {
  const { resourceType, resourceId } = await params;

  // 允许的资源类型
  const allowedTypes = ['blog', 'document', 'video'];
  if (!allowedTypes.includes(resourceType)) {
    return NextResponse.json({ error: 'Invalid resource type' }, { status: 400 });
  }

  const db = getDb();

  try {
    // 1. 从 resource_product 表查询关联的产品 ID 及排序
    const rows = db.prepare(`
      SELECT product_id, sort_order
      FROM resource_product
      WHERE resource_type = ? AND resource_id = ?
      ORDER BY sort_order ASC
    `).all(resourceType, resourceId) as { product_id: string; sort_order: number }[];

    if (rows.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const productIds = rows.map(row => `'${row.product_id}'`).join(',');
    // 2. 从 products 索引表获取产品详细信息
    const products = db.prepare(`
      SELECT
        productId as id,
        product_name as name,
        main_image_url as image,
        slug,
        price_tiers,
        currency
      FROM products
      WHERE productId IN (${productIds})
    `).all() as any[];

    // 3. 按 sort_order 顺序组装结果，并生成价格显示
    const items = rows.map(row => {
      const product = products.find(p => p.id === row.product_id);
      if (!product) return null;

      // 安全解析 price_tiers（可能是 JSON 字符串）
      let priceTiersArray: any[] = [];
      if (product.price_tiers) {
        try {
          priceTiersArray = typeof product.price_tiers === 'string'
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
        id: product.id,
        name: product.name,
        image: product.image,
        slug: product.slug,
        priceDisplay,
        sortOrder: row.sort_order,
      };
    }).filter(item => item !== null);

    return NextResponse.json({ items });
  } catch (error) {
    console.error(`获取资源 ${resourceType}/${resourceId} 关联产品失败:`, error);
    return NextResponse.json({ error: '内部服务器错误' }, { status: 500 });
  }
}