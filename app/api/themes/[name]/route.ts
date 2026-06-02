import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CUSTOM_THEMES_DIR = path.join(process.cwd(), 'data', 'themes', 'custom');

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const filePath = path.join(CUSTOM_THEMES_DIR, `${name}.json`);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: '主题不存在' }, { status: 404 });
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const theme = JSON.parse(content);
    return NextResponse.json(theme);
  } catch (error) {
    console.error('读取自定义主题失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const body = await request.json();
    const { displayName, cssVariables, darkCssVariables, darkMode } = body; // 添加这两个字段

    const filePath = path.join(CUSTOM_THEMES_DIR, `${name}.json`);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: '主题不存在' }, { status: 404 });
    }

    const updatedTheme = {
      name,
      displayName: displayName || name,
      type: 'custom',
      cssVariables: cssVariables || {},
      darkCssVariables: darkCssVariables || {},
      darkMode: darkMode || 'system',
    };
    fs.writeFileSync(filePath, JSON.stringify(updatedTheme, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新主题失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const filePath = path.join(CUSTOM_THEMES_DIR, `${name}.json`);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: '主题不存在' }, { status: 404 });
    }
    fs.unlinkSync(filePath);
    // 同时删除可能的图片文件
    for (const ext of ['webp', 'png', 'jpg', 'jpeg', 'gif']) {
      const imgPath = path.join(CUSTOM_THEMES_DIR, `${name}.${ext}`);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除主题失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}