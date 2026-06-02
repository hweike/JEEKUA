import { getDb } from '@/lib/db';

/**
 * 获取某个资源关联的产品列表
 * @param resourceType 资源类型: blog, document, video
 * @param resourceId 资源ID
 */
export async function getAssociatedProducts(resourceType: string, resourceId: string) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT 
      rp.product_id as productId,
      p.product_name as productName,
      p.sku,
      p.main_image_url as mainImage,
      p.price_tiers as priceTiers,
      p.currency,
      rp.sort_order as sortOrder
    FROM resource_product rp
    JOIN products p ON rp.product_id = p.productId
    WHERE rp.resource_type = ? AND rp.resource_id = ?
    ORDER BY rp.sort_order ASC
  `).all(resourceType, resourceId);
  return rows;
}

/**
 * 更新某资源关联的产品列表（全量替换）
 * @param resourceType 资源类型
 * @param resourceId 资源ID
 * @param productIds 产品ID数组（按顺序）
 * @throws 当超过10个产品时抛出错误
 */
export async function updateResourceProducts(resourceType: string, resourceId: string, productIds: string[]) {
  if (productIds.length > 10) {
    throw new Error('最多关联10个产品');
  }
  const db = getDb();
  const stmtDel = db.prepare(`DELETE FROM resource_product WHERE resource_type = ? AND resource_id = ?`);
  const stmtIns = db.prepare(`
    INSERT INTO resource_product (resource_type, resource_id, product_id, sort_order)
    VALUES (?, ?, ?, ?)
  `);
  const tx = db.transaction(() => {
    stmtDel.run(resourceType, resourceId);
    for (let i = 0; i < productIds.length; i++) {
      stmtIns.run(resourceType, resourceId, productIds[i], i);
    }
  });
  tx();
  return { success: true, updatedCount: productIds.length };
}

/**
 * 获取产品关联的所有资源（分组返回）
 * @param productId 产品ID
 */
export async function getResourcesByProduct(productId: string) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT resource_type, resource_id, sort_order
    FROM resource_product
    WHERE product_id = ?
    ORDER BY resource_type, sort_order
  `).all(productId);
  
  const grouped: Record<string, Array<{ id: string; sortOrder: number }>> = {
    blog: [],
    document: [],
    video: [],
  };
  for (const row of rows) {
    grouped[row.resource_type].push({ id: row.resource_id, sortOrder: row.sort_order });
  }
  return grouped;
}

/**
 * 删除产品时，一并删除关联关系（在删除产品的API中调用）
 */
export async function deleteProductResourceRelations(productId: string) {
  const db = getDb();
  const stmt = db.prepare(`DELETE FROM resource_product WHERE product_id = ?`);
  stmt.run(productId);
}

/**
 * 删除指定资源类型的关联关系
 * @param resourceType 资源类型 ('blog', 'document', 'video')
 * @param resourceId 资源ID
 */
export async function deleteResourceAssociations(resourceType: string, resourceId: string) {
  const db = getDb();
  const stmt = db.prepare(`DELETE FROM resource_product WHERE resource_type = ? AND resource_id = ?`);
  stmt.run(resourceType, resourceId);
}