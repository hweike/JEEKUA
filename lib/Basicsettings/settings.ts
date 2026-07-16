// lib/Basicsettings/settings.ts
import { supabase } from '@/lib/supabase/client';

export interface BasicSettings {
  siteName: string;
  websiteUrl: string;
  defaultLocale: string;        // 新增
  targetAudience: string;        // 新增
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

// 默认设置（注意新增字段默认值）
const defaultSettings: BasicSettings = {
  siteName: '',
  websiteUrl: '',
  defaultLocale: 'en',           // 默认英文
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
    if (error.code === 'PGRST116') { // 没有找到记录
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
  };
}