// lib/getSiteSettings.ts

import { cache } from 'react';
import { supabase } from '@/lib/supabase/client';

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

const DEFAULT_SITE_ID = '000001';

const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: 'JEEKUA TECH',
  websiteUrl: '',
  contactEmail: '',
  contactPhone: '',
  companyName: '',
  country: 'China',
  registeredAddress: '',
  city: '',
  province: '',
  postalCode: '',
  brand: [],
};

/**
 * 从 Supabase 数据库获取站点设置
 * 优先使用数据库配置，若无则使用默认值
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const { data, error } = await supabase
      .from('sites_settings')
      .select('*')
      .eq('site_id', DEFAULT_SITE_ID)
      .single();

    if (error) {
      console.warn('获取站点设置失败，使用默认配置:', error.message);
      return DEFAULT_SITE_SETTINGS;
    }

    if (!data) {
      console.warn('未找到站点设置记录，使用默认配置');
      return DEFAULT_SITE_SETTINGS;
    }

    // ✅ 将数据库字段映射到 SiteSettings 接口
    // brand 字段是 JSON 字符串，需要解析为数组
    let brand: string[] = [];
    if (data.brand) {
      try {
        brand = typeof data.brand === 'string' ? JSON.parse(data.brand) : data.brand;
      } catch {
        brand = [];
      }
    }

    return {
      siteName: data.site_name || DEFAULT_SITE_SETTINGS.siteName,
      websiteUrl: data.website_url || DEFAULT_SITE_SETTINGS.websiteUrl,
      contactEmail: data.contact_email || DEFAULT_SITE_SETTINGS.contactEmail,
      contactPhone: data.contact_phone || DEFAULT_SITE_SETTINGS.contactPhone,
      companyName: data.company_name || DEFAULT_SITE_SETTINGS.companyName,
      country: data.country || DEFAULT_SITE_SETTINGS.country,
      registeredAddress: data.registered_address || DEFAULT_SITE_SETTINGS.registeredAddress,
      city: data.city || DEFAULT_SITE_SETTINGS.city,
      province: data.province || DEFAULT_SITE_SETTINGS.province,
      postalCode: data.postal_code || DEFAULT_SITE_SETTINGS.postalCode,
      brand,
    };
  } catch (error) {
    console.error('加载站点设置异常，使用默认配置:', error);
    return DEFAULT_SITE_SETTINGS;
  }
});