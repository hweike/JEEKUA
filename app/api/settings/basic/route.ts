// app/api/settings/basic/route.ts
import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/Basicsettings/settings';

/**
 * ✅ 公开的站点基本设置 API
 * 只返回可公开的字段（网站名、公司名、地址、电话、邮箱、Logo）
 * 不需要认证，供分享页面等公开场景使用
 */
export async function GET() {
  try {
    const settings = await getSettings();

    return NextResponse.json({
      success: true,
      data: {
        siteName: settings.siteName || '',
        companyName: settings.companyName || '',
        registeredAddress: settings.registeredAddress || '',
        contactPhone: settings.contactPhone || '',
        contactEmail: settings.contactEmail || '',
        logo: settings.logo || '',
      },
    });
  } catch (error: any) {
    console.error('[API] 获取站点基本设置失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取设置失败' },
      { status: 500 }
    );
  }
}