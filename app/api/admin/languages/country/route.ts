import { NextResponse } from 'next/server';
import { getCountries, getOfficialLanguage } from '@/lib/languages/country-language';

export async function GET() {
  const countries = getCountries();
  const list = countries.map(country => ({
    countryCode: country.code,
    countryZhName: country.zhName,
    countryNativeName: country.nativeName,
    officialLanguageCode: getOfficialLanguage(country.code),
  }));
  return NextResponse.json(list);
}