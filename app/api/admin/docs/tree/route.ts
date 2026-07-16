// app/api/admin/docs/tree/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDocTree } from '@/lib/docs/document'; // 新的基于数据库的树查询


export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const locale = searchParams.get('locale');
  const docsLibId = searchParams.get('docsLibId');
  if (!locale || !docsLibId) {
    return NextResponse.json({ error: '缺少 locale 或 docsLibId' }, { status: 400 });
  }
  try {
    const tree = await getDocTree(locale, docsLibId);
    return NextResponse.json(tree);
  } catch (error) {
    console.error('获取文档树失败:', error);
    return NextResponse.json({ error: '获取文档树失败' }, { status: 500 });
  }
}