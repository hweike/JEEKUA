// app/api/admin/docs/reorder-all/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { syncDocOrdersAllLocales } from '@/lib/docs/document';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { docsLibId, items } = body;
  if (!docsLibId || !items || !Array.isArray(items)) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }
  try {
    await syncDocOrdersAllLocales(docsLibId, items);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('跨语言同步排序失败:', error);
    return NextResponse.json(
      { error: error.message || '同步失败', details: error.stack },
      { status: 500 }
    );
  }
}