// app/api/admin/litechat/conversations/[id]/read/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { markMessagesAsRead } from '@/lib/litechat/services/message.service';
import { getConversationById } from '@/lib/litechat/services/conversation.service';
import { verifyAdminAuth, isAdminAuthSuccess } from '@/lib/auth/admin-check';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function POST(
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

    await markMessagesAsRead(conversationId, DEFAULT_SITE_ID);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('标记已读失败:', error);
    return NextResponse.json(
      { error: error.message || '标记已读失败' },
      { status: 500 }
    );
  }
}