import { NextRequest, NextResponse } from 'next/server';
import { getLanguageSettings, saveLanguageSettings } from '@/lib/languages/settings';

export async function GET() {
  const settings = getLanguageSettings();
  return NextResponse.json(settings);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { enabled, defaultLanguage } = body;
  if (!enabled || typeof enabled !== 'object') {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
  // 验证 defaultLanguage 是否为 'zh' 或 'en'（可根据需要扩展）
  if (defaultLanguage && defaultLanguage !== 'zh' && defaultLanguage !== 'en') {
    return NextResponse.json({ error: 'Invalid default language' }, { status: 400 });
  }
  const newSettings = {
    enabled,
    defaultLanguage: defaultLanguage || 'zh', // 若未提供则默认中文
  };
  saveLanguageSettings(newSettings);
  return NextResponse.json({ success: true });
}