import { supabase } from '@/lib/supabase/client';

// 默认站点ID（根据实际情况调整）
const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

/**
 * 获取某个资源关联的产品列表
 * @param resourceType 资源类型: blog, document, video
 * @param resourceId 资源ID
 */
export async function getAssociatedProducts(resourceType: string, resourceId: string) {
  // 查询关联表
  const { data: relations, error: relError } = await supabase
    .from('resource_product')
    .select('product_id, sort_order')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .order('sort_order', { ascending: true });
  if (relError) throw new Error(`查询关联产品失败: ${relError.message}`);
  if (!relations || relations.length === 0) return [];

  const productIds = relations.map(r => r.product_id);
  // 查询产品详情
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('productId, product_name, sku, main_image_url, price_tiers, currency')
    .eq('site_id', DEFAULT_SITE_ID)
    .in('productId', productIds);
  if (prodError) throw new Error(`查询产品详情失败: ${prodError.message}`);

  // 按原顺序合并
  const productMap = new Map(products?.map(p => [p.productId, p]) || []);
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
  }).filter(item => item.productId); // 过滤掉不存在的产品
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
  const siteId = DEFAULT_SITE_ID;

  // 使用事务（Supabase 不支持真正的数据库事务，但我们可以串行执行，如果失败则无法回滚）
  // 先删除旧关联
  const { error: delError } = await supabase
    .from('resource_product')
    .delete()
    .eq('site_id', siteId)
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId);
  if (delError) throw new Error(`删除旧关联失败: ${delError.message}`);

  if (productIds.length === 0) {
    return { success: true, updatedCount: 0 };
  }

  // 插入新关联
  const insertData = productIds.map((productId, index) => ({
    site_id: siteId,
    resource_type: resourceType,
    resource_id: resourceId,
    product_id: productId,
    sort_order: index,
  }));
  const { error: insError } = await supabase
    .from('resource_product')
    .insert(insertData);
  if (insError) throw new Error(`插入新关联失败: ${insError.message}`);

  return { success: true, updatedCount: productIds.length };
}

/**
 * 获取产品关联的所有资源（分组返回）
 * @param productId 产品ID
 */
export async function getResourcesByProduct(productId: string) {
  const { data: rows, error } = await supabase
    .from('resource_product')
    .select('resource_type, resource_id, sort_order')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('product_id', productId)
    .order('resource_type', { ascending: true })
    .order('sort_order', { ascending: true });
  if (error) throw new Error(`查询产品关联资源失败: ${error.message}`);

  const grouped: Record<string, Array<{ id: string; sortOrder: number }>> = {
    blog: [],
    document: [],
    video: [],
  };
  for (const row of rows || []) {
    const type = row.resource_type;
    if (grouped[type]) {
      grouped[type].push({ id: row.resource_id, sortOrder: row.sort_order });
    }
  }
  return grouped;
}

/**
 * 删除产品时，一并删除关联关系（在删除产品的API中调用）
 */
export async function deleteProductResourceRelations(productId: string) {
  const { error } = await supabase
    .from('resource_product')
    .delete()
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('product_id', productId);
  if (error) throw new Error(`删除产品关联资源失败: ${error.message}`);
}

/**
 * 删除指定资源类型的关联关系
 * @param resourceType 资源类型 ('blog', 'document', 'video')
 * @param resourceId 资源ID
 */
export async function deleteResourceAssociations(resourceType: string, resourceId: string) {
  const { error } = await supabase
    .from('resource_product')
    .delete()
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId);
  if (error) throw new Error(`删除资源关联关系失败: ${error.message}`);
}