import { NextResponse } from 'next/server';
import { getDocsTree } from '@/lib/docs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get('locale');
  const docsLibId = searchParams.get('docsLibId');
  if (!locale || !docsLibId) {
    return NextResponse.json({ error: '缺少 locale 或 docsLibId' }, { status: 400 });
  }
  const tree = await getDocsTree(locale, docsLibId);
  return NextResponse.json(tree);
}