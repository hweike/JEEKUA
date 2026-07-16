// app/api/admin/litechat/conversations/[id]/read/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { markMessagesAsRead } from '@/lib/litechat/services/message.service';
import { getConversationById } from '@/lib/litechat/services/conversation.service';
import { getCurrentUser } from '@/lib/auth/jwt';
import { supabase } from '@/lib/supabase/client';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

async function verifyAdmin(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: '未登录', status: 401 };
  }

  const { data: admin, error } = await supabase
    .from('admin_users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !admin) {
    return { error: '无权访问，需要管理员权限', status: 403 };
  }

  return { user, admin };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // ✅ params 是 Promise
) {
  try {
    const { id: conversationId } = await params;  // ✅ 异步解包

    // 验证管理员身份
    const auth = await verifyAdmin(request);
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

    // 标记已读
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