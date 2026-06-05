// app/api/admin/blog/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPrivateStorage } from '@/lib/storage/factory';

// 生成8位随机数字ID
function generateId(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

// 获取指定语言的分类文件在私有桶中的 key（相对路径）
function getCategoryKey(locale: string): string {
  // 私有桶中存储路径：blog/{locale}/categories.json
  return `data/blog/${locale}/categories.json`;
}

// 读取分类列表
async function readCategories(locale: string): Promise<any[]> {
  const storage = getPrivateStorage();
  const key = getCategoryKey(locale);
  try {
    const content = await storage.read(`data/${key}`, 'utf8');
    return JSON.parse(content as string);
  } catch (error: any) {
    // 文件不存在，返回空数组（不上报错误）
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      return [];
    }
    console.error(`读取分类文件失败 [${locale}]:`, error);
    throw error;
  }
}

// 写入分类列表
async function writeCategories(locale: string, categories: any[]): Promise<void> {
  const storage = getPrivateStorage();
  const key = getCategoryKey(locale);
  await storage.write(`data/${key}`, JSON.stringify(categories, null, 2), {
    contentType: 'application/json',
  });
}

// GET: 获取某语言的所有分类
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

// POST: 新建分类
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

// PUT: 更新分类
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

// DELETE: 删除分类
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