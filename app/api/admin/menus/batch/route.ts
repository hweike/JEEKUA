// app/api/admin/menus/batch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { readMenuFile, writeMenuFile } from '@/lib/menus/storage';

export async function POST(req: NextRequest) {
  const { locale, menuType, items } = await req.json();
  // items: Array<{ id, parentId, order }>
  const menu = await readMenuFile(locale, menuType);
  if (!menu.items) {
    return NextResponse.json({ error: 'Invalid menu structure' }, { status: 400 });
  }
  const updatedItems = menu.items.map((item: any) => {
    const update = items.find((i: any) => i.id === item.id);
    if (update) {
      return { ...item, parentId: update.parentId, order: update.order };
    }
    return item;
  });
  menu.items = updatedItems;
  await writeMenuFile(locale, menuType, menu);
  return NextResponse.json({ success: true });
}