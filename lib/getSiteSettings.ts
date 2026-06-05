// lib/getSiteSettings.ts
import { cache } from 'react';
import { getPrivateStorage } from '@/lib/storage/factory';

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
  brand: string[];
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
  brand: [],
};

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const storage = getPrivateStorage();
  const key = 'data/settings.json';
  try {
    const content = await storage.read(key, 'utf8');
    const userSettings = JSON.parse(content as string);
    // 兼容旧数据：如果缺少 websiteUrl 则补充默认值
    if (userSettings.websiteUrl === undefined) {
      userSettings.websiteUrl = "";
    }
    // 兼容旧数据：如果缺少 brand 则补充默认空数组
    if (userSettings.brand === undefined) {
      userSettings.brand = [];
    }
    return { ...DEFAULT_SITE_SETTINGS, ...userSettings };
  } catch (error: any) {
    // 文件不存在或读取失败，返回默认设置
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      console.warn('Site settings file not found, using defaults.');
    } else {
      console.error('Failed to load site settings, using default:', error);
    }
    return DEFAULT_SITE_SETTINGS;
  }
});