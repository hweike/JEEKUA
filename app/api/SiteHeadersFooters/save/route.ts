// app/api/SiteHeadersFooters/save/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { saveConfig } from '@/lib/SiteHeadersFooters/storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, locale, config } = body;

    if (!type || !locale || !config) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    await saveConfig(type, locale, config);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Save error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}