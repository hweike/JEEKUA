// app/api/admin/docs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDocsByLib, getDocument, deleteDocument, getDocTree } from '@/lib/docs/document';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const locale = searchParams.get('locale');
  const docsLibId = searchParams.get('docsLibId');
  const id = searchParams.get('id');
  const localesParam = searchParams.get('locales');

  if (!docsLibId) {
    return NextResponse.json({ error: 'Missing docsLibId' }, { status: 400 });
  }

  // 批量获取
  if (localesParam) {
    const locales = localesParam.split(',').filter(Boolean);
    if (locales.length === 0) {
      return NextResponse.json({ error: 'No valid locales' }, { status: 400 });
    }
    try {
      const result: Record<string, any[]> = {};
      await Promise.all(locales.map(async (loc) => {
        result[loc] = await getDocsByLib(loc, docsLibId);
      }));
      return NextResponse.json(result);
    } catch (error) {
      console.error('批量查询文档失败:', error);
      return NextResponse.json({ error: '批量查询失败' }, { status: 500 });
    }
  }

  // 单篇文档查询
  if (id) {
    if (!locale) {
      return NextResponse.json({ error: 'Missing locale' }, { status: 400 });
    }
    try {
      const doc = await getDocument(locale, docsLibId, id);
      if (!doc) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
      return NextResponse.json(doc);
    } catch (error) {
      console.error('获取文档失败:', error);
      return NextResponse.json({ error: '获取文档失败' }, { status: 500 });
    }
  }

  // 列表查询（单语言）
  if (!locale) {
    return NextResponse.json({ error: 'Missing locale for list' }, { status: 400 });
  }
  try {
    const docs = await getDocsByLib(locale, docsLibId);
    return NextResponse.json(docs);
  } catch (error) {
    console.error('获取文档列表失败:', error);
    return NextResponse.json({ error: '获取文档列表失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale');
  const docsLibId = searchParams.get('docsLibId');
  const id = searchParams.get('id');
  if (!locale || !docsLibId || !id) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 });
  }

  try {
    await deleteDocument(locale, docsLibId, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('删除文档失败:', error);
    return NextResponse.json({ error: error.message || '删除文档失败' }, { status: 500 });
  }
}