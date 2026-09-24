// app/api/admin/litechat/quick-replies/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getQuickReplies, createQuickReply } from '@/lib/litechat/services/quick-reply.service';
import { verifyAdminAuth, isAdminAuthSuccess } from '@/lib/auth/admin-check';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function GET() {
  const auth = await verifyAdminAuth();
  if (!isAdminAuthSuccess(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const replies = await getQuickReplies(auth.admin.id, DEFAULT_SITE_ID);
    return NextResponse.json(replies);
  } catch (error) {
    console.error('获取常用语列表失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth();
  if (!isAdminAuthSuccess(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { title, content } = await request.json();

  if (!title || !title.trim()) {
    return NextResponse.json({ error: '标题不能为空' }, { status: 400 });
  }
  if (!content || !content.trim()) {
    return NextResponse.json({ error: '内容不能为空' }, { status: 400 });
  }

  try {
    const reply = await createQuickReply(
      title.trim(),
      content.trim(),
      auth.admin.id,
      DEFAULT_SITE_ID
    );
    return NextResponse.json(reply);
  } catch (error) {
    console.error('创建常用语失败:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}