// app/api/admin/menus/[locale]/[menuType]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { readMenuFile, writeMenuFile } from '@/lib/menus/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string; menuType: string }> }
) {
  try {
    const { locale, menuType } = await params;
    const data = await readMenuFile(locale, menuType);
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch menu' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string; menuType: string }> }
) {
  try {
    const { locale, menuType } = await params;
    const body = await request.json();
    await writeMenuFile(locale, menuType, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update menu' }, { status: 500 });
  }
}