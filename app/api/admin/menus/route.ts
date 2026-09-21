// app/api/admin/menus/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { readMenuFile } from '@/lib/menus/storage';
import { supabase } from '@/lib/supabase/client';

const DEFAULT_SITE_ID = '000001';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'zh';
  const localesParam = searchParams.get('locales');

  // ---- 批量查询（优化版） ----
  if (localesParam) {
    const locales = localesParam.split(',').filter(Boolean);
    if (locales.length === 0) {
      return NextResponse.json({ error: 'No valid locales provided' }, { status: 400 });
    }

    try {
      const { data, error } = await supabase
        .from('site_configs')
        .select('locale, id, config')
        .eq('site_id', DEFAULT_SITE_ID)
        .in('locale', locales)
        .in('id', ['navigation', 'footer-menu', 'custom_menus']);

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }

      const result: Record<string, { navigation: any; footer: any; customMenus: any[] }> = {};
      locales.forEach(loc => {
        result[loc] = { navigation: null, footer: null, customMenus: [] };
      });

      data?.forEach(row => {
        const locale = row.locale;
        const id = row.id;
        const config = row.config;
        if (!result[locale]) return;
        if (id === 'navigation' || id === 'footer-menu') {
          const targetKey = id === 'navigation' ? 'navigation' : 'footer';
          result[locale][targetKey] = config || null;
        } else if (id === 'custom_menus') {
          result[locale].customMenus = Array.isArray(config) ? config : [];
        }
      });

      return NextResponse.json(result, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    } catch (error) {
      console.error('GET /menus batch error:', error);
      return NextResponse.json({ error: 'Failed to fetch menus' }, { status: 500 });
    }
  }

  // ---- 单语言查询 ----
  try {
    const [navigation, footer, customMenus] = await Promise.all([
      readMenuFile(locale, 'navigation'),
      readMenuFile(locale, 'footer-menu'),
      readMenuFile(locale, 'custom_menus'),
    ]);
    const result = { navigation, footer, customMenus };
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('GET /menus error:', error);
    return NextResponse.json({ error: 'Failed to fetch menus' }, { status: 500 });
  }
}