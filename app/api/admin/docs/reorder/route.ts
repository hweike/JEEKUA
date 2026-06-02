import { NextResponse } from 'next/server';
import { reorderDocuments, moveDocument } from '@/lib/docs';

export async function POST(request: Request) {
  try {
    const { locale, docsLibId, items, id, direction } = await request.json();
    if (!locale || !docsLibId) {
      return NextResponse.json({ error: '缺少 locale 或 docsLibId' }, { status: 400 });
    }
    if (items) {
      await reorderDocuments(locale, docsLibId, items);
    } else if (id && direction) {
      await moveDocument(locale, docsLibId, id, direction);
    } else {
      return NextResponse.json({ error: '无效请求' }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}