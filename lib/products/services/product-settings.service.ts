// lib/products/services/product-settings.service.ts
import { getPrivateStorage } from '@/lib/storage/factory';

export const DEFAULT_SETTINGS = {
  default_min_order_qty: 1,
  default_availability: 'in_stock',
  default_brand: 'Generic',
  sku_rule: 'P-{timestamp}',
  default_currency: 'USD',
  default_shipping_cost: 0,
  default_return_days: 30,
  default_mpn: '',
  storeLinks: [
    { name: '', url: '' },
    { name: '', url: '' },
  ],
};

function getStorageKey(locale: string): string {
  return `products/${locale}/settings.json`;
}

export async function getProductSettings(locale: string): Promise<{ defaultSettings: any; attributeTemplates: any[] } | null> {
  const storage = getPrivateStorage();
  const key = getStorageKey(locale);
  try {
    const content = await storage.read(key, 'utf8');
    const parsed = JSON.parse(content as string);
    return {
      defaultSettings: parsed.defaultSettings ?? null,
      attributeTemplates: Array.isArray(parsed.attributeTemplates) ? parsed.attributeTemplates : [],
    };
  } catch (error: any) {
    if (error?.code === 'NoSuchKey' || error?.Code === 'NoSuchKey' || error?.message?.includes('File not found')) {
      return null; // 文件不存在
    }
    throw error;
  }
}

export async function updateProductSettings(locale: string, body: { defaultSettings?: any; attributeTemplates?: any[] }): Promise<void> {
  const storage = getPrivateStorage();
  const key = getStorageKey(locale);

  let existingData: any = {};
  try {
    const content = await storage.read(key, 'utf8');
    existingData = JSON.parse(content as string);
  } catch (error: any) {
    if (!(error?.code === 'NoSuchKey' || error?.Code === 'NoSuchKey' || error?.message?.includes('File not found'))) {
      throw error;
    }
  }

  const newData = {
    defaultSettings: body.defaultSettings !== undefined ? body.defaultSettings : existingData.defaultSettings,
    attributeTemplates: body.attributeTemplates !== undefined ? body.attributeTemplates : (existingData.attributeTemplates || []),
  };

  await storage.write(key, JSON.stringify(newData, null, 2), { contentType: 'application/json' });
}

export async function initializeProductSettings(locales: string[]): Promise<{ locale: string; success: boolean; error?: string }[]> {
  const storage = getPrivateStorage();
  const results: { locale: string; success: boolean; error?: string }[] = [];

  for (const locale of locales) {
    try {
      const key = getStorageKey(locale);

      let existingAttributeTemplates: any[] = [];
      try {
        const content = await storage.read(key, 'utf8');
        const existingData = JSON.parse(content as string);
        if (Array.isArray(existingData.attributeTemplates)) {
          existingAttributeTemplates = existingData.attributeTemplates;
        }
      } catch (error: any) {
        if (!(error?.code === 'NoSuchKey' || error?.Code === 'NoSuchKey' || error?.message?.includes('File not found'))) {
          throw error;
        }
      }

      const newData = {
        defaultSettings: DEFAULT_SETTINGS,
        attributeTemplates: existingAttributeTemplates,
      };

      await storage.write(key, JSON.stringify(newData, null, 2), { contentType: 'application/json' });
      results.push({ locale, success: true });
    } catch (err: any) {
      results.push({ locale, success: false, error: err.message });
    }
  }
  return results;
}