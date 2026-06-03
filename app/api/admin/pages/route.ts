import { NextRequest, NextResponse } from 'next/server';
import { createPage, getPageList } from '@/lib/pages/pageService';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale');
  if (!locale) {
    return NextResponse.json({ error: 'Missing locale' }, { status: 400 });
  }
  const pages = await getPageList(locale);
  return NextResponse.json({ pages });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { locale, ...data } = body;
    if (!locale) {
      return NextResponse.json({ error: 'Missing locale' }, { status: 400 });
    }
    // 仅允许 zh 和 en 创建页面
    if (locale !== 'zh' && locale !== 'en') {
      return NextResponse.json({ error: 'Cannot create page for this locale' }, { status: 403 });
    }
    const page = await createPage(locale, data);
    return NextResponse.json(page, { status: 201 });
  } catch (error: any) {
    const message = error.message;
    try {
      const errors = JSON.parse(message);
      return NextResponse.json({ errors }, { status: 400 });
    } catch {
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }
}
