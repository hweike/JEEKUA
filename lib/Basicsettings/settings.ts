// lib/Basicsettings/settings.ts
import sql from '@/lib/db/admin';

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
  logo: string;
}

const DEFAULT_SITE_ID = '000001';

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
  logo: '',
};

export async function getSettings(): Promise<BasicSettings> {
  let data: any;
  try {
    const rows = await sql<any[]>`
      SELECT * FROM public.sites_settings
      WHERE site_id = ${DEFAULT_SITE_ID}
      LIMIT 1
    `;
    data = rows[0];
  } catch (error: any) {
    throw new Error(`获取设置失败: ${error.message}`);
  }

  // 如果不存在，创建默认记录
  if (!data) {
    try {
      const rows = await sql<any[]>`
        INSERT INTO public.sites_settings (
          site_id, site_name, website_url, default_locale, target_audience,
          contact_email, contact_phone, company_name, country,
          registered_address, city, province, postal_code,
          brand, social_share_image, logo
        ) VALUES (
          ${DEFAULT_SITE_ID}, ${defaultSettings.siteName}, ${defaultSettings.websiteUrl},
          ${defaultSettings.defaultLocale}, ${defaultSettings.targetAudience},
          ${defaultSettings.contactEmail}, ${defaultSettings.contactPhone},
          ${defaultSettings.companyName}, ${defaultSettings.country},
          ${defaultSettings.registeredAddress}, ${defaultSettings.city},
          ${defaultSettings.province}, ${defaultSettings.postalCode},
          ${defaultSettings.brand}, ${defaultSettings.socialShareImage},
          ${defaultSettings.logo}
        )
        RETURNING *
      `;
      if (!rows[0]) throw new Error('初始化设置未返回数据');
      return mapDbToSettings(rows[0]);
    } catch (insertError: any) {
      throw new Error(`初始化设置失败: ${insertError.message}`);
    }
  }

  return mapDbToSettings(data);
}

export async function updateSettings(settings: BasicSettings): Promise<void> {
  try {
    await sql`
      UPDATE public.sites_settings
      SET site_name = ${settings.siteName},
          website_url = ${settings.websiteUrl},
          default_locale = ${settings.defaultLocale},
          target_audience = ${settings.targetAudience},
          contact_email = ${settings.contactEmail},
          contact_phone = ${settings.contactPhone},
          company_name = ${settings.companyName},
          country = ${settings.country},
          registered_address = ${settings.registeredAddress},
          city = ${settings.city},
          province = ${settings.province},
          postal_code = ${settings.postalCode},
          brand = ${settings.brand},
          social_share_image = ${settings.socialShareImage},
          logo = ${settings.logo},
          updated_at = ${new Date().toISOString()}
      WHERE site_id = ${DEFAULT_SITE_ID}
    `;
  } catch (error: any) {
    throw new Error(`更新设置失败: ${error.message}`);
  }
}

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
    logo: dbRow.logo || '',
  };
}