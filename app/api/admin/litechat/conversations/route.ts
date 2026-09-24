// app/api/admin/litechat/conversations/route.ts
import { NextResponse } from 'next/server';
import { getAllConversationsForAdmin } from '@/lib/litechat/services/conversation.service';
import { verifyAdminAuth, isAdminAuthSuccess } from '@/lib/auth/admin-check';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function GET() {
  try {
    const auth = await verifyAdminAuth();
    if (!isAdminAuthSuccess(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const conversations = await getAllConversationsForAdmin(DEFAULT_SITE_ID);
    return NextResponse.json(conversations);
  } catch (error: any) {
    console.error('获取会话列表失败:', error);
    return NextResponse.json(
      { error: error.message || '获取会话列表失败' },
      { status: 500 }
    );
  }
}