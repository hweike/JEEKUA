// lib/productConfig.ts
import { getProductSettings } from '@/lib/products/productSettings';

export async function getProductUrlPattern(locale: string = 'zh'): Promise<string> {
  const settings = await getProductSettings(locale);
  return settings.defaultSettings?.product_url_pattern || 'slug-only';
}