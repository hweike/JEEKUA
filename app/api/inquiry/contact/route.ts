// app/api/inquiry/contact/route.ts
import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/Basicsettings/settings';

export async function GET() {
  try {
    const settings = await getSettings();

    // 组装地址（过滤空值）
    const addressParts = [
      settings.registeredAddress,
      settings.city,
      settings.province,
      settings.country,
      settings.postalCode,
    ].filter(Boolean);
    const address = addressParts.length > 0 ? addressParts.join(', ') : '';

    const companyName = settings.companyName?.trim() || '';
    const email = settings.contactEmail?.trim() || '';
    const phone = settings.contactPhone?.trim() || '';

    // 判断是否有任何有效信息（至少一项非空）
    const hasContactInfo = !!(companyName || address || phone || email);

    // 如果有信息，返回完整数据；否则仅返回 hasContactInfo: false
    return NextResponse.json({
      hasContactInfo,
      ...(hasContactInfo ? { companyName, address, phone, email } : {}),
    });
  } catch (error) {
    console.error('获取联系信息失败:', error);
    // 出错时视为未配置
    return NextResponse.json({ hasContactInfo: false });
  }
}