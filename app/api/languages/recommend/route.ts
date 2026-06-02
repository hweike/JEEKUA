import { NextRequest, NextResponse } from 'next/server';
import { getEnabledLanguages } from '@/lib/languages/settings';
import { getOfficialLanguage } from '@/lib/languages/country-language';

export async function GET(request: NextRequest) {
  // 获取客户端 IP
  let ip = request.headers.get('x-forwarded-for')?.split(',')[0] 
        || request.headers.get('x-real-ip') 
        || '';

  // 本地开发环境使用默认 IP（中国）
  if (ip === '::1' || ip === '127.0.0.1' || !ip) {
    ip = '114.114.114.114';
  }

  let countryCode = null;
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,countryCode`, {
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    if (data.status === 'success') {
      countryCode = data.countryCode;
    }
  } catch (error) {
    console.error('IP lookup failed:', error);
  }

  let recommendedLocale = null;
  if (countryCode) {
    const officialLang = getOfficialLanguage(countryCode);
    if (officialLang) {
      const enabled = await getEnabledLanguages();
      if (enabled.includes(officialLang)) {
        recommendedLocale = officialLang;
      }
    }
  }

  const enabledList = await getEnabledLanguages();
  const defaultLocale = enabledList.includes('zh') ? 'zh' : (enabledList[0] || 'en');

  return NextResponse.json({
    recommendedLocale: recommendedLocale || defaultLocale,
    countryCode: countryCode || null,
  });
}