// lib/siteSettings.ts
import { getPrivateStorage } from '@/lib/storage/factory';

const defaultSettings = {
  site_name: '飞斯曼工业',
  site_brand_name: 'FEISMAN',
  site_currency: 'USD',
  default_shipping_rate: 0,
  return_policy_days: 30,
  site_logo: '/logo.png',
  default_og_image: '/og-default.jpg',
};

/**
 * 获取站点设置（从私有桶读取 data/settings.json）
 */
export async function getSiteSettings() {
  const storage = getPrivateStorage();
  const key = 'data/settings.json';
  try {
    const content = await storage.read(key, 'utf8');
    const parsed = JSON.parse(content as string);
    return { ...defaultSettings, ...parsed };
  } catch (error: any) {
    // 文件不存在或读取失败，返回默认设置
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      return defaultSettings;
    }
    console.error('读取站点设置失败:', error);
    return defaultSettings;
  }
}