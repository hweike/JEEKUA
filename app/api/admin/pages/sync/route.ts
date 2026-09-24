import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { syncPageToLocales } from '@/lib/pages/pageService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pageId, sourceLocale, targetLocales } = body;

    if (!pageId || !sourceLocale || !targetLocales || !Array.isArray(targetLocales)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const result = await syncPageToLocales(pageId, sourceLocale, targetLocales);

    try {
      for (const p of result.syncedPages) {
        revalidatePath(`/${p.locale}/${p.slug}`);
        console.log(`[sync] revalidatePath: /${p.locale}/${p.slug}`);
      }
    } catch (e) {
      console.warn('[sync] revalidatePath 失败:', e);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[sync] 错误:', error?.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}