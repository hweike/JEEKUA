// src/types/product.js

/**
 * 商品数据模型 - 直接对应后端 API 和数据库表结构
 * 所有平台采集的数据最终都转换为这个格式
 */

export const ProductSchema = {
  // ===== 核心标识 =====
  /** 平台标识: 'alibaba' | '1688' */
  platform: '',
  /** 商品来源URL（用于去重） */
  source_url: '',
  /** 来源平台商品ID */
  source_product_id: '',
  
  // ===== 基本信息 =====
  /** 商品名称 */
  product_name: '',
  /** 商品描述（HTML） */
  description: '',
  /** 简短描述 */
  short_description: '',
  /** 品牌 */
  brand: '',
  /** URL别名 */
  slug: '',
  
  // ===== 价格信息 =====
  /** 价格阶梯 [{ min_qty, max_qty, price, currency }] */
  price_tiers: [],
  /** 货币单位 */
  currency: '',
  
  // ===== 库存与起订量 =====
  /** 最小起订量 */
  min_order_quantity: 0,
  /** 库存状态: 'in_stock' | 'out_of_stock' | 'backorder' */
  availability: 'in_stock',
  
  // ===== 图片 =====
  /** 主图URL */
  main_image_url: '',
  /** 附加图片列表 */
  additional_images: [],
  
  // ===== SKU =====
  /** 主SKU标识 */
  sku: '',
  /** SKU列表 [{ id, name, price, stock }] */
  sku_list: [],
  
  // ===== 属性 =====
  /** 商品属性（键值对） */
  attributes: {},
  /** 规格文本 */
  spec_text: '',
  
  // ===== 父子关系（用于变体） =====
  /** 父产品ID（如果是变体） */
  parent_product_id: null,
  
  // ===== 状态 =====
  /** 状态: 'draft' | 'pending' | 'published' | 'rejected' */
  status: 'draft',
  /** 导入状态: 'pending' | 'imported' | 'failed' */
  import_status: 'pending',
  
  // ===== 元信息 =====
  /** 采集时间 */
  collected_at: '',
  /** 采集者: 'plugin' */
  collected_by: 'plugin',
  /** 模板ID */
  template_id: '',
  /** 原始数据（备份） */
  raw_data: null
};

/**
 * 创建空商品对象
 */
export function createEmptyProduct() {
  return {
    platform: '',
    source_url: '',
    source_product_id: '',
    product_name: '',
    description: '',
    short_description: '',
    brand: '',
    slug: '',
    price_tiers: [],
    currency: '',
    min_order_quantity: 0,
    availability: 'in_stock',
    main_image_url: '',
    additional_images: [],
    sku: '',
    sku_list: [],
    attributes: {},
    spec_text: '',
    parent_product_id: null,
    status: 'draft',
    import_status: 'pending',
    collected_at: new Date().toISOString(),
    collected_by: 'plugin',
    template_id: '',
    raw_data: null
  };
}

/**
 * 验证商品数据是否有效
 */
export function isValidProduct(product) {
  return !!(product && 
    product.product_name && 
    product.product_name.trim().length > 0 &&
    product.source_url &&
    product.source_url.trim().length > 0);
}

/**
 * 验证商品数据并返回错误列表
 */
export function validateProduct(product) {
  const errors = [];
  
  if (!product.product_name || product.product_name.trim().length === 0) {
    errors.push('商品名称不能为空');
  }
  
  if (!product.source_url || product.source_url.trim().length === 0) {
    errors.push('商品链接不能为空');
  }
  
  if (!product.platform) {
    errors.push('平台标识缺失');
  }
  
  if (product.min_order_quantity !== undefined && product.min_order_quantity < 0) {
    errors.push('起订量无效');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================
// 工具函数
// ============================================================

/**
 * 从商品对象生成简短描述
 */
export function generateShortDescription(description, maxLength = 200) {
  if (!description) return '';
  const plainText = description.replace(/<[^>]+>/g, '').trim();
  if (plainText.length <= maxLength) return plainText;
  return plainText.slice(0, maxLength) + '...';
}

/**
 * 从 SKU 列表提取颜色
 */
export function extractColorsFromSku(skuList) {
  if (!Array.isArray(skuList)) return [];
  const colors = skuList
    .map(sku => sku.color || sku.name)
    .filter(Boolean);
  return [...new Set(colors)];
}

/**
 * 从 SKU 列表提取尺码
 */
export function extractSizesFromSku(skuList) {
  if (!Array.isArray(skuList)) return [];
  const sizes = skuList
    .map(sku => sku.size || sku.name)
    .filter(Boolean);
  return [...new Set(sizes)];
}

/**
 * 清理商品对象的空字段
 */
export function cleanProduct(product) {
  const cleaned = { ...product };
  
  // 移除空字符串
  for (const key of Object.keys(cleaned)) {
    if (cleaned[key] === '' || cleaned[key] === null || cleaned[key] === undefined) {
      cleaned[key] = key === 'raw_data' ? null : '';
    }
  }
  
  // 确保数组字段是数组
  const arrayFields = ['additional_images', 'sku_list', 'price_tiers'];
  for (const field of arrayFields) {
    if (!Array.isArray(cleaned[field])) {
      cleaned[field] = [];
    }
  }
  
  // 确保对象字段是对象
  if (typeof cleaned.attributes !== 'object' || cleaned.attributes === null) {
    cleaned.attributes = {};
  }
  
  return cleaned;
}

// ============================================================
// 导出默认对象
// ============================================================

export default {
  ProductSchema,
  createEmptyProduct,
  isValidProduct,
  validateProduct,
  generateShortDescription,
  extractColorsFromSku,
  extractSizesFromSku,
  cleanProduct
};