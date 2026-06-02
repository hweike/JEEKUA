// lib/products/productSettings.ts
import fs from 'fs/promises';
import path from 'path';

function getSettingsPath(locale: string) {
  return path.join(process.cwd(), 'data/products', locale, 'settings.json');
}

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
  default_mpn: '{SKU}', // 为空表示不自动填充
  product_url_pattern: 'slug-only',
};

export async function getProductSettings(locale: string): Promise<ProductSettings> {
  const filePath = getSettingsPath(locale);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(data);
    return { ...defaultSettings, ...parsed };
  } catch {
    return { ...defaultSettings };
  }
}

export async function saveProductSettings(locale: string, settings: ProductSettings) {
  const filePath = getSettingsPath(locale);
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(settings, null, 2), 'utf-8');
}

export async function getProductUrlPattern(locale: string = 'zh'): Promise<string> {
  const settings = await getProductSettings(locale);
  return settings.defaultSettings?.product_url_pattern || 'slug-only';
}