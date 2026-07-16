// lib/discovery/mappers/product.mapper.ts
import { PageData } from '../register';

export function mapProductToPageData(
  product: any,
  mdData: any,
  mdContent: string,
  updatedAt: string
): PageData {
  const slug = mdData.slug || product.slug || product.id;
  const title = mdData.product_name || mdData.title || product.product_name || '未命名产品';
  // 优先使用 MD 中的简短描述，否则使用业务数据中的简短描述
  const shortDesc = mdData.short_description || product.short_description || '';
  // 优先使用 MD 内容，若没有则使用业务数据中的描述
  const fullContent = mdData.description || mdContent || product.description || '';

  return {
    id: `product:${product.id}`,
    type: 'product',
    title,
    slug,
    url: `/product/${slug}`,
    cover_image: mdData.main_image_url || product.main_image_url || null,
    seo_title: mdData.seo_title || null,
    seo_description: mdData.seo_description || null,
    seo_keywords: mdData.seo_keywords || null,
    content_summary: shortDesc.slice(0, 5000) || fullContent.slice(0, 5000),
    content_full: fullContent,
    updatedAt: mdData.updatedAt || updatedAt,
  };
}

// 变体的映射
export function mapVariantToPageData(
  productId: string,
  variant: any,
  parentData: any,
  updatedAt: string
): PageData {
  const slug = variant.slug || `${parentData.slug || productId}-${variant.id}`;
  const title = variant.product_name || `${parentData.product_name || '产品'} (${variant.sku || '变体'})`;
  const shortDesc = variant.short_description || parentData.short_description || '';
  const fullContent = parentData.description || parentData.content || '';

  return {
    id: `product:${productId}/${variant.id}`,
    type: 'product',
    title,
    slug,
    url: `/product/${slug}`,
    cover_image: variant.main_image_url || parentData.main_image_url || null,
    seo_title: variant.seo_title || parentData.seo_title || null,
    seo_description: variant.seo_description || parentData.seo_description || null,
    seo_keywords: variant.seo_keywords || parentData.seo_keywords || null,
    content_summary: shortDesc.slice(0, 5000) || fullContent.slice(0, 5000),
    content_full: fullContent,
    updatedAt: parentData.updatedAt || updatedAt,
  };
}