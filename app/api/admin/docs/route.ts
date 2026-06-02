import { NextResponse } from 'next/server';
import { getDocument, deleteDocument } from '@/lib/docs';
import { deleteResourceAssociations } from '@/lib/products/resourceRelations';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get('locale');
  const docsLibId = searchParams.get('docsLibId');
  const id = searchParams.get('id');
  if (!locale || !docsLibId || !id) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 });
  }
  const doc = await getDocument(locale, docsLibId, id);
  if (!doc) return NextResponse.json({ error: '文档不存在' }, { status: 404 });
  return NextResponse.json(doc);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get('locale');
  const docsLibId = searchParams.get('docsLibId');
  const id = searchParams.get('id');
  if (!locale || !docsLibId || !id) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 });
  }
  
  // 1. 删除文档本身
  await deleteDocument(locale, docsLibId, id);
  
  // 2. 删除该文档与产品的所有关联关系
  await deleteResourceAssociations('document', id);
  
  return NextResponse.json({ success: true });
}