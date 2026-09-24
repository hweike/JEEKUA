// lib/products/resourceRelations.ts
import sql from '@/lib/db/admin';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function getAssociatedProducts(resourceType: string, resourceId: string) {
  // 1. 查询关联表
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
    throw new Error(`查询关联产品失败: ${relError.message}`);
  }

  if (!relations || relations.length === 0) return [];

  const productIds = relations.map(r => r.product_id);

  // 2. 查询产品详情
  let products: any[];
  try {
    products = await sql<any[]>`
      SELECT "productId", product_name, sku, main_image_url, price_tiers, currency
      FROM public.products
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND "productId" IN ${sql(productIds)}
    `;
  } catch (prodError: any) {
    throw new Error(`查询产品详情失败: ${prodError.message}`);
  }

  // 3. 按原顺序合并
  const productMap = new Map(products.map(p => [p.productId, p]));
  return relations.map(rel => {
    const p = productMap.get(rel.product_id);
    return {
      productId: p?.productId,
      productName: p?.product_name,
      sku: p?.sku,
      mainImage: p?.main_image_url,
      priceTiers: p?.price_tiers ? JSON.parse(p.price_tiers) : [],
      currency: p?.currency,
      sortOrder: rel.sort_order,
    };
  }).filter(item => item.productId);
}

export async function updateResourceProducts(resourceType: string, resourceId: string, productIds: string[]) {
  if (productIds.length > 10) {
    throw new Error('最多关联10个产品');
  }
  const siteId = DEFAULT_SITE_ID;

  // 1. 先删除旧关联
  try {
    await sql`
      DELETE FROM public.resource_product
      WHERE site_id = ${siteId}
        AND resource_type = ${resourceType}
        AND resource_id = ${resourceId}
    `;
  } catch (delError: any) {
    throw new Error(`删除旧关联失败: ${delError.message}`);
  }

  if (productIds.length === 0) {
    return { success: true, updatedCount: 0 };
  }

  // 2. 插入新关联
  try {
    for (let index = 0; index < productIds.length; index++) {
      await sql`
        INSERT INTO public.resource_product (site_id, resource_type, resource_id, product_id, sort_order)
        VALUES (${siteId}, ${resourceType}, ${resourceId}, ${productIds[index]}, ${index})
      `;
    }
  } catch (insError: any) {
    throw new Error(`插入新关联失败: ${insError.message}`);
  }

  return { success: true, updatedCount: productIds.length };
}

export async function getResourcesByProduct(productId: string) {
  let rows: { resource_type: string; resource_id: string; sort_order: number }[];
  try {
    rows = await sql<{ resource_type: string; resource_id: string; sort_order: number }[]>`
      SELECT resource_type, resource_id, sort_order FROM public.resource_product
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND product_id = ${productId}
      ORDER BY resource_type ASC, sort_order ASC
    `;
  } catch (error: any) {
    throw new Error(`查询产品关联资源失败: ${error.message}`);
  }

  const grouped: Record<string, Array<{ id: string; sortOrder: number }>> = {
    blog: [],
    document: [],
    video: [],
  };
  for (const row of rows) {
    const type = row.resource_type;
    if (grouped[type]) {
      grouped[type].push({ id: row.resource_id, sortOrder: row.sort_order });
    }
  }
  return grouped;
}

export async function deleteProductResourceRelations(productId: string) {
  try {
    await sql`
      DELETE FROM public.resource_product
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND product_id = ${productId}
    `;
  } catch (error: any) {
    throw new Error(`删除产品关联资源失败: ${error.message}`);
  }
}

export async function deleteResourceAssociations(resourceType: string, resourceId: string) {
  try {
    await sql`
      DELETE FROM public.resource_product
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND resource_type = ${resourceType}
        AND resource_id = ${resourceId}
    `;
  } catch (error: any) {
    throw new Error(`删除资源关联关系失败: ${error.message}`);
  }
}