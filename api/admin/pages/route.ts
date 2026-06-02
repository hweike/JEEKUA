import { NextResponse } from 'next/server';
import { getAvailablePages } from '@/lib/pages';

export async function GET() {
  const pages = await getAvailablePages();
  return NextResponse.json({ pages });
}