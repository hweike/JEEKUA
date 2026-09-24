// app/api/discovery/product-sync/detail/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/admin';
import { getEnabledLanguages } from '@/lib/languages/settings';
import { LANGUAGES } from '@/lib/languages/config';

const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const productId = searchParams.get('productId');
  const sourceLocale = searchParams.get('sourceLocale') || 'en';

  if (!productId) {
    return NextResponse.json({ error: 'productId required' }, { status: 400 });
  }

  const enabledCodes = await getEnabledLanguages();
  const allEnabledLocales = LANGUAGES
    .filter(lang => enabledCodes.includes(lang.code))
    .map(lang => lang.code);
  const targetLocales = allEnabledLocales.filter(loc => loc !== sourceLocale);

  try {
    const syncRecords = await sql<{ locale: string; source_locale: string | null; source_product_id: string | null }[]>`
      SELECT locale, source_locale, source_product_id FROM public.products
      WHERE site_id = ${SITE_ID}
        AND "productId" = ${productId}
        AND locale IN ${sql(targetLocales)}
        AND source_locale = ${sourceLocale}
        AND source_product_id = ${productId}
    `;

    const syncedSet = new Set(syncRecords.map(r => r.locale));
    const details = targetLocales.map(locale => ({
      locale,
      synced: syncedSet.has(locale),
    }));

    return NextResponse.json({ details });
  } catch (error: any) {
    console.error('查询同步详情失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}