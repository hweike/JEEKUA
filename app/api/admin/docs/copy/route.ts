import { NextRequest, NextResponse } from 'next/server';
import { copyDocument } from '@/lib/docs/document'; // 使用新函数

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sourceLocale, targetLocale, docsLibId, docId } = body;

  if (!sourceLocale || !targetLocale || !docsLibId || !docId) {
    return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
  }
  if (sourceLocale === targetLocale) {
    return NextResponse.json({ error: '源语言和目标语言不能相同' }, { status: 400 });
  }

  try {
    await copyDocument(sourceLocale, targetLocale, docsLibId, docId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('复制文档失败:', error);
    return NextResponse.json({ error: error.message || '复制失败' }, { status: 500 });
  }
}