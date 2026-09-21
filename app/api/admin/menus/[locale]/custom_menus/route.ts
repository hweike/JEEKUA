import { NextRequest, NextResponse } from 'next/server';
import { readMenuFile, writeMenuFile } from '@/lib/menus/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  try {
    const { locale } = await params;
    const data = await readMenuFile(locale, 'custom_menus');
    return NextResponse.json(data || []);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch custom menus' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  try {
    const { locale } = await params;
    const body = await request.json();
    await writeMenuFile(locale, 'custom_menus', body);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update custom menus' }, { status: 500 });
  }
}