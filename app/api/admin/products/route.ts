import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

function getCategoriesPath(locale: string) {
  return path.join(process.cwd(), 'data/products', locale, 'categories.json');
}

async function readCategories(locale: string) {
  const filePath = getCategoriesPath(locale);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeCategories(locale: string, categories: any[]) {
  const filePath = getCategoriesPath(locale);
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(categories, null, 2), 'utf-8');
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'zh';

  const categories = await readCategories(locale);
  // 按 order 排序
  const sorted = categories.sort((a: any, b: any) => a.order - b.order);
  for (const cat of sorted) {
    if (cat.series) {
      cat.series = cat.series.sort((a: any, b: any) => a.order - b.order);
    }
  }
  return NextResponse.json({ categories: sorted });
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

  await writeCategories(locale, body.categories);
  return NextResponse.json({ success: true });
}