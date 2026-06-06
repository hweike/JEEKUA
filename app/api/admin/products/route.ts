// app/api/admin/product-categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPrivateStorage } from '@/lib/storage/factory';

function getStorageKey(locale: string): string {
  return `products/${locale}/categories.json`;
}

async function readCategories(locale: string): Promise<any[]> {
  const storage = getPrivateStorage();
  const key = getStorageKey(locale);
  try {
    const content = await storage.read(key, 'utf8');
    return JSON.parse(content as string);
  } catch (error: any) {
    // 文件不存在时返回空数组
    if (error?.code === 'NoSuchKey' || error?.Code === 'NoSuchKey' || error?.message?.includes('File not found')) {
      return [];
    }
    throw error;
  }
}

async function writeCategories(locale: string, categories: any[]): Promise<void> {
  const storage = getPrivateStorage();
  const key = getStorageKey(locale);
  await storage.write(key, JSON.stringify(categories, null, 2), {
    contentType: 'application/json',
  });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'zh';

  try {
    let categories = await readCategories(locale);
    // 按 order 排序
    const sorted = categories.sort((a: any, b: any) => a.order - b.order);
    for (const cat of sorted) {
      if (cat.series) {
        cat.series = cat.series.sort((a: any, b: any) => a.order - b.order);
      }
    }
    return NextResponse.json({ categories: sorted });
  } catch (error) {
    console.error('GET /api/admin/product-categories error:', error);
    return NextResponse.json({ error: '读取失败' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'zh';

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '无效的 JSON' }, { status: 400 });
  }

  if (!body.categories) {
    return NextResponse.json({ error: '缺少 categories 字段' }, { status: 400 });
  }

  try {
    await writeCategories(locale, body.categories);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/admin/product-categories error:', error);
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}