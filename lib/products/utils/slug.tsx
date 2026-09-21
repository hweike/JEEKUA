// lib/products/utils/slug.ts
import { supabase } from '@/lib/supabase/client';

// ============================================================
// 产品 Slug 相关工具函数
// ============================================================

/**
 * 根据产品 ID 获取产品 slug
 * 用于生成产品详情页链接
 * 
 * @param productId - 产品 ID
 * @returns 产品 slug，如果不存在则返回 null
 * 
 * @example
 * const slug = await getProductSlug('prod_123');
 * // 返回: 'mornsun-pv1000-25bxx'
 */
export async function getProductSlug(productId: string): Promise<string | null> {
  if (!productId) return null;
  
  try {
    const { data, error } = await supabase
      .from('products')
      .select('slug')
      .eq('productId', productId)
      .maybeSingle();
    
    if (error) {
      console.warn('[getProductSlug] 查询失败:', error.message);
      return null;
    }
    
    if (!data) {
      console.warn('[getProductSlug] 未找到产品:', productId);
      return null;
    }
    
    return data.slug || null;
  } catch (error) {
    console.error('[getProductSlug] 异常:', error);
    return null;
  }
}

/**
 * 批量获取产品 slug 映射
 * 用于订单列表等需要批量获取的场景，减少数据库查询次数
 * 
 * @param productIds - 产品 ID 数组
 * @returns 产品 ID 到 slug 的映射对象
 * 
 * @example
 * const slugMap = await getProductSlugs(['prod_123', 'prod_456']);
 * // 返回: { 'prod_123': 'mornsun-pv1000-25bxx', 'prod_456': 'mornsun-pv2000-25bxx' }
 */
export async function getProductSlugs(productIds: string[]): Promise<Record<string, string>> {
  if (!productIds || productIds.length === 0) return {};
  
  // 去重，避免重复查询
  const uniqueIds = [...new Set(productIds)];
  
  try {
    const { data, error } = await supabase
      .from('products')
      .select('productId, slug')
      .in('productId', uniqueIds);
    
    if (error) {
      console.warn('[getProductSlugs] 查询失败:', error.message);
      return {};
    }
    
    if (!data || data.length === 0) {
      return {};
    }
    
    const map: Record<string, string> = {};
    data.forEach(item => {
      if (item.productId && item.slug) {
        map[item.productId] = item.slug;
      }
    });
    
    return map;
  } catch (error) {
    console.error('[getProductSlugs] 异常:', error);
    return {};
  }
}

/**
 * 根据产品 ID 获取完整的产品信息（包含 slug 和名称）
 * 
 * @param productId - 产品 ID
 * @returns 产品信息对象，如果不存在则返回 null
 */
export async function getProductInfo(productId: string): Promise<{ 
  id: string; 
  slug: string; 
  product_name: string;
  main_image_url?: string;
} | null> {
  if (!productId) return null;
  
  try {
    const { data, error } = await supabase
      .from('products')
      .select('productId, slug, product_name, main_image_url')
      .eq('productId', productId)
      .maybeSingle();
    
    if (error) {
      console.warn('[getProductInfo] 查询失败:', error.message);
      return null;
    }
    
    if (!data) {
      console.warn('[getProductInfo] 未找到产品:', productId);
      return null;
    }
    
    return {
      id: data.productId,
      slug: data.slug || '',
      product_name: data.product_name || '',
      main_image_url: data.main_image_url || '',
    };
  } catch (error) {
    console.error('[getProductInfo] 异常:', error);
    return null;
  }
}

/**
 * 批量获取产品信息（包含 slug 和名称）
 * 
 * @param productIds - 产品 ID 数组
 * @returns 产品 ID 到产品信息的映射对象
 */
export async function getProductInfos(productIds: string[]): Promise<Record<string, { 
  id: string; 
  slug: string; 
  product_name: string;
  main_image_url?: string;
}>> {
  if (!productIds || productIds.length === 0) return {};
  
  const uniqueIds = [...new Set(productIds)];
  
  try {
    const { data, error } = await supabase
      .from('products')
      .select('productId, slug, product_name, main_image_url')
      .in('productId', uniqueIds);
    
    if (error) {
      console.warn('[getProductInfos] 查询失败:', error.message);
      return {};
    }
    
    if (!data || data.length === 0) {
      return {};
    }
    
    const map: Record<string, { id: string; slug: string; product_name: string; main_image_url?: string }> = {};
    data.forEach(item => {
      if (item.productId) {
        map[item.productId] = {
          id: item.productId,
          slug: item.slug || '',
          product_name: item.product_name || '',
          main_image_url: item.main_image_url || '',
        };
      }
    });
    
    return map;
  } catch (error) {
    console.error('[getProductInfos] 异常:', error);
    return {};
  }
}

/**
 * 根据产品 slug 获取产品 ID
 * 
 * @param slug - 产品 slug
 * @returns 产品 ID，如果不存在则返回 null
 */
export async function getProductIdBySlug(slug: string): Promise<string | null> {
  if (!slug) return null;
  
  try {
    const { data, error } = await supabase
      .from('products')
      .select('productId')
      .eq('slug', slug)
      .maybeSingle();
    
    if (error) {
      console.warn('[getProductIdBySlug] 查询失败:', error.message);
      return null;
    }
    
    if (!data) {
      console.warn('[getProductIdBySlug] 未找到产品:', slug);
      return null;
    }
    
    return data.productId || null;
  } catch (error) {
    console.error('[getProductIdBySlug] 异常:', error);
    return null;
  }
}

/**
 * 构建产品详情页 URL
 * 
 * @param productId - 产品 ID
 * @param locale - 语言代码，默认为 'en'
 * @param slug - 可选，如果传入则直接使用，否则从数据库查询
 * @returns 产品详情页 URL，如果产品不存在则返回 null
 * 
 * @example
 * const url = await buildProductUrl('prod_123', 'en');
 * // 返回: '/en/product/mornsun-pv1000-25bxx'
 */
export async function buildProductUrl(
  productId: string, 
  locale: string = 'en',
  slug?: string
): Promise<string | null> {
  if (!productId) return null;
  
  try {
    let productSlug = slug;
    
    // 如果没有传入 slug，从数据库查询
    if (!productSlug) {
      const result = await getProductSlug(productId);
      if (!result) return null;
      productSlug = result;
    }
    
    return `/${locale}/product/${productSlug}`;
  } catch (error) {
    console.error('[buildProductUrl] 异常:', error);
    return null;
  }
}