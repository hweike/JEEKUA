// app/api/admin/pages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createPage, getPageList } from '@/lib/pages/pageService';

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
      console.error('批量获取页面失败:', error);
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
    console.error('获取页面列表失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { locale, id, ...data } = body;  // 从请求体中读取 id（可选）
    if (!locale) {
      return NextResponse.json({ error: 'Missing locale' }, { status: 400 });
    }
    // 仅允许 zh 和 en 创建页面（可根据需求调整）
    if (locale !== 'zh' && locale !== 'en') {
      return NextResponse.json({ error: 'Cannot create page for this locale' }, { status: 403 });
    }
    // 传入 id（如果存在）给 createPage
    const page = await createPage(locale, data, id);
    return NextResponse.json(page, { status: 201 });
  } catch (error: any) {
    const message = error.message;
    // 尝试解析为 JSON 错误（原逻辑保留）
    try {
      const errors = JSON.parse(message);
      return NextResponse.json({ errors }, { status: 400 });
    } catch {
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }
}