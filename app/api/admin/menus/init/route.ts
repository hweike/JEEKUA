import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const PRESET_DIR = path.join(process.cwd(), 'data', 'menus', 'Preset');
const MENUS_DIR = path.join(process.cwd(), 'data', 'menus');

export async function POST(req: NextRequest) {
  try {
    const { locale, menuType } = await req.json();

    // 只允许中文和英文
    if (locale !== 'zh' && locale !== 'en') {
      return NextResponse.json({ error: 'Only zh and en support initialization' }, { status: 400 });
    }

    // 允许的菜单类型
    if (menuType !== 'navigation' && menuType !== 'footer') {
      return NextResponse.json({ error: 'Only navigation and footer can be initialized' }, { status: 400 });
    }

    // 构建预设文件路径
    const presetFileName = `${locale}_${menuType}_menus.json`;
    const presetFilePath = path.join(PRESET_DIR, presetFileName);

    // 读取预设文件
    let presetContent;
    try {
      presetContent = await fs.readFile(presetFilePath, 'utf-8');
    } catch {
      return NextResponse.json({ error: 'Preset file not found' }, { status: 404 });
    }

    const presetMenu = JSON.parse(presetContent);

    // 目标文件路径
    const targetDir = path.join(MENUS_DIR, locale);
    const targetFilePath = path.join(targetDir, `${menuType}.json`);

    // 确保目标目录存在
    await fs.mkdir(targetDir, { recursive: true });

    // 写入目标文件
    await fs.writeFile(targetFilePath, JSON.stringify(presetMenu, null, 2), 'utf-8');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Init menu error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}