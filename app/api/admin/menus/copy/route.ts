import { NextRequest, NextResponse } from 'next/server';
import { readMenuFile, writeMenuFile } from '@/lib/menus/storage';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceLocale, targetLocale, menuType, menuId } = body;

    // 参数校验
    if (!sourceLocale || !targetLocale || !menuType || !menuId) {
      return NextResponse.json(
        { error: 'Missing required parameters: sourceLocale, targetLocale, menuType, menuId' },
        { status: 400 }
      );
    }

    // 只允许复制导航或底部菜单
    if (!['navigation', 'footer'].includes(menuType)) {
      return NextResponse.json(
        { error: 'menuType must be "navigation" or "footer"' },
        { status: 400 }
      );
    }

    // 读取源菜单（readMenuFile 在文件不存在时会返回默认结构，但为了精确判断，我们仍检查 id）
    const sourceMenu = await readMenuFile(sourceLocale, menuType);
    if (!sourceMenu || !sourceMenu.id) {
      return NextResponse.json(
        { error: `源菜单不存在或数据无效 (${sourceLocale}/${menuType})` },
        { status: 404 }
      );
    }

    // 写入目标菜单（完全覆盖，包括 id）
    await writeMenuFile(targetLocale, menuType, sourceMenu);

    return NextResponse.json({ success: true, message: '复制成功' });
  } catch (error: any) {
    console.error('复制菜单失败:', error);
    return NextResponse.json(
      { error: error.message || '复制失败' },
      { status: 500 }
    );
  }
}