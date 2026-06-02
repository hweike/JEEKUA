import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/lib/SiteHeadersFooters/storage';

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type');
  const locale = request.nextUrl.searchParams.get('locale') || 'zh';
  if (!type || (type !== 'header' && type !== 'footer')) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }
  try {
    const config = await getConfig(type, locale);
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json(null, { status: 500 });
  }
}