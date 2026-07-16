// app/api/admin/menus/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { readMenuFile, getMenuCache, setMenuCache, clearMenuCache } from '@/lib/menus/storage';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'zh';
  const localesParam = searchParams.get('locales');

  // ---- 新增：批量查询 ----
  if (localesParam) {
    const locales = localesParam.split(',').filter(Boolean);
    if (locales.length === 0) {
      return NextResponse.json({ error: 'No valid locales provided' }, { status: 400 });
    }

    try {
      const result: Record<string, any> = {};

      // 并行获取每个语言的数据，并复用缓存
      await Promise.all(locales.map(async (loc) => {
        // 先检查缓存
        const cached = getMenuCache(loc);
        if (cached) {
          result[loc] = cached;
          return;
        }

        // 无缓存则读取文件
        const [navigation, footer, customMenus] = await Promise.all([
          readMenuFile(loc, 'navigation'),
          readMenuFile(loc, 'footer'),
          readMenuFile(loc, 'custom_menus'),
        ]);

        const data = { navigation, footer, customMenus };
        setMenuCache(loc, data); // 存入缓存
        result[loc] = data;
      }));

      return NextResponse.json(result);
    } catch (error) {
      console.error('GET /menus batch error:', error);
      return NextResponse.json({ error: 'Failed to fetch menus' }, { status: 500 });
    }
  }

  // ---- 原有单语言逻辑（完全不变） ----
  // 1. 检查缓存
  const cached = getMenuCache(locale);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    // 2. 并发读取三个文件
    const [navigation, footer, customMenus] = await Promise.all([
      readMenuFile(locale, 'navigation'),
      readMenuFile(locale, 'footer'),
      readMenuFile(locale, 'custom_menus'),
    ]);

    const result = { navigation, footer, customMenus };

    // 3. 存入缓存
    setMenuCache(locale, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /menus error:', error);
    return NextResponse.json({ error: 'Failed to fetch menus' }, { status: 500 });
  }
}

// 注意：PUT 和 POST 路由需要调用 clearMenuCache(locale) 清除缓存
// 你可以在各自的实现中调用 clearMenuCache(locale)