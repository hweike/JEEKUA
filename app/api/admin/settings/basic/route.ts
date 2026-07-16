// app/api/admin/settings/basic/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { findUserByEmail } from '@/lib/auth/users';
import { getSettings, updateSettings, BasicSettings } from '@/lib/Basicsettings/settings';
import { validateEmail, validatePhone } from '@/lib/Basicsettings/validation';

async function isSuperAdmin(request: NextRequest): Promise<boolean> {
  const payload = await getCurrentUser(request);
  if (!payload) return false;
  const user = await findUserByEmail(payload.username);
  return user?.role === 'super';
}

export async function GET(request: NextRequest) {
  if (!(await isSuperAdmin(request))) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }
  const settings = await getSettings();
  return NextResponse.json(settings);
}

export async function POST(request: NextRequest) {
  if (!(await isSuperAdmin(request))) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  const body: Partial<BasicSettings> = await request.json();
  const {
    siteName,
    websiteUrl,
    defaultLocale,       // 新增
    targetAudience,      // 新增
    contactEmail,
    contactPhone,
    companyName,
    country,
    registeredAddress,
    city,
    province,
    postalCode,
    brand,
  } = body;

  const brandList = Array.isArray(brand) ? brand : [];

  // 网站名称必填
  if (!siteName || siteName.trim() === '') {
    return NextResponse.json({ error: '网站名称不能为空' }, { status: 400 });
  }
  // 网址必填且格式验证
  if (!websiteUrl || websiteUrl.trim() === '') {
    return NextResponse.json({ error: '网址不能为空' }, { status: 400 });
  }
  const urlRegex = /^https?:\/\/.+/;
  if (!urlRegex.test(websiteUrl.trim())) {
    return NextResponse.json({ error: '网址必须以 http:// 或 https:// 开头' }, { status: 400 });
  }

  // 邮箱格式验证（可选）
  if (contactEmail && contactEmail.trim() !== '' && !validateEmail(contactEmail)) {
    return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 });
  }
  // 电话格式验证（可选）
  if (contactPhone && contactPhone.trim() !== '' && !validatePhone(contactPhone)) {
    return NextResponse.json({ error: '电话格式不正确' }, { status: 400 });
  }

  // 组装新设置（所有字段必填字符串，空值转为空字符串）
  const newSettings: BasicSettings = {
    siteName: siteName.trim(),
    websiteUrl: websiteUrl.trim(),
    defaultLocale: defaultLocale?.trim() || 'en',   // 默认英文
    targetAudience: targetAudience?.trim() || '',
    contactEmail: contactEmail?.trim() || '',
    contactPhone: contactPhone?.trim() || '',
    companyName: companyName?.trim() || '',
    country: country?.trim() || 'China',
    registeredAddress: registeredAddress?.trim() || '',
    city: city?.trim() || '',
    province: province?.trim() || '',
    postalCode: postalCode?.trim() || '',
    brand: brandList,
  };

  await updateSettings(newSettings);
  return NextResponse.json({ success: true });
}