// app/api/admin/menus/list/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { readMenuFile } from '@/lib/menus/storage';

export async function GET(req: NextRequest) {
  // 注意：该 API 路径已通过 middleware 保护，无需在此重复验证
  const searchParams = req.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'zh';

  try {
    const navigation = await readMenuFile(locale, 'navigation');
    const footer = await readMenuFile(locale, 'footer');
    const customMenus = await readMenuFile(locale, 'custom_menus');

    const menuList = [
      { id: navigation.id, name: navigation.name, type: 'navigation' },
      { id: footer.id, name: footer.name, type: 'footer' },
      ...(Array.isArray(customMenus) ? customMenus.map((menu: any) => ({ id: menu.id, name: menu.name, type: 'custom' })) : [])
    ];

    return NextResponse.json(menuList);
  } catch (error) {
    console.error('Failed to fetch menu list:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}