import { NextResponse } from 'next/server';
import { saveDocument } from '@/lib/docs';   // 修正：saveDocument 而不是 saveDoc

export async function POST(request: Request) {
  try {
    const { locale, docsLibId, data, content } = await request.json();
    if (!locale || !docsLibId || !data) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }
    const savedDoc = await saveDocument(locale, docsLibId, data, content);
    return NextResponse.json({ doc: savedDoc });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}