// app/api/discovery/Site-sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSiteSyncStatus } from '@/lib/discovery/services';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sourceLocale = searchParams.get('sourceLocale') || 'en';
    const types = searchParams.get('types') || 'latest';

    const result = await getSiteSyncStatus(sourceLocale, types);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Sync list API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}