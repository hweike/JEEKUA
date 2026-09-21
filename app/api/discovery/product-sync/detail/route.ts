// app/api/discovery/product-sync/detail/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
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
  const allEnabledLocales = LANGUAGES.filter(lang => enabledCodes.includes(lang.code)).map(lang => lang.code);
  const targetLocales = allEnabledLocales.filter(loc => loc !== sourceLocale);

  const { data: syncRecords, error } = await supabase
    .from('products')
    .select('locale, source_locale, source_product_id')
    .eq('site_id', SITE_ID)
    .eq('productId', productId)
    .in('locale', targetLocales)
    .eq('source_locale', sourceLocale)
    .eq('source_product_id', productId);

  if (error) {
    console.error('查询同步详情失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const syncedSet = new Set(syncRecords?.map(r => r.locale) || []);
  const details = targetLocales.map(locale => ({
    locale,
    synced: syncedSet.has(locale),
  }));

  return NextResponse.json({ details });
}