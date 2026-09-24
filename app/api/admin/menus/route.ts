// app/api/admin/menus/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { readMenuFile } from '@/lib/menus/storage';
import sql from '@/lib/db/admin';

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
      const data = await sql<{ locale: string; id: string; config: any }[]>`
        SELECT locale, id, config FROM public.site_configs
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND locale IN ${sql(locales)}
          AND id IN ('navigation', 'footer-menu', 'custom_menus')
      `;

      const result: Record<string, { navigation: any; footer: any; customMenus: any[] }> = {};
      locales.forEach(loc => {
        result[loc] = { navigation: null, footer: null, customMenus: [] };
      });

      data.forEach(row => {
        const localeKey = row.locale;
        const id = row.id;
        const config = row.config;
        if (!result[localeKey]) return;
        if (id === 'navigation' || id === 'footer-menu') {
          const targetKey = id === 'navigation' ? 'navigation' : 'footer';
          result[localeKey][targetKey] = config || null;
        } else if (id === 'custom_menus') {
          result[localeKey].customMenus = Array.isArray(config) ? config : [];
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