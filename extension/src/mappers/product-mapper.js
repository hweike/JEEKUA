// src/mappers/product-mapper.js

/**
 * 数据映射器
 * 将各平台原始数据直接映射为后端 API 格式
 */

import {
  createEmptyProduct,
  cleanProduct,
  generateShortDescription
} from '../types/product.js';

// ============================================================
// 平台映射规则
// ============================================================

const PLATFORM_RULES = {
  alibaba: {
    priceParser: (rawPrice) => parsePrice(rawPrice, 'USD'),
    currencyExtractor: (raw) => extractCurrency(raw),
    supplierIdExtractor: (raw) => raw?.supplierId || null
  },
  1688: {
    priceParser: (rawPrice) => parsePrice(rawPrice, 'CNY'),
    currencyExtractor: (raw) => 'CNY',
    supplierIdExtractor: (raw) => null
  }
};

// ============================================================
// 工具函数
// ============================================================

function parsePrice(priceStr, defaultCurrency = 'USD') {
  if (!priceStr || typeof priceStr !== 'string') {
    return [];
  }

  const cleaned = priceStr.replace(/[^0-9.\-]/g, ' ');
  const numbers = cleaned.match(/[\d.]+/g);
  
  if (!numbers || numbers.length === 0) {
    return [];
  }

  const nums = numbers.map(Number).filter(n => !isNaN(n) && n > 0);
  if (nums.length === 0) {
    return [];
  }

  const price = nums[0];
  
  return [{
    min_qty: 1,
    max_qty: null,
    price: price,
    currency: defaultCurrency
  }];
}

function extractCurrency(raw) {
  const priceStr = raw?.price || raw?.priceDisplay || '';
  if (priceStr.includes('US$') || priceStr.includes('USD')) return 'USD';
  if (priceStr.includes('€')) return 'EUR';
  if (priceStr.includes('£')) return 'GBP';
  if (priceStr.includes('¥')) return 'CNY';
  return 'USD';
}

function extractSourceId(url, platform) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    if (platform === 'alibaba') {
      const match = pathname.match(/\/product-detail\/[^/]*(?:-|_)(\d+)\.html/);
      return match ? match[1] : null;
    }
    if (platform === '1688') {
      const match = pathname.match(/\/offer\/(\d+)\.html/);
      return match ? match[1] : null;
    }
    return null;
  } catch {
    return null;
  }
}

function generateSku(productId, platform) {
  const prefix = platform === '1688' ? 'CN' : 'US';
  return `${prefix}_${productId || Date.now()}`;
}

function generateSlug(title, productId) {
  if (!title) return productId || '';
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return productId ? `${base}-${productId}` : base;
}

// ============================================================
// ⭐ 变体数据转换函数（核心修复 - 生成笛卡尔积）
// ============================================================

/**
 * 将适配器的变体格式转换为 SKU 列表格式（笛卡尔积）
 * 
 * 适配器格式 (variants): 
 *   [{ name: "颜色", values: [{ value: "黑色", selected: true }, ...] }]
 * 
 * 目标格式 (sku_list):
 *   [{ id: "黑色-36-37", name: "颜色: 黑色 / 美码: 36-37", price: null, stock: null, sku_code: "黑色_36_37" }]
 */
function convertVariantsToSkus(variants) {
  if (!Array.isArray(variants) || variants.length === 0) {
    console.log('[ProductMapper] convertVariantsToSkus: 无变体数据');
    return [];
  }
  
  // 提取变体名称和值列表
  const variantNames = variants.map(v => v.name);
  const variantValues = variants.map(v => v.values.map(item => item.value));
  
  console.log('[ProductMapper] 变体组合生成:');
  console.log('  变体属性:', variantNames);
  console.log('  变体值数量:', variantValues.map(v => v.length));
  
  // ⭐ 生成笛卡尔积（所有组合）
  const combinations = cartesianProduct(variantValues);
  
  console.log('[ProductMapper]  组合总数:', combinations.length);
  
  // ⭐ 如果没有组合，返回空数组
  if (combinations.length === 0) {
    console.log('[ProductMapper] ⚠️ 组合为空，请检查变体数据格式');
    return [];
  }
  
  // ⭐ 构建 SKU 列表
  const skuList = combinations.map((combination, index) => {
    // 生成 ID: 用 '-' 连接所有值（去除空格）
    const id = combination.map(v => v.replace(/\s+/g, '-')).join('-');
    // 生成名称: "属性1: 值1 / 属性2: 值2"
    const nameParts = variantNames.map((name, i) => `${name}: ${combination[i]}`);
    // 生成 SKU 代码: 用 '_' 连接所有值（大写）
    const skuCode = combination.map(v => v.replace(/\s+/g, '_')).join('_').toUpperCase();
    
    return {
      id: id || `sku-${index + 1}`,
      name: nameParts.join(' / '),
      price: null,
      stock: null,
      sku_code: skuCode || `SKU_${index + 1}`
    };
  });
  
  console.log('[ProductMapper] ✅ 生成的 SKU 列表数量:', skuList.length);
  if (skuList.length > 0 && skuList.length <= 5) {
    console.log('[ProductMapper] SKU 列表预览:', JSON.stringify(skuList, null, 2));
  }
  
  return skuList;
}

/**
 * ⭐ 笛卡尔积计算（支持多个数组）
 */
function cartesianProduct(arrays) {
  if (!Array.isArray(arrays) || arrays.length === 0) {
    return [];
  }
  
  // 过滤掉空数组
  const filtered = arrays.filter(arr => Array.isArray(arr) && arr.length > 0);
  if (filtered.length === 0) {
    return [];
  }
  
  // 如果只有一个数组，返回每个元素的单元素数组
  if (filtered.length === 1) {
    return filtered[0].map(item => [item]);
  }
  
  // 多个数组：笛卡尔积
  return filtered.reduce((acc, curr) => {
    const result = [];
    for (const a of acc) {
      for (const c of curr) {
        result.push([...a, c]);
      }
    }
    return result;
  }, [[]]);
}

