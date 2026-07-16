import { NextResponse } from 'next/server';
import { getCountries, getOfficialLanguage, isLatinLanguage } from '@/lib/languages/country-language';

export async function GET() {
  const countries = getCountries();
  const list = countries.map(country => {
    const langCode = getOfficialLanguage(country.code);
    return {
      countryCode: country.code,
      countryZhName: country.zhName,
      countryNativeName: country.nativeName,
      officialLanguageCode: langCode,
      // 新增字段：由服务端计算，前端直接消费
      isLatin: langCode ? isLatinLanguage(langCode) : false,
    };
  });
  return NextResponse.json(list);
}