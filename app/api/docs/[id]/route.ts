import { NextRequest, NextResponse } from 'next/server';
import { getDocByIdAndSlug } from '@/lib/frontend-docs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const locale = request.nextUrl.searchParams.get('locale') || 'zh';
  // 由于只有 id，我们无法直接获取 slug，但可以从文件系统读取元数据获取 slug
  // 这里简化：调用一个能根据 id 获取文档的函数（需在 frontend-docs.ts 中添加）
  // 建议添加 getDocById(locale, id) 函数
  const doc = getDocById(locale, id); // 需要实现该函数，返回包含 slug 和内容的完整对象
  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }
  return NextResponse.json(doc);
}