// app/api/admin/docs/reorder/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { updateDocOrders } from '@/lib/docs/document';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { locale, docsLibId, items } = body;

    if (!locale || !docsLibId || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: '缺少必要参数 (locale, docsLibId, items)' }, { status: 400 });
    }

    await updateDocOrders(locale, docsLibId, items);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('更新排序失败:', error);
    return NextResponse.json({ error: error.message || '更新排序失败' }, { status: 500 });
  }
}