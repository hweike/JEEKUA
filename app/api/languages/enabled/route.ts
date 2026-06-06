// app/api/languages/enabled/route.ts
import { NextResponse } from 'next/server';
import { LANGUAGES } from '@/lib/languages/config';
import { getEnabledLanguages } from '@/lib/languages/settings';

export async function GET() {
  try {
    const enabledCodes = await getEnabledLanguages(); // 添加 await
    const enabledLanguages = LANGUAGES.filter(lang => enabledCodes.includes(lang.code)).map(lang => ({
      code: lang.code,
      nativeName: lang.nativeName,
      zhName: lang.zhName,
    }));
    return NextResponse.json(enabledLanguages);
  } catch (error) {
    console.error('获取已启用语言失败:', error);
    // 降级：返回所有语言，确保前端不崩溃
    const allLanguages = LANGUAGES.map(lang => ({
      code: lang.code,
      nativeName: lang.nativeName,
      zhName: lang.zhName,
    }));
    return NextResponse.json(allLanguages);
  }
}