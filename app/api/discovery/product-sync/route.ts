// app/api/discovery/product-sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getProductSyncStatus } from '@/lib/discovery/services/product-sync.service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sourceLocale = searchParams.get('sourceLocale') || 'zh';
    const includeVariants = searchParams.get('includeVariants') !== 'false'; // 默认为 true

    const result = await getProductSyncStatus(sourceLocale, includeVariants);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Product sync API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}