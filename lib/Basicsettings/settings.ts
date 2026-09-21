// lib/Basicsettings/settings.ts
import { supabase } from '@/lib/supabase/client';

export interface BasicSettings {
  siteName: string;
  websiteUrl: string;
  defaultLocale: string;
  targetAudience: string;
  contactEmail: string;
  contactPhone: string;
  companyName: string;
  country: string;
  registeredAddress: string;
  city: string;
  province: string;
  postalCode: string;
  brand: string[];
  socialShareImage: string;
  logo: string; // 新增：企业 Logo
}

const DEFAULT_SITE_ID = '000001';

// 默认设置（包含新增字段默认值）
const defaultSettings: BasicSettings = {
  siteName: '',
  websiteUrl: '',
  defaultLocale: 'en',
  targetAudience: '',
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
  logo: '', // 新增
};

// 获取设置
export async function getSettings(): Promise<BasicSettings> {
  const { data, error } = await supabase
    .from('sites_settings')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .single();

  if (error) {
    // 如果记录不存在，创建默认记录并返回
    if (error.code === 'PGRST116') {
      const { data: newData, error: insertError } = await supabase
        .from('sites_settings')
        .insert({
          site_id: DEFAULT_SITE_ID,
          site_name: defaultSettings.siteName,
          website_url: defaultSettings.websiteUrl,
          default_locale: defaultSettings.defaultLocale,
          target_audience: defaultSettings.targetAudience,
          contact_email: defaultSettings.contactEmail,
          contact_phone: defaultSettings.contactPhone,
          company_name: defaultSettings.companyName,
          country: defaultSettings.country,
          registered_address: defaultSettings.registeredAddress,
          city: defaultSettings.city,
          province: defaultSettings.province,
          postal_code: defaultSettings.postalCode,
          brand: defaultSettings.brand,
          social_share_image: defaultSettings.socialShareImage,
          logo: defaultSettings.logo, // 新增
        })
        .select()
        .single();

      if (insertError) throw new Error(`初始化设置失败: ${insertError.message}`);
      return mapDbToSettings(newData);
    }
    throw new Error(`获取设置失败: ${error.message}`);
  }

  return mapDbToSettings(data);
}

// 更新设置
export async function updateSettings(settings: BasicSettings): Promise<void> {
  const { error } = await supabase
    .from('sites_settings')
    .update({
      site_name: settings.siteName,
      website_url: settings.websiteUrl,
      default_locale: settings.defaultLocale,
      target_audience: settings.targetAudience,
      contact_email: settings.contactEmail,
      contact_phone: settings.contactPhone,
      company_name: settings.companyName,
      country: settings.country,
      registered_address: settings.registeredAddress,
      city: settings.city,
      province: settings.province,
      postal_code: settings.postalCode,
      brand: settings.brand,
      social_share_image: settings.socialShareImage,
      logo: settings.logo, // 新增
      updated_at: new Date().toISOString(),
    })
    .eq('site_id', DEFAULT_SITE_ID);

  if (error) throw new Error(`更新设置失败: ${error.message}`);
}

// 数据库字段 → 前端字段映射
function mapDbToSettings(dbRow: any): BasicSettings {
  return {
    siteName: dbRow.site_name || '',
    websiteUrl: dbRow.website_url || '',
    defaultLocale: dbRow.default_locale || 'en',
    targetAudience: dbRow.target_audience || '',
    contactEmail: dbRow.contact_email || '',
    contactPhone: dbRow.contact_phone || '',
    companyName: dbRow.company_name || '',
    country: dbRow.country || 'China',
    registeredAddress: dbRow.registered_address || '',
    city: dbRow.city || '',
    province: dbRow.province || '',
    postalCode: dbRow.postal_code || '',
    brand: Array.isArray(dbRow.brand) ? dbRow.brand : [],
    socialShareImage: dbRow.social_share_image || '',
    logo: dbRow.logo || '', // 新增
  };
}