// lib/getSiteSettings.ts
import { getConfigWithCache, invalidateConfig } from '@/lib/config-cache';
import { supabaseAdmin } from '@/lib/supabase/admin-client';

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
  socialShareImage?: string;
  address?: string;
  phone?: string;
  email?: string;
}

const DEFAULT_SITE_ID = '000001';
const CACHE_KEY = `site-settings:${DEFAULT_SITE_ID}`;

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
  socialShareImage: '',
  address: '217, Building B, South International Plaza, NO.3013 Yitian Road, Shenzhen, Guangdong, China',
  phone: '+86 18123913227',
  email: 'vic@feisman.cn',
};

/**
 * 实际查询数据库的逻辑
 */
async function fetchSiteSettings(): Promise<SiteSettings> {
  try {
    const { data, error } = await supabaseAdmin
      .from('sites_settings')
      .select('*')
      .eq('site_id', DEFAULT_SITE_ID)
      .maybeSingle();

    if (error) {
      console.warn('[getSiteSettings] 获取站点设置失败，使用默认配置:', error.message);
      return DEFAULT_SITE_SETTINGS;
    }

    if (!data) {
      console.warn('[getSiteSettings] 未找到站点设置记录，使用默认配置');
      return DEFAULT_SITE_SETTINGS;
    }

    let brand: string[] = [];
    if (data.brand) {
      try {
        brand = typeof data.brand === 'string' ? JSON.parse(data.brand) : data.brand;
        if (!Array.isArray(brand)) brand = [];
      } catch {
        brand = [];
      }
    }

    const addressParts = [
      data.registered_address,
      data.city,
      data.province,
      data.country,
    ].filter(Boolean);
    const fullAddress = addressParts.join(', ');

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
      socialShareImage: data.social_share_image || '',
      address: fullAddress || DEFAULT_SITE_SETTINGS.address,
      phone: data.contact_phone || DEFAULT_SITE_SETTINGS.phone,
      email: data.contact_email || DEFAULT_SITE_SETTINGS.email,
    };
  } catch (error) {
    console.error('[getSiteSettings] 加载站点设置异常，使用默认配置:', error);
    return DEFAULT_SITE_SETTINGS;
  }
}

/**
 * 对外 API：带内存缓存
 * - 首次查询慢（Supabase 冷启动），之后 10 分钟内全部命中内存
 * - 配合 instrumentation.ts 预热，可以把首次查询提前到服务启动时
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    return await getConfigWithCache(CACHE_KEY, fetchSiteSettings, 600);
  } catch (err) {
    console.error('[getSiteSettings] 缓存获取失败，使用默认配置:', err);
    return { ...DEFAULT_SITE_SETTINGS };
  }
}

/**
 * 管理后台更新站点设置后调用，使缓存失效
 */
export function invalidateSiteSettings() {
  invalidateConfig(CACHE_KEY);
}