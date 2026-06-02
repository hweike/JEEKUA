// app/api/detect-language/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getOfficialLanguage } from '@/lib/languages/country-language';
import { locales, defaultLocale } from '@/i18n/config';

export async function GET(request: NextRequest) {
  // 获取真实 IP
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || '';

  let country = '';
  if (ip && ip !== '::1' && ip !== '127.0.0.1') {
    try {
      const res = await fetch(`https://ipapi.co/${ip}/json/`, { next: { revalidate: 0 } });
      const data = await res.json();
      country = data.country_code || '';
    } catch (err) {
      console.error('IP detection failed:', err);
    }
  }

  const lang = getOfficialLanguage(country);
  let detectedLocale = lang && locales.includes(lang as any) ? lang : defaultLocale;
  return NextResponse.json({ locale: detectedLocale });
}