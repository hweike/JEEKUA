// app/api/admin/blog/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getCategories,
  getCategoriesBatch,
  createCategory,
  copyCategory,
  updateCategory,
  deleteCategory,
} from '@/lib/blog/services/category.service';

// ---------- GET ----------
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale');
  const localesParam = searchParams.get('locales');

  try {
    if (localesParam) {
      const locales = localesParam.split(',').filter(Boolean);
      if (locales.length === 0) {
        return NextResponse.json({ error: 'No valid locales provided' }, { status: 400 });
      }
      const result = await getCategoriesBatch(locales);
      return NextResponse.json(result);
    }

    const targetLocale = locale || 'zh';
    const categories = await getCategories(targetLocale);
    return NextResponse.json(categories);
  } catch (error) {
    console.error('GET /api/admin/blog/categories error:', error);
    return NextResponse.json({ error: '读取失败' }, { status: 500 });
  }
}

// ---------- POST ----------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sourceLocale, targetLocale, id, locale, ...categoryData } = body;

    if (action === 'copy') {
      if (!sourceLocale || !targetLocale || !id) {
        return NextResponse.json(
          { error: '缺少必要参数 (sourceLocale, targetLocale, id)' },
          { status: 400 }
        );
      }
      try {
        const result = await copyCategory(sourceLocale, targetLocale, id);
        return NextResponse.json({ success: true, data: result });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: err.message.includes('不存在') ? 404 : 400 });
      }
    }

    if (!locale) {
      return NextResponse.json({ error: '缺少语言参数' }, { status: 400 });
    }

    try {
      // 统一使用 createCategory，第三个参数为可选的 id
      const newCategory = await createCategory(locale, categoryData, id);
      return NextResponse.json(newCategory);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: err.message.includes('已存在') ? 409 : 500 });
    }
  } catch (error) {
    console.error('POST /api/admin/blog/categories error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}

// ---------- PUT ----------
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { locale, id, ...updateData } = body;
    if (!locale || !id) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    try {
      const updated = await updateCategory(locale, id, updateData);
      return NextResponse.json(updated);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: err.message.includes('不存在') ? 404 : 500 });
    }
  } catch (error) {
    console.error('PUT /api/admin/blog/categories error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

// ---------- DELETE ----------
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale');
  const id = searchParams.get('id');
  if (!locale || !id) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 });
  }

  try {
    await deleteCategory(locale, id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: err.message.includes('不存在') ? 404 : 500 }
    );
  }
}