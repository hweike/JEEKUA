// app/api/admin/blog/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPrivateStorage } from '@/lib/storage/factory';

function generateId(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

function getCategoryKey(locale: string): string {
  // 直接存储为 blog/{locale}/categories.json（无 data/ 前缀）
  return `blog/${locale}/categories.json`;
}

async function readCategories(locale: string): Promise<any[]> {
  const storage = getPrivateStorage();
  const key = getCategoryKey(locale);
  try {
    const content = await storage.read(key, 'utf8');
    return JSON.parse(content as string);
  } catch (error: any) {
    if (error?.Code === 'NoSuchKey' || error?.code === 'NoSuchKey' || error?.message?.includes('NoSuchKey')) {
      return [];
    }
    console.error(`读取分类文件失败 [${locale}]:`, error);
    throw error;
  }
}

async function writeCategories(locale: string, categories: any[]): Promise<void> {
  const storage = getPrivateStorage();
  const key = getCategoryKey(locale);
  await storage.write(key, JSON.stringify(categories, null, 2), {
    contentType: 'application/json',
  });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'zh';
  try {
    const categories = await readCategories(locale);
    return NextResponse.json(categories);
  } catch (error) {
    console.error('GET /api/admin/blog/categories error:', error);
    return NextResponse.json({ error: '读取失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { locale, ...categoryData } = body;
    if (!locale) {
      return NextResponse.json({ error: '缺少语言参数' }, { status: 400 });
    }

    const categories = await readCategories(locale);
    const newCategory = {
      id: generateId(),
      ...categoryData,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    categories.push(newCategory);
    await writeCategories(locale, categories);
    return NextResponse.json(newCategory);
  } catch (error) {
    console.error('POST /api/admin/blog/categories error:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { locale, id, ...updateData } = body;
    if (!locale || !id) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const categories = await readCategories(locale);
    const index = categories.findIndex((c: any) => c.id === id);
    if (index === -1) {
      return NextResponse.json({ error: '分类不存在' }, { status: 404 });
    }

    const updated = {
      ...categories[index],
      ...updateData,
      updated_at: new Date().toISOString(),
    };
    categories[index] = updated;
    await writeCategories(locale, categories);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/admin/blog/categories error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale');
  const id = searchParams.get('id');
  if (!locale || !id) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 });
  }

  try {
    let categories = await readCategories(locale);
    const filtered = categories.filter((c: any) => c.id !== id);
    if (filtered.length === categories.length) {
      return NextResponse.json({ error: '分类不存在' }, { status: 404 });
    }
    await writeCategories(locale, filtered);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/blog/categories error:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}