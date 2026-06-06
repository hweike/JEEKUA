// app/api/admin/languages/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getLanguageSettings, saveLanguageSettings } from '@/lib/languages/settings';

export async function GET() {
  try {
    const settings = await getLanguageSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('GET 语言设置失败:', error);
    return NextResponse.json({ error: '获取设置失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { enabled, defaultLanguage } = body;
    if (!enabled || typeof enabled !== 'object') {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }
    if (defaultLanguage && defaultLanguage !== 'zh' && defaultLanguage !== 'en') {
      return NextResponse.json({ error: 'Invalid default language' }, { status: 400 });
    }
    const newSettings = {
      enabled,
      defaultLanguage: defaultLanguage || 'zh',
    };
    await saveLanguageSettings(newSettings);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST 保存语言设置失败:', error);
    return NextResponse.json({ error: '保存设置失败' }, { status: 500 });
  }
}