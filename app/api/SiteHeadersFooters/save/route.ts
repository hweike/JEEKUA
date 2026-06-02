import { NextRequest, NextResponse } from 'next/server';
import { saveConfig } from '@/lib/SiteHeadersFooters/storage';

export async function POST(request: NextRequest) {
  const { type, locale, config } = await request.json();
  if (!type || !locale || !config) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }
  try {
    await saveConfig(type, locale, config);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
}