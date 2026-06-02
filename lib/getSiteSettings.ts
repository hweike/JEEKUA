import fs from 'fs/promises';
import path from 'path';
import { cache } from 'react';

export interface SiteSettings {
  siteName: string;
  websiteUrl: string;
  contactEmail: string;
  contactPhone: string;
  companyName: string;
  country: string;
  registeredAddress: string;
  city: string;
  province: string;
  postalCode: string;
  brand: string[];   // 新增
}

const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: "JEEKUA TECH",
  websiteUrl: "",
  contactEmail: "",
  contactPhone: "",
  companyName: "",
  country: "中国",
  registeredAddress: "",
  city: "",
  province: "",
  postalCode: "",
  brand: [],   // 默认空数组
};

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const filePath = path.join(process.cwd(), 'data/settings.json');
    const content = await fs.readFile(filePath, 'utf-8');
    const userSettings = JSON.parse(content);
    // 兼容旧数据：如果缺少 websiteUrl 则补充默认值
    if (userSettings.websiteUrl === undefined) {
      userSettings.websiteUrl = "";
    }
    // 兼容旧数据：如果缺少 brand 则补充默认空数组
    if (userSettings.brand === undefined) {
      userSettings.brand = [];
    }
    return { ...DEFAULT_SITE_SETTINGS, ...userSettings };
  } catch (error) {
    console.error('Failed to load site settings, using default:', error);
    return DEFAULT_SITE_SETTINGS;
  }
});