// app/api/admin/pages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPageList } from '@/lib/pages/pageService';

/**
 * GET /api/admin/pages?locale=zh
 * GET /api/admin/pages?locales=zh,en,ja
 * 获取页面列表（轻量，不含 content 和 templateData）
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale');
  const localesParam = searchParams.get('locales');

  // ---- 批量获取（支持多语言） ----
  if (localesParam) {
    const locales = localesParam.split(',').filter(Boolean);
    if (locales.length === 0) {
      return NextResponse.json({ error: 'No valid locales' }, { status: 400 });
    }
    try {
      const result: Record<string, any[]> = {};
      await Promise.all(locales.map(async (loc) => {
        result[loc] = await getPageList(loc);
      }));
      return NextResponse.json(result);
    } catch (error) {
      console.error('[GET /api/admin/pages] 批量获取失败:', error);
      return NextResponse.json({ error: '批量获取失败' }, { status: 500 });
    }
  }

  // ---- 单语言获取 ----
  if (!locale) {
    return NextResponse.json({ error: 'Missing locale' }, { status: 400 });
  }
  try {
    const pages = await getPageList(locale);
    return NextResponse.json({ pages });
  } catch (error) {
    console.error('[GET /api/admin/pages] 获取失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}