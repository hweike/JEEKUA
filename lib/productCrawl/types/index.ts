// lib/productCrawl/types/index.ts

/**
 * ============================================================
 * 字段提取配置
 * ============================================================
 */

export interface CrawlerFieldConfig {
  selectors: string[];
  // 🔥 确保包含 'attributes' 类型
  type: 'text' | 'html' | 'attr' | 'attrAll' | 'styleAll' | 'currency' | 'price' | 'key_value_pairs' | 'list' | 'attributes';
  attribute?: string;
  fallback?: any;
}

/**
 * 平台爬虫配置
 */
export interface CrawlerPlatformConfig {
  name: string;
  domain_patterns: string[];
  login_required?: boolean;
  fields: Record<string, CrawlerFieldConfig>;
  field_mapping?: Record<string, string>;
  extractors?: Record<string, any>;
}

/**
 * 完整爬虫配置
 */
export interface CrawlerConfig {
  version: string;
  updated_at: string;
  platforms: Record<string, CrawlerPlatformConfig>;
}

/**
 * ============================================================
 * 采集商品数据（与 products 表对齐）
 * ============================================================
 */

export interface ProductCrawlData {
  // 核心字段
  productId?: string;
  productLineId?: string;
  categoryId?: string;
  seriesId?: string;
  parent_product_id?: string;
  sku: string;
  product_name: string;
  brand?: string;
  price_tiers?: any;
  currency?: string;
  availability?: string;
  min_order_quantity?: number;
  main_image_url?: string;
  additional_images?: string[];
  description?: string;
  short_description?: string;
  attributes?: Record<string, string>;
  spec_text?: string;
  slug?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  templateId?: string;

  // 采集来源
  platform: string;
  source_url: string;
  source_product_id?: string;
  source_locale?: string;

  // 采集元数据
  collected_at?: string;
  collected_by?: string;
}

/**
 * ============================================================
 * 导入相关类型（新增）
 * ============================================================
 */

/**
 * 采集数据临时表记录
 */
export interface CrawlerProduct {
  crawler_id: string;
  site_id: string;
  locale: string;
  product_id: string;
  product_line_id?: string;
  category_id?: string;
  series_id?: string;
  parent_product_id?: string;
  sku: string;
  product_name: string;
  brand?: string;
  price_tiers: any;
  currency: string;
  availability: string;
  min_order_quantity: number;
  main_image_url?: string;
  additional_images?: string[];
  description?: string;
  short_description?: string;
  attributes?: Record<string, string>;
  spec_text?: string;
  slug?: string;
  platform: string;
  source_url: string;
  source_product_id?: string;
  source_locale: string;
  collected_at: string;
  collected_by: string;
  import_status: 'pending' | 'imported' | 'skipped' | 'failed';
  imported_at?: string;
  import_error?: string;
  created_at: string;
  updated_at: string;
  sku_list?: SkuVariant[];
}

/**
 * SKU 变体
 */
export interface SkuVariant {
  id: string;
  name: string;
  price?: number | null;
  stock?: number | null;
  sku_code?: string;
  attributes?: Record<string, string>;
  image_url?: string;
}

/**
 * 导入请求
 */
export interface ImportRequest {
  crawlerIds: string[];
  categoryId: string;
  seriesId?: string;
  locale: string;
  siteId?: string;
}

/**
 * 导入结果项
 */
export interface ImportResultItem {
  crawler_id: string;
  sku: string;
  source_url: string;
  status: 'pending' | 'success' | 'skipped' | 'failed' | 'processing';
  product_id?: string;
  message: string;
}

/**
 * 导入响应
 */
export interface ImportResponse {
  success: boolean;
  imported_count: number;
  skipped_count: number;
  failed_count: number;
  imported_ids: string[];
  results: ImportResultItem[];
  message: string;
}

/**
 * ============================================================
 * 批量保存结果（已存在）
 * ============================================================
 */

export interface BatchSaveResult {
  success: number;
  failed: number;
  errors: string[];
}

/**
 * ============================================================
 * 导入结果（已存在，保留兼容）
 * ============================================================
 */

export interface ImportResult {
  success: boolean;
  imported_count: number;
  skipped_count: number;
  errors: string[];
}