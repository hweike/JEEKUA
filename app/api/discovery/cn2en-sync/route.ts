// app/api/discovery/cn2en-sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCn2EnSyncStatus } from '@/lib/discovery/services/site-sync.service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const types = searchParams.get('types') || 'latest';

    const result = await getCn2EnSyncStatus(types);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Cn2En sync list API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}