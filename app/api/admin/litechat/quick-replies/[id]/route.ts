// app/api/admin/litechat/quick-replies/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { updateQuickReply, deleteQuickReply } from '@/lib/litechat/services/quick-reply.service';
import { verifyAdminAuth, isAdminAuthSuccess } from '@/lib/auth/admin-check';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth();
  if (!isAdminAuthSuccess(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const { title, content } = await request.json();

  if (!title || !title.trim()) {
    return NextResponse.json({ error: '标题不能为空' }, { status: 400 });
  }
  if (!content || !content.trim()) {
    return NextResponse.json({ error: '内容不能为空' }, { status: 400 });
  }

  try {
    const reply = await updateQuickReply(
      id,
      title.trim(),
      content.trim(),
      auth.admin.id,
      DEFAULT_SITE_ID
    );
    return NextResponse.json(reply);
  } catch (error: any) {
    console.error('更新常用语失败:', error);
    if (error.message === '无权编辑此常用回复语') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.message === '常用回复语不存在') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth();
  if (!isAdminAuthSuccess(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  try {
    await deleteQuickReply(id, auth.admin.id, DEFAULT_SITE_ID);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('删除常用语失败:', error);
    if (error.message === '无权删除此常用回复语') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.message === '常用回复语不存在') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}