// ============================================================
// ⭐ 核心映射函数
// ============================================================

export function mapToProduct(rawData, platform) {
  console.log('[ProductMapper] mapToProduct 开始, platform:', platform);
  
  const rules = PLATFORM_RULES[platform];
  if (!rules) {
    throw new Error(`不支持的平台: ${platform}`);
  }

  // 1. 提取核心字段
  const sourceId = extractSourceId(rawData.url, platform);
  const currency = rules.currencyExtractor(rawData) || 'USD';
  const priceTiers = rules.priceParser(rawData.price, currency);
  
  // 2. 构建商品对象
  const product = createEmptyProduct();
  
  // 核心标识
  product.platform = platform;
  product.source_url = rawData.url || '';
  product.source_product_id = sourceId || '';
  
  // 基本信息
  product.product_name = rawData.title || rawData.product_name || '';
  product.description = rawData.description || '';
  product.short_description = generateShortDescription(rawData.description);
  product.brand = rawData.supplier || rawData.brand || '';
  product.slug = generateSlug(product.product_name, sourceId);
  
  // 价格信息
  product.price_tiers = priceTiers;
  product.currency = currency;
  
  // 库存与起订量
  product.min_order_quantity = parseInt(rawData.moq) || 1;
  product.availability = rawData.stock > 0 ? 'in_stock' : 'in_stock';
  
  // 图片
  product.main_image_url = rawData.main_image || 
    (Array.isArray(rawData.gallery_images) ? rawData.gallery_images[0] : '');
  product.additional_images = Array.isArray(rawData.gallery_images) ? 
    rawData.gallery_images : 
    (Array.isArray(rawData.images) ? rawData.images : []);
  
  // ⭐ SKU - 支持多种字段名，生成笛卡尔积
  let skuData = [];
  
  // 检查所有可能的 SKU 字段
  console.log('[ProductMapper] 检查 SKU 数据字段...');
  console.log('  rawData.sku:', Array.isArray(rawData.sku) ? `数组, 长度 ${rawData.sku.length}` : typeof rawData.sku);
  console.log('  rawData.sku_list:', Array.isArray(rawData.sku_list) ? `数组, 长度 ${rawData.sku_list.length}` : typeof rawData.sku_list);
  console.log('  rawData.variants:', Array.isArray(rawData.variants) ? `数组, 长度 ${rawData.variants.length}` : typeof rawData.variants);
  console.log('  rawData.skus:', Array.isArray(rawData.skus) ? `数组, 长度 ${rawData.skus.length}` : typeof rawData.skus);
  
  if (Array.isArray(rawData.sku) && rawData.sku.length > 0) {
    skuData = rawData.sku;
    console.log('[ProductMapper] ✅ 从 sku 获取，数量:', skuData.length);
  } else if (Array.isArray(rawData.sku_list) && rawData.sku_list.length > 0) {
    skuData = rawData.sku_list;
    console.log('[ProductMapper] ✅ 从 sku_list 获取，数量:', skuData.length);
  } else if (Array.isArray(rawData.variants) && rawData.variants.length > 0) {
    // ⭐ 从 variants 生成 SKU 组合（笛卡尔积）
    console.log('[ProductMapper] 🔄 从 variants 转换 SKU 列表...');
    skuData = convertVariantsToSkus(rawData.variants);
    console.log('[ProductMapper] ✅ 从 variants 生成 sku_list，组合数:', skuData.length);
  } else if (Array.isArray(rawData.skus) && rawData.skus.length > 0) {
    skuData = rawData.skus;
    console.log('[ProductMapper] ✅ 从 skus 获取，数量:', skuData.length);
  } else {
    console.log('[ProductMapper] ⚠️ 未找到 SKU 数据');
  }
  
  // ⭐ 如果 skuData 中的 SKU 格式是简单的字符串数组，转换为对象格式
  if (skuData.length > 0 && typeof skuData[0] === 'string') {
    console.log('[ProductMapper] 🔄 将字符串数组转换为 SKU 对象格式...');
    skuData = skuData.map((value, index) => ({
      id: `sku-${index + 1}`,
      name: value,
      price: null,
      stock: null,
      sku_code: value.toUpperCase().replace(/\s+/g, '_')
    }));
  }
  
  product.sku = generateSku(sourceId, platform);
  product.sku_list = skuData;
  
  // 属性
  product.attributes = rawData.attributes || {};
  if (rawData.supplier) {
    product.attributes.supplier = rawData.supplier;
  }
  if (rawData.location) {
    product.attributes.location = rawData.location;
  }
  product.spec_text = rawData.spec_text || '';
  
  // 状态
  product.status = 'draft';
  product.import_status = 'pending';
  
  // 元信息
  product.collected_at = rawData.collectedAt || new Date().toISOString();
  product.collected_by = 'plugin';
  product.template_id = rawData.templateId || '';
  product.raw_data = rawData;
  
  console.log('[ProductMapper] mapToProduct 完成, 商品名称:', product.product_name);
  console.log('[ProductMapper] 最终 sku_list 数量:', product.sku_list?.length || 0);
  
  return cleanProduct(product);
}

export function mapToProducts(rawDataList, platform) {
  return rawDataList.map(raw => mapToProduct(raw, platform));
}

// ============================================================
// 导出
// ============================================================

export default {
  mapToProduct,
  mapToProducts,
  parsePrice,
  extractCurrency,
  extractSourceId,
  convertVariantsToSkus,
  cartesianProduct
};