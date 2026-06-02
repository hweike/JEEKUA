import fs from 'fs/promises';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data/settings.json');

const defaultSettings = {
  site_name: '飞斯曼工业',
  site_brand_name: 'FEISMAN',
  site_currency: 'USD',
  default_shipping_rate: 0,
  return_policy_days: 30,
  site_logo: '/logo.png',
  default_og_image: '/og-default.jpg',
};

// export async function getSiteSettings() {
//   try {
//     const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
//     return { ...defaultSettings, ...JSON.parse(data) };
//   } catch {
//     return defaultSettings;
//   }
// }

// lib/siteSettings.ts
// 这是一个临时模拟文件，用于绕过模块解析错误
export async function getSiteSettings() {
  return {
    site_name: '我的网站',
    site_brand_name: 'MyBrand',
    site_currency: 'USD',
    default_shipping_rate: 0,
    return_policy_days: 30,
  };
}