import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data/blog');

// 辅助：获取指定语言的数据文件路径
function getDataFilePath(locale: string): string {
  return path.join(DATA_DIR, locale, 'categories.json');
}

// 辅助：读取分类列表
async function readCategories(locale: string): Promise<any[]> {
  const filePath = getDataFilePath(locale);
  if (!existsSync(filePath)) {
    // 若文件不存在，创建空数组
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify([], null, 2));
    return [];
  }
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

// 辅助：写入分类列表
async function writeCategories(locale: string, categories: any[]): Promise<void> {
  const filePath = getDataFilePath(locale);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(categories, null, 2));
}

// 生成8位随机数字ID
function generateId(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

// GET: 获取某语言的所有分类
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'zh';
  try {
    const categories = await readCategories(locale);
    return NextResponse.json(categories);
  } catch (error) {
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
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}