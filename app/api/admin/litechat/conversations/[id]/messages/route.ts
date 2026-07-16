// app/api/admin/litechat/conversations/[id]/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getMessagesByConversation, sendMessage } from '@/lib/litechat/services/message.service';
import { getConversationById } from '@/lib/litechat/services/conversation.service';
import { getCurrentUser } from '@/lib/auth/jwt';
import { supabase } from '@/lib/supabase/client';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

async function verifyAdminAndGetInfo() {
  const user = await getCurrentUser();
  if (!user) {
    return { error: '未登录', status: 401 };
  }

  const { data: admin, error } = await supabase
    .from('admin_users')
    .select('id, email, name')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('查询管理员失败:', error);
    return { error: '数据库查询失败', status: 500 };
  }

  if (!admin) {
    return { error: '无权访问，需要管理员权限', status: 403 };
  }

  return { admin };
}

// ========== 新增 GET 接口 ==========
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;

    // 验证管理员身份
    const auth = await verifyAdminAndGetInfo();
    if ('error' in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    // 验证会话是否存在
    const conversation = await getConversationById(conversationId, DEFAULT_SITE_ID);
    if (!conversation) {
      return NextResponse.json(
        { error: '会话不存在' },
        { status: 404 }
      );
    }

    // 获取消息
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

// ========== POST 回复接口（保持不变） ==========
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const body = await request.json();
    const { content, contentType, fileUrl } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: '回复内容不能为空' },
        { status: 400 }
      );
    }

    const auth = await verifyAdminAndGetInfo();
    if ('error' in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const admin = auth.admin;

    const conversation = await getConversationById(conversationId, DEFAULT_SITE_ID);
    if (!conversation) {
      return NextResponse.json(
        { error: '会话不存在' },
        { status: 404 }
      );
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