// app/api/admin/menus/init/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPrivateStorage } from '@/lib/storage/factory';

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

    // 构建预设文件的存储 Key
    const presetFileName = `${locale}_${menuType}_menus.json`;
    const presetKey = `data/menus/Preset/${presetFileName}`;

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

    // 目标文件存储 Key
    const targetKey = `data/menus/${locale}/${menuType}.json`;

    // 写入目标文件
    await storage.write(targetKey, JSON.stringify(presetMenu, null, 2), {
      contentType: 'application/json',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Init menu error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}