import { NextRequest, NextResponse } from 'next/server';
import { readMenuFile, writeMenuFile } from '@/lib/menus/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string; menuId: string }> }
) {
  try {
    const { locale, menuId } = await params;
    const customMenus = await readMenuFile(locale, 'custom_menus');
    const menus = Array.isArray(customMenus) ? customMenus : [];
    const menu = menus.find((m: any) => m.id === menuId);
    if (!menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }
    return NextResponse.json(menu);
  } catch (error) {
    console.error('GET /custom_menus/[menuId] error:', error);
    return NextResponse.json({ error: 'Failed to fetch menu' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string; menuId: string }> }
) {
  try {
    const { locale, menuId } = await params;
    const body = await request.json();
    
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const customMenus = await readMenuFile(locale, 'custom_menus');
    let menus: any[] = [];
    if (Array.isArray(customMenus)) {
      menus = customMenus;
    } else if (customMenus && typeof customMenus === 'object') {
      menus = Object.values(customMenus);
    } else {
      menus = [];
    }
    
    const existingIndex = menus.findIndex((m: any) => m.id === menuId);
    if (existingIndex === -1) {
      const newMenu = {
        id: menuId,
        name: body.name || '未命名菜单',
        isEditable: true,
        items: Array.isArray(body.items) ? body.items : [],
      };
      menus.push(newMenu);
    } else {
      menus[existingIndex] = {
        ...menus[existingIndex],
        ...body,
        id: menuId,
        items: Array.isArray(body.items) ? body.items : [],
      };
    }
    
    if (!Array.isArray(menus) || menus.length === 0) {
      console.error('[API] 菜单数组无效');
      return NextResponse.json(
        { error: 'Invalid menu data' },
        { status: 500 }
      );
    }
    
    const invalidMenus = menus.filter((m: any) => !m.id);
    if (invalidMenus.length > 0) {
      menus = menus.filter((m: any) => m.id);
    }
    
    await writeMenuFile(locale, 'custom_menus', menus);
    
    const updatedMenu = menus.find((m: any) => m.id === menuId);
    return NextResponse.json({ 
      success: true, 
      menu: updatedMenu || null
    });
    
  } catch (error) {
    console.error('[API] PUT custom_menus/[menuId] error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to update menu' 
      },
      { status: 500 }
    );
  }
}