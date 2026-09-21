// lib/productCrawl/import-transformer.ts

import { generateSkuFromRule } from '@/lib/products/services/product.service';

/**
 * SKU 生成规则
 */
function generateSku(existingSku: string | undefined): string {
  if (existingSku && existingSku.trim()) {
    return existingSku.trim();
  }
  const randomNum = Math.floor(10000000 + Math.random() * 90000000);
  return `P-${randomNum}`;
}

/**
 * 生成 Slug
 */
function generateSlug(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 200);
}

/**
 * 解析 JSON 字段
 */
function parseJsonField<T>(value: any): T {
  if (!value) return [] as unknown as T;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return [] as unknown as T;
    }
  }
  return value;
}

/**
 * 解析属性
 */
function parseAttributes(attributes: any): Record<string, string> {
  if (!attributes) return {};
  if (typeof attributes === 'string') {
    try {
      return JSON.parse(attributes);
    } catch {
      return {};
    }
  }
  if (typeof attributes === 'object') {
    return attributes;
  }
  return {};
}

/**
 * 🔥 构建变体列表 - 优先使用变体自己的图片
 */
function buildVariants(
  skuList: any[],
  mainImageUrl: string = '',
  parentSku: string = ''
): Array<{
  product_name: string;
  sku: string;
  short_description: string;
  main_image_url: string;
  attributes: Record<string, string>;
}> {
  if (!skuList || skuList.length === 0) return [];

  console.log('🔵 [buildVariants] 输入 skuList:', JSON.stringify(skuList, null, 2));

  const result = skuList.map((variant, index) => {
    // 变体名称
    const variantName = variant.name || variant.id || `变体 ${index + 1}`;
    
    // 变体 SKU：优先使用 sku_code 或 sku，否则基于父 SKU 生成
    let variantSku = variant.sku_code || variant.sku || '';
    if (!variantSku) {
      const baseSku = parentSku || 'P';
      const randomNum = Math.floor(10000000 + Math.random() * 90000000);
      variantSku = `${baseSku}-V${String(index + 1).padStart(3, '0')}`;
    }

    // 变体属性
    const variantAttributes = variant.attributes || {};

    // 🔥 修复：变体图片优先使用自己的图片
    // 支持的字段名：image, image_url, main_image_url, img, picture, photo
    const variantImage = 
      variant.image || 
      variant.image_url || 
      variant.main_image_url || 
      variant.img || 
      variant.picture || 
      variant.photo || 
      '';

    // 如果变体有图片，使用变体图片；否则使用父商品图片
    const finalImage = variantImage || mainImageUrl;

    // 如果有图片，打印日志便于调试
    if (variantImage) {
      console.log(`🔵 [buildVariants] 变体 "${variantName}" 使用自己的图片`);
    } else {
      console.log(`🔵 [buildVariants] 变体 "${variantName}" 使用父商品图片`);
    }

    return {
      product_name: variantName,
      sku: variantSku,
      short_description: variantName,
      main_image_url: finalImage,
      attributes: variantAttributes,
    };
  });

  console.log('🔵 [buildVariants] 输出:', JSON.stringify(result, null, 2));
  return result;
}

/**
 * 采集数据 → 正式产品数据转换器
 */
export class ImportTransformer {
  private locale: string;
  private categoryId: string;
  private seriesId: string;

  constructor(locale: string, categoryId: string, seriesId: string) {
    this.locale = locale;
    this.categoryId = categoryId;
    this.seriesId = seriesId;
  }

  /**
   * 转换单条采集数据为 createProduct 格式
   */
  transform(crawlData: any): any {
    console.log('🔵 [ImportTransformer.transform] 输入数据:', JSON.stringify({
      sku: crawlData.sku,
      product_name: crawlData.product_name,
      has_sku_list: !!(crawlData.sku_list && Array.isArray(crawlData.sku_list) && crawlData.sku_list.length > 0),
      sku_list_length: crawlData.sku_list?.length || 0,
    }, null, 2));

    const hasVariants = crawlData.sku_list && 
                        Array.isArray(crawlData.sku_list) && 
                        crawlData.sku_list.length > 0;

    // 解析价格阶梯
    const priceTiers = parseJsonField<any[]>(crawlData.price_tiers);
    
    // 解析附加图片
    const additionalImages = parseJsonField<string[]>(crawlData.additional_images);
    
    // 解析属性
    const attributes = parseAttributes(crawlData.attributes);

    // 生成 SKU
    const sku = generateSku(crawlData.sku);

    // 生成 Slug
    const slug = crawlData.slug || generateSlug(crawlData.product_name);

    // 基础产品数据
    const baseProduct = {
      product_name: crawlData.product_name,
      sku: sku,
      categoryId: this.categoryId,
      seriesId: this.seriesId,
      brand: crawlData.brand || '',
      price_tiers: priceTiers,
      currency: crawlData.currency || 'USD',
      availability: crawlData.availability || 'in_stock',
      min_order_quantity: crawlData.min_order_quantity || 1,
      main_image_url: crawlData.main_image_url || '',
      additional_images: additionalImages,
      description: crawlData.description || '',
      short_description: crawlData.short_description || '',
      attributes: attributes,
      spec_text: crawlData.spec_text || '',
      slug: slug,
      status: 'published' as const,
      templateId: '',
    };

    if (hasVariants) {
      // 🔥 有变体：父产品 + 变体列表
      const variants = buildVariants(
        crawlData.sku_list,
        crawlData.main_image_url || '',
        sku  // 传入父 SKU 用于生成变体 SKU
      );

      console.log(`🔵 [ImportTransformer.transform] 生成了 ${variants.length} 个变体`);
      console.log('🔵 变体列表:', JSON.stringify(variants, null, 2));

      return {
        ...baseProduct,
        variants: variants,
        _source_crawler_id: crawlData.crawler_id,
        _source_product_id: crawlData.source_product_id,
        _source_url: crawlData.source_url,
        _platform: crawlData.platform,
        _collected_at: crawlData.collected_at,
      };
    } else {
      // 🔥 无变体：单条产品
      console.log('🔵 [ImportTransformer.transform] 无变体，创建单条产品');
      return {
        ...baseProduct,
        variants: [],
        _source_crawler_id: crawlData.crawler_id,
        _source_product_id: crawlData.source_product_id,
        _source_url: crawlData.source_url,
        _platform: crawlData.platform,
        _collected_at: crawlData.collected_at,
      };
    }
  }
}