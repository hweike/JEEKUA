import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const MENUS_DIR = path.join(process.cwd(), 'data', 'menus');

// 定义菜单文件列表
const MENU_FILES = ['navigation.json', 'footer.json', 'custom_menus.json'];

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale');
  if (!locale) {
    return NextResponse.json({ error: 'Missing locale' }, { status: 400 });
  }
  const localeDir = path.join(MENUS_DIR, locale);
  if (!fs.existsSync(localeDir)) {
    return NextResponse.json({ error: 'Directory not found' }, { status: 404 });
  }

  const result: Record<string, any> = {};
  for (const file of MENU_FILES) {
    const filePath = path.join(localeDir, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      result[file] = JSON.parse(content);
    } else {
      result[file] = null; // 文件不存在时返回 null
    }
  }
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const { locale, data } = await request.json();
  if (!locale || !data) {
    return NextResponse.json({ error: 'Missing locale or data' }, { status: 400 });
  }
  const localeDir = path.join(MENUS_DIR, locale);
  if (!fs.existsSync(localeDir)) {
    fs.mkdirSync(localeDir, { recursive: true });
  }

  for (const file of MENU_FILES) {
    const fileData = data[file];
    if (fileData !== undefined && fileData !== null) {
      const filePath = path.join(localeDir, file);
      fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2));
    }
  }
  return NextResponse.json({ success: true });
}