import { NextRequest, NextResponse } from 'next/server';
import { menuService } from '@/lib/menus/menu-service';
import { clearMenuCache } from '@/lib/menus/storage';
import { getPrivateStorage } from '@/lib/storage/factory';

export async function POST(req: NextRequest) {
  try {
    const { locale, menuType } = await req.json();

    // 只允许中文和英文
    if (locale !== 'zh' && locale !== 'en') {
      return NextResponse.json({ error: 'Only zh and en support initialization' }, { status: 400 });
    }

    // 允许的菜单类型（前端传递的是 'navigation' 或 'footer'）
    if (menuType !== 'navigation' && menuType !== 'footer') {
      return NextResponse.json({ error: 'Only navigation and footer can be initialized' }, { status: 400 });
    }

    // ✅ 确定数据库中的实际菜单 ID：底部菜单映射为 'footer-menu'
    const storeId = menuType === 'footer' ? 'footer-menu' : menuType;

    // 构建预设文件的存储 Key（文件名仍使用 'footer'，与菜单类型一致）
    const presetFileName = `${locale}_${menuType}_menus.json`;
    const presetKey = `menus/Preset/${presetFileName}`;

    const storage = getPrivateStorage();

    // 读取预设文件
    let presetContent: string;
    try {
      const content = await storage.read(presetKey, 'utf8');
      presetContent = content as string;
    } catch (err: any) {
      console.error(`读取预设文件失败: ${presetKey}`, err);
      return NextResponse.json({ error: 'Preset file not found' }, { status: 404 });
    }

    const presetMenu = JSON.parse(presetContent);

    // ✅ 确保 presetMenu 的 id 与 storeId 一致
    presetMenu.id = storeId;

    // ✅ 使用服务层保存菜单到数据库
    await menuService.saveMenu(storeId, locale, presetMenu);

    // ✅ 清除该菜单的内存缓存（clearMenuCache 内部会将 'footer' 映射为 'footer-menu'）
    clearMenuCache(locale, menuType);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Init menu error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}