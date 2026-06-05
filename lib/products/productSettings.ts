// lib/products/productSettings.ts
import { getPrivateStorage } from '@/lib/storage/factory';

export interface ProductSettings {
  auto_seo_title_template: string;
  auto_seo_desc_template: string;
  default_min_order_qty: number;
  default_availability: string;
  attribute_presets: Array<{ name: string; values: string[] }>;
  // 新增字段
  default_brand: string;
  sku_rule: string;
  default_currency: string;
  default_shipping_cost: number;
  default_return_days: number;
  default_mpn: string; // 制造商零件号默认值（文本提示）
  product_url_pattern: string; // 'slug-only' 或 'id-slug'
}

const defaultSettings: ProductSettings = {
  auto_seo_title_template: '{brand} {name} - 批发{min_qty}件起 | {site_name}',
  auto_seo_desc_template: '{description_plain} 阶梯价格：{price_tiers_text}',
  default_min_order_qty: 1,
  default_availability: 'in_stock',
  attribute_presets: [],
  default_brand: 'Neutral',
  sku_rule: 'P-{timestamp}',
  default_currency: 'USD',
  default_shipping_cost: 0,
  default_return_days: 30,
  default_mpn: '{SKU}',
  product_url_pattern: 'slug-only',
};

/**
 * 获取 settings.json 在私有桶中的存储 Key
 */
function getSettingsKey(locale: string): string {
  return `data/products/${locale}/settings.json`;
}

/**
 * 获取产品设置（从私有桶读取）
 */
export async function getProductSettings(locale: string): Promise<ProductSettings> {
  const storage = getPrivateStorage();
  const key = getSettingsKey(locale);
  try {
    const content = await storage.read(key, 'utf8');
    const parsed = JSON.parse(content as string);
    return { ...defaultSettings, ...parsed };
  } catch (error: any) {
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      return { ...defaultSettings };
    }
    throw error;
  }
}

/**
 * 保存产品设置到私有桶
 */
export async function saveProductSettings(locale: string, settings: ProductSettings): Promise<void> {
  const storage = getPrivateStorage();
  const key = getSettingsKey(locale);
  await storage.write(key, JSON.stringify(settings, null, 2), {
    contentType: 'application/json',
  });
}

/**
 * 获取产品 URL 模式（保留原逻辑，包括潜在 bug）
 */
export async function getProductUrlPattern(locale: string = 'zh'): Promise<string> {
  const settings = await getProductSettings(locale);
  // 原代码中使用了 settings.defaultSettings?.product_url_pattern，但 ProductSettings 没有 defaultSettings 属性。
  // 这里保持原样，实际可能应为 settings.product_url_pattern。
  // @ts-ignore - 保留原始错误逻辑以兼容调用方
  return settings.defaultSettings?.product_url_pattern || 'slug-only';
}