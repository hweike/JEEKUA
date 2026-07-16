// app/api/admin/menus/link-sources/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getLinkSources } from '@/lib/menus/link-sources';

export async function GET(req: NextRequest) {
  const locale = req.nextUrl.searchParams.get('locale') || 'zh';
  const sources = await getLinkSources(locale);
  return NextResponse.json(sources);
}