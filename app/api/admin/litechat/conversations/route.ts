// app/api/admin/litechat/conversations/route.ts
import { NextResponse } from 'next/server';
import { getAllConversationsForAdmin } from '@/lib/litechat/services/conversation.service';
import { getCurrentUser } from '@/lib/auth/jwt';
import { supabase } from '@/lib/supabase/client';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

// 验证管理员身份
async function verifyAdmin(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: '未登录', status: 401 };
  }

  // 验证是否为管理员（查询 admin_users 表）
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

export async function GET(request: Request) {
  try {
    // 验证管理员身份
    const auth = await verifyAdmin(request);
    if ('error' in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    // 获取所有会话
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