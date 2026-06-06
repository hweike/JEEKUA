// app/api/themes/[name]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPrivateStorage } from '@/lib/storage/factory';

// 私有桶中自定义主题的存储前缀（与迁移后的实际路径一致）
const CUSTOM_THEMES_PREFIX = 'themes/custom';

// 获取主题 JSON 的 key
function getThemeKey(name: string): string {
  return `${CUSTOM_THEMES_PREFIX}/${name}.json`;
}

// 获取主题图片的 key（也存储在私有桶中）
function getImageKey(name: string, ext: string): string {
  return `${CUSTOM_THEMES_PREFIX}/${name}.${ext}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const storage = getPrivateStorage();
    const key = getThemeKey(name);
    const content = await storage.read(key, 'utf8');
    const theme = JSON.parse(content as string);
    return NextResponse.json(theme);
  } catch (err: any) {
    if (err?.Code === 'NoSuchKey' || err?.code === 'NoSuchKey') {
      return NextResponse.json({ error: '主题不存在' }, { status: 404 });
    }
    console.error('读取自定义主题失败:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const body = await request.json();
    const { displayName, cssVariables, darkCssVariables, darkMode } = body;

    const storage = getPrivateStorage();
    const key = getThemeKey(name);
    
    // 检查主题是否存在
    try {
      await storage.read(key, 'utf8');
    } catch (err: any) {
      if (err?.Code === 'NoSuchKey' || err?.code === 'NoSuchKey') {
        return NextResponse.json({ error: '主题不存在' }, { status: 404 });
      }
      throw err;
    }

    const updatedTheme = {
      name,
      displayName: displayName || name,
      type: 'custom',
      cssVariables: cssVariables || {},
      darkCssVariables: darkCssVariables || {},
      darkMode: darkMode || 'system',
    };
    await storage.write(key, JSON.stringify(updatedTheme, null, 2), {
      contentType: 'application/json',
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新主题失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const storage = getPrivateStorage();
    const jsonKey = getThemeKey(name);
    
    // 删除 JSON 文件
    try {
      await storage.delete(jsonKey);
    } catch (err: any) {
      if (err?.Code === 'NoSuchKey' || err?.code === 'NoSuchKey') {
        return NextResponse.json({ error: '主题不存在' }, { status: 404 });
      }
      throw err;
    }

    // 删除可能的图片文件（同样在私有桶中）
    const extensions = ['webp', 'png', 'jpg', 'jpeg', 'gif'];
    for (const ext of extensions) {
      const imgKey = getImageKey(name, ext);
      try {
        await storage.delete(imgKey);
      } catch {
        // 忽略图片不存在
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除主题失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}