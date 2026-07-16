// app/api/litechat/conversations/[id]/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getMessagesByConversation, getMessagesWithPagination, sendMessage } from '@/lib/litechat/services/message.service';
import { getConversationById } from '@/lib/litechat/services/conversation.service';
import { getCustomerById } from '@/lib/litechat/services/customer.service';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';
const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 100;

// ============================================================
// GET：获取会话消息列表（支持分页）
// ============================================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('[API] GET /api/litechat/conversations/[id]/messages 开始');
  try {
    const { id: conversationId } = await params;
    console.log('[API] conversationId:', conversationId);

    // 验证会话是否存在
    const conversation = await getConversationById(conversationId, DEFAULT_SITE_ID);
    if (!conversation) {
      console.log('[API] 会话不存在');
      return NextResponse.json(
        { error: '会话不存在' },
        { status: 404 }
      );
    }

    // 解析分页参数
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(
      parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10),
      MAX_PAGE_SIZE
    );
    const before = searchParams.get('before') || undefined;
    const after = searchParams.get('after') || undefined;

    // 如果没有分页参数，返回全部消息（兼容旧版本）
    if (!before && !after) {
      const messages = await getMessagesByConversation(conversationId, DEFAULT_SITE_ID);
      console.log('[API] 获取到消息数:', messages.length);
      return NextResponse.json({ messages, hasMore: false });
    }

    // 使用分页查询
    const result = await getMessagesWithPagination(
      conversationId,
      { limit, before, after },
      DEFAULT_SITE_ID
    );

    console.log('[API] 获取到消息数:', result.messages.length, '是否有更多:', result.hasMore);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API] 获取消息失败:', error);
    return NextResponse.json(
      { error: error.message || '获取消息失败' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST：发送消息（访客）
// ============================================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('[API] POST /api/litechat/conversations/[id]/messages 开始');
  try {
    const { id: conversationId } = await params;
    const body = await request.json();
    // ✅ 增加 contentType 和 fileUrl
    const { content, email, name, contentType, fileUrl } = body;

    // 参数验证
    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: '消息内容不能为空' },
        { status: 400 }
      );
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: '请提供有效的邮箱地址' },
        { status: 400 }
      );
    }

    const conversation = await getConversationById(conversationId, DEFAULT_SITE_ID);
    if (!conversation) {
      return NextResponse.json(
        { error: '会话不存在' },
        { status: 404 }
      );
    }

    const customer = await getCustomerById(conversation.customer_id);
    if (!customer) {
      return NextResponse.json(
        { error: '客户信息不存在' },
        { status: 404 }
      );
    }

    // ✅ 传递 contentType 和 fileUrl
    const message = await sendMessage(
      conversationId,
      content.trim(),
      'visitor',
      customer.id,
      customer.email,
      customer.name || '访客',
      contentType || 'text',   // 默认为 text
      fileUrl,                 // 图片消息时传递
      DEFAULT_SITE_ID
    );

    return NextResponse.json(message);
  } catch (error: any) {
    console.error('[API] 发送消息失败:', error);
    return NextResponse.json(
      { error: error.message || '发送消息失败' },
      { status: 500 }
    );
  }
}