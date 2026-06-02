import { NextRequest, NextResponse } from 'next/server';
import { syncPageToLocales } from '@/lib/pages/pageService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pageId, sourceLocale, targetLocales } = body;
    if (!pageId || !sourceLocale || !targetLocales || !Array.isArray(targetLocales)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const result = await syncPageToLocales(pageId, sourceLocale, targetLocales);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}