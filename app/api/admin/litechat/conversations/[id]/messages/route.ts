// app/api/admin/litechat/conversations/[id]/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getMessagesByConversation, sendMessage } from '@/lib/litechat/services/message.service';
import { getConversationById } from '@/lib/litechat/services/conversation.service';
import { verifyAdminAuth, isAdminAuthSuccess } from '@/lib/auth/admin-check';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;

    const auth = await verifyAdminAuth();
    if (!isAdminAuthSuccess(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const conversation = await getConversationById(conversationId, DEFAULT_SITE_ID);
    if (!conversation) {
      return NextResponse.json({ error: '会话不存在' }, { status: 404 });
    }

    const messages = await getMessagesByConversation(conversationId, DEFAULT_SITE_ID);
    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error('获取消息失败:', error);
    return NextResponse.json(
      { error: error.message || '获取消息失败' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const body = await request.json();
    const { content, contentType, fileUrl } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: '回复内容不能为空' }, { status: 400 });
    }

    const auth = await verifyAdminAuth();
    if (!isAdminAuthSuccess(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const admin = auth.admin;

    const conversation = await getConversationById(conversationId, DEFAULT_SITE_ID);
    if (!conversation) {
      return NextResponse.json({ error: '会话不存在' }, { status: 404 });
    }

    const message = await sendMessage(
      conversationId,
      content.trim(),
      'agent',
      admin.id,
      admin.email,
      admin.name || '管理员',
      contentType || 'text',
      fileUrl,
      DEFAULT_SITE_ID
    );

    return NextResponse.json(message);
  } catch (error: any) {
    console.error('回复失败:', error);
    return NextResponse.json(
      { error: error.message || '回复失败，请稍后重试' },
      { status: 500 }
    );
  }
}