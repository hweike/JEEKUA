import { NextResponse } from 'next/server';
import { LANGUAGES } from '@/lib/languages/config';
import { getEnabledLanguages } from '@/lib/languages/settings';

export async function GET() {
  const enabledCodes = getEnabledLanguages();
  const enabledLanguages = LANGUAGES.filter(lang => enabledCodes.includes(lang.code)).map(lang => ({
    code: lang.code,
    nativeName: lang.nativeName,
    zhName: lang.zhName,
  }));
  return NextResponse.json(enabledLanguages);
}