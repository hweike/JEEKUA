// app/api/discovery/regenerate/route.ts
import { NextResponse } from 'next/server';
import { generateForLocale } from '@/modules/discovery/scanner/generate-pages-json';
import { clearCache } from '@/modules/discovery/lib/getPages';

export async function POST(req: Request) {
  try {
    const { locale } = await req.json();
    if (!locale) {
      return NextResponse.json({ error: 'locale required' }, { status: 400 });
    }
    await generateForLocale(locale);
    clearCache(locale);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Regenerate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}