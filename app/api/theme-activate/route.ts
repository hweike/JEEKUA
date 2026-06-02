import { NextResponse } from 'next/server';
import { getActiveTheme, saveActiveTheme } from '@/lib/theme-utils';

export async function GET() {
  const theme = getActiveTheme();
  return NextResponse.json(theme);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const currentTheme = getActiveTheme();
  const updatedTheme = { ...currentTheme, ...body }; // body 包含 darkMode
  saveActiveTheme(updatedTheme);
  return NextResponse.json({ success: true });
}