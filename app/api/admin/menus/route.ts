// app/api/admin/menus/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { readMenuFile } from '@/lib/menus/storage';

export async function GET(req: NextRequest) {
  const locale = req.nextUrl.searchParams.get('locale') || 'zh';
  try {
    const navigation = await readMenuFile(locale, 'navigation');
    const footer = await readMenuFile(locale, 'footer');
    const customMenus = await readMenuFile(locale, 'custom_menus');
    return NextResponse.json({ navigation, footer, customMenus });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch menus' }, { status: 500 });
  }
